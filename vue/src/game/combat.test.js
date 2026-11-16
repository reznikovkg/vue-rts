import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceBattle } from './combat.js'
import { BUILDING_TYPES, createBuilding, createUnit, entityAtPoint, UNIT_TYPES } from './entities.js'

const attack = (attacker, defender) => {
  attacker.attackTargetId = defender.id
  return [attacker, defender]
}

test('сущности получают HP и характеристики из настроек типа', () => {
  const unit = createUnit('slow', 0, 0)
  const building = createBuilding('house', 2, 2)
  assert.equal(unit.hp, UNIT_TYPES.slow.maxHp)
  assert.equal(building.hp, BUILDING_TYPES.house.maxHp)
  assert.ok(UNIT_TYPES.slow.attack > 0)
  assert.ok(UNIT_TYPES.slow.speed > 0)
  assert.ok(UNIT_TYPES.slow.attackSpeed > 0)
})

test('атака наносит урон раз в интервал и не наносит непрерывный урон каждый кадр', () => {
  const unit = createUnit('slow', 0, 0)
  const enemy = createUnit('slow', 1.2, 0, 'group2')
  let entities = attack(unit, enemy)
  entities = advanceBattle(entities, 0.02)
  assert.equal(enemy.hp, 120 - 18)
  for (let i = 0; i < 30; i++) entities = advanceBattle(entities, 0.02)
  assert.equal(enemy.hp, 102)
  for (let i = 0; i < 21; i++) entities = advanceBattle(entities, 0.02)
  assert.equal(enemy.hp, 84)
})

test('быстрый юнит атакует с частотой 2 удара в секунду', () => {
  const unit = createUnit('fast', 0, 0)
  const enemy = createBuilding('castle', 1.5, 0, 'group2')
  let entities = attack(unit, enemy)
  entities = advanceBattle(entities, 0.01)
  assert.equal(enemy.hp, 400 - 11)
  for (let i = 0; i < 40; i++) entities = advanceBattle(entities, 0.01)
  assert.equal(enemy.hp, 389)
  for (let i = 0; i < 11; i++) entities = advanceBattle(entities, 0.01)
  assert.equal(enemy.hp, 378)
})

test('юнит приближается к врагу и прекращает движение при достижении дистанции атаки', () => {
  const unit = createUnit('fast', -8, 0)
  const building = createBuilding('house', 0, 0, 'group2')
  let entities = attack(unit, building)
  for (let i = 0; i < 500; i++) entities = advanceBattle(entities, 0.02)
  assert.ok(unit.x > -8)
  assert.ok(unit.x < -1)
  assert.ok(building.hp < BUILDING_TYPES.house.maxHp)
})

test('свой объект не атакуется; уничтоженный исчезает и выделение цели сбрасывается', () => {
  const ally = createUnit('fast', 0, 0)
  const anotherAlly = createUnit('slow', 1, 0)
  ally.attackTargetId = anotherAlly.id
  advanceBattle([ally, anotherAlly], 0.1)
  assert.equal(anotherAlly.hp, 120)
  assert.equal(ally.attackTargetId, null)

  const victim = createUnit('slow', 0.8, 0, 'group2')
  victim.hp = 5
  ally.attackTargetId = victim.id
  const survivors = advanceBattle([ally, victim], 0.02)
  assert.deepEqual(survivors, [ally])
  assert.equal(ally.attackTargetId, null)
})

test('обе команды перемещаются с заданной скоростью', () => {
  const blue = createUnit('slow', 0, 0)
  const red = createUnit('fast', 0, 2, 'group2')
  blue.target = { x: 10, y: 0 }
  red.target = { x: 10, y: 2 }

  advanceBattle([blue, red], 1)
  assert.equal(blue.x, UNIT_TYPES.slow.speed)
  assert.equal(red.x, UNIT_TYPES.fast.speed)
  assert.equal(blue.hp, UNIT_TYPES.slow.maxHp)
  assert.equal(red.hp, UNIT_TYPES.fast.maxHp)
})

test('красный юнит атакует синего персонажа с заданной силой и частотой', () => {
  const blue = createUnit('slow', 0, 0)
  const red = createUnit('fast', 1, 0, 'group2')
  let entities = attack(red, blue)

  entities = advanceBattle(entities, 0.01)
  assert.equal(blue.hp, 120 - 11)
  for (let i = 0; i < 40; i++) entities = advanceBattle(entities, 0.01)
  assert.equal(blue.hp, 109)
  for (let i = 0; i < 11; i++) entities = advanceBattle(entities, 0.01)
  assert.equal(blue.hp, 98)
})

test('красный юнит подходит к синему зданию и разрушает его', () => {
  const red = createUnit('fast', -10, 0, 'group2')
  const blueHouse = createBuilding('house', 0, 0)
  let entities = attack(red, blueHouse)

  for (let i = 0; i < 1000; i++) entities = advanceBattle(entities, 0.02)
  assert.ok(red.x > -10)
  assert.equal(blueHouse.hp, 0)
  assert.deepEqual(entities, [red])
})

test('ни красные, ни синие не могут атаковать своих персонажей и здания', () => {
  for (const team of ['group1', 'group2']) {
    const attacker = createUnit('fast', 0, 0, team)
    const ally = createUnit('slow', 1, 0, team)
    const house = createBuilding('house', 1.5, 0, team)

    attacker.attackTargetId = ally.id
    advanceBattle([attacker, ally, house], 0.1)
    assert.equal(ally.hp, UNIT_TYPES.slow.maxHp)
    assert.equal(attacker.attackTargetId, null)

    attacker.attackTargetId = house.id
    advanceBattle([attacker, ally, house], 0.1)
    assert.equal(house.hp, BUILDING_TYPES.house.maxHp)
    assert.equal(attacker.attackTargetId, null)
  }
})

test('обе команды могут одновременно получать урон друг от друга', () => {
  const blue = createUnit('slow', 0, 0)
  const red = createUnit('slow', 1.2, 0, 'group2')
  blue.attackTargetId = red.id
  red.attackTargetId = blue.id

  advanceBattle([blue, red], 0.02)
  assert.equal(blue.hp, UNIT_TYPES.slow.maxHp - UNIT_TYPES.slow.attack)
  assert.equal(red.hp, UNIT_TYPES.slow.maxHp - UNIT_TYPES.slow.attack)
})


test('первый правый клик рядом с небольшой фигурой распознает цель', () => {
  const red = createUnit('fast', 0, 0, 'group2')
  const blue = createUnit('slow', 3, 0)
  // Точка чуть за краем круга (радиус 0.4), но в допуске клика.
  assert.equal(entityAtPoint([red, blue], { x: 3.6, y: 0 }), blue)
  // Попадание по зданию работает независимо от команды.
  const house = createBuilding('house', 7, 0)
  assert.equal(entityAtPoint([red, blue, house], { x: 8.25, y: 0 }), house)
  assert.equal(entityAtPoint([red, blue, house], { x: 12, y: 0 }), null)
})

test('полученный с первого клика приказ немедленно наносит урон на дистанции атаки', () => {
  const blue = createUnit('slow', 0, 0)
  const red = createUnit('slow', 1.2, 0, 'group2')
  const clicked = entityAtPoint([blue, red], { x: 1.65, y: 0 })
  assert.equal(clicked, red)
  blue.attackTargetId = clicked.id
  advanceBattle([blue, red], 0.02)
  assert.equal(red.hp, UNIT_TYPES.slow.maxHp - UNIT_TYPES.slow.attack)
})

test('юнит бьет противника в том же кадре, когда доходит до дистанции атаки', () => {
  const blue = createUnit('slow', 0, 0)
  const red = createUnit('slow', 1.55, 0, 'group2')
  blue.attackTargetId = red.id
  advanceBattle([blue, red], 0.1)
  assert.equal(red.hp, UNIT_TYPES.slow.maxHp - UNIT_TYPES.slow.attack)
})
