export const DEFAULT_GROUP = 1

export const AVAILABLE_GROUPS = [1, 2, 3]

export const GROUP_COLORS = {
  1: '#c9a227',
  2: '#3d7ea6',
  3: '#a63d5c',
}

export function getGroupColor(group) {
  return GROUP_COLORS[group] ?? GROUP_COLORS[DEFAULT_GROUP]
}
