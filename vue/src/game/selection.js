// множественное выделение: рамка на экране и строй, в который встает группа
import { isBuilding, isUnit, UNIT_TYPES } from './entities.js'
import { canUseUnitTerrain, isClearOfEntity } from './placement.js'

// рамка меньше этого (в пикселях) - это не рамка, а просто клик
const CLICK_SIZE = 4

// расстояние между соседями в строю: оставляем проход для остальных персонажей
const SPACING = 2

// прямоугольник по двум углам, в любом порядке
export const toRect = (a, b) => ({
  minX: Math.min(a.x, b.x),
  maxX: Math.max(a.x, b.x),
  minY: Math.min(a.y, b.y),
  maxY: Math.max(a.y, b.y),
})

export const isClick = (rect) => rect.maxX - rect.minX < CLICK_SIZE && rect.maxY - rect.minY < CLICK_SIZE

export const insideRect = (rect, p) => p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY

// shift + клик: был выбран - убираем, не был - добавляем
export const toggleId = (ids, id) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id])

// точка не в здании (с запасом на радиус персонажа)
const isFreeOfBuildings = (entities, p, radius, unitType) =>
  entities.filter(isBuilding).every((b) => isClearOfEntity(p, radius, b, unitType))

// где персонаж будет стоять: идущий - в конце пути, стоящий - там, где он сейчас
const restPoint = (unit) => unit.path[unit.path.length - 1] ?? unit.target ?? unit

// место не занято чужими персонажами (не из группы groupIds), ни сейчас, ни когда они дойдут
const isFreeOfUnits = (entities, p, radius, groupIds) =>
  entities
    .filter((e) => isUnit(e) && !groupIds.includes(e.id))
    .every((u) => {
      const rest = restPoint(u)
      const distance = radius + UNIT_TYPES[u.type].size / 2
      return Math.hypot(p.x - u.x, p.y - u.y) >= distance && Math.hypot(p.x - rest.x, p.y - rest.y) >= distance
    })

// count мест вокруг цели: кольцами квадратов, ближние первыми
// места в зданиях, за картой и занятые чужими персонажами пропускаем; groupIds - кто встает в строй
export const formationSlots = (map, entities, target, count, radius, groupIds = [], terrain, ship = false) => {
  const slots = []
  const unitType = { size: radius * 2, terrain, ship }
  const spacing = Math.max(SPACING, radius * 4)
  for (let ring = 0; slots.length < count && ring <= count; ring++) {
    const ringSlots = []
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) === ring) {
          ringSlots.push({ x: target.x + i * spacing, y: target.y + j * spacing })
        }
      }
    }
    ringSlots
      .filter(
        (p) => canUseUnitTerrain(map, entities, unitType, p) && isFreeOfBuildings(entities, p, radius, unitType) && isFreeOfUnits(entities, p, radius, groupIds),
      )
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))
      .forEach((p) => slots.push(p))
  }
  return slots.slice(0, count)
}

// сколько раз пробуем улучшить раздачу мест обменами (обычно хватает пары проходов)
const MAX_SWAP_PASSES = 50

const centerOf = (points) => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
})

const spreadOf = (points, center) => Math.max(...points.map((p) => Math.hypot(p.x - center.x, p.y - center.y)))

// отрезки ab и cd пересекаются (касание концами не считаем)
const side = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
const crosses = (a, b, c, d) => side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0

// раздаем места так, чтобы группа сохранила форму: кто шел слева - встанет слева, кто сзади - сзади
// 1. переносим фигуру группы в цель, сжав ее до размера строя - это желаемая точка каждого персонажа
// 2. каждому месту (от центра строя) - персонаж, чья желаемая точка ближе
// 3. меняем двоих местами, пока это приближает их к желаемым точкам
// 4. если пути двоих все же пересекаются - меняем их местами (сумма путей от этого всегда короче, так что это закончится)
// возвращает пары { unit, point }; мест не хватило - point null, персонаж остается на месте
export const assignSlots = (units, slots, target) => {
  const center = centerOf(units)
  const unitSpread = spreadOf(units, center)
  const slotSpread = slots.length ? spreadOf(slots, target) : 0
  const scale = unitSpread > 0 ? Math.min(1, slotSpread / unitSpread) : 0
  const wanted = units.map((u) => ({
    x: target.x + (u.x - center.x) * scale,
    y: target.y + (u.y - center.y) * scale,
  }))

  const cost = (i, point) => (wanted[i].x - point.x) ** 2 + (wanted[i].y - point.y) ** 2

  // шаг 2: points[i] - место персонажа units[i]
  const points = units.map(() => null)
  const free = units.map((_, i) => i)
  slots.forEach((slot) => {
    const best = free.reduce((a, b) => (cost(b, slot) < cost(a, slot) ? b : a))
    free.splice(free.indexOf(best), 1)
    points[best] = slot
  })

  // шаги 3 и 4: проходим по всем парам и меняем, пока есть что улучшить
  const swapWhile = (shouldSwap) => {
    for (let pass = 0, improved = true; improved && pass < MAX_SWAP_PASSES; pass++) {
      improved = false
      for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
          if (points[i] && points[j] && shouldSwap(i, j)) {
            ;[points[i], points[j]] = [points[j], points[i]]
            improved = true
          }
        }
      }
    }
  }
  swapWhile((i, j) => cost(i, points[j]) + cost(j, points[i]) < cost(i, points[i]) + cost(j, points[j]) - 1e-9)
  swapWhile((i, j) => crosses(units[i], points[i], units[j], points[j]))

  return units.map((unit, i) => ({ unit, point: points[i] }))
}
