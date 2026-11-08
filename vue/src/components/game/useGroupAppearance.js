export const getGroupColor = (groupId) =>
  groupId === 1
    ? '#4f7cff'
    : groupId === 2
      ? '#ff5b54'
      : '#f2c94c'

export const getGroupStyle = (groupId) => ({
  '--group-color': getGroupColor(groupId),
})

export const getEntityAttributes = (type, id, title) => ({
  'data-entity-type': type,
  'data-entity-id': String(id),
  title,
})

export function getGroupColor(groupId) {
  return groupId === 1
    ? '#4f7cff'
    : groupId === 2
      ? '#ff5b54'
      : '#f2c94c'
}
