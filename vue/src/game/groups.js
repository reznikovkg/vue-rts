// Группы независимы: любая группа может атаковать любую другую.
// группа - это клан: название по тотему, после восьмого тотемы идут по второму кругу с номером
const TOTEMS = ['Ворона', 'Волка', 'Рыси', 'Совы', 'Медведя', 'Лиса', 'Вепря', 'Змея']

// яркие цвета, чтобы кланы было видно на темной карте
const PALETTE = ['#e0565b', '#f0b445', '#e6edf3', '#4fd1c5', '#b48cff', '#a6e05a', '#ff8a3d', '#ff7eb6']

export const createGroup = (index) => {
  // Индекс начинается с 1; новые группы не требуют изменения логики игры.
  const totem = TOTEMS[(index - 1) % TOTEMS.length]
  const round = Math.ceil(index / TOTEMS.length)
  return {
    id: `group${index}`,
    name: `Клан ${totem}${round > 1 ? ` ${round}` : ''}`,
    color: PALETTE[index - 1] ?? `hsl(${(index * 137.508) % 360} 70% 66%)`,
  }
}

export const createGroups = (count) => Array.from({ length: count }, (_, index) => createGroup(index + 1))

// у всех объектов клана один цвет: персонажей и здания отличает форма
export const colorOf = (group) => group?.color ?? '#999999'
