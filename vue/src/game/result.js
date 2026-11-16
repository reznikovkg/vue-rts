// Учитываем ВСЕ живые объекты: группа с одним уцелевшим домом ещё не проиграла.
export const remainingGroups = (entities) => [...new Set(entities.filter((entity) => entity.hp > 0).map((entity) => entity.groupId))]

export const getGameResult = (entities) => {
  const survivors = remainingGroups(entities)
  if (survivors.length > 1) return { finished: false, winnerGroupId: null }
  return { finished: true, winnerGroupId: survivors[0] ?? null }
}
