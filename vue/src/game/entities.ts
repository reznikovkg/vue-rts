export type EntityType = 'unit' | 'building'

export type Entity = {
  id: number
  type: EntityType
  name: string
  x: number
  y: number
  size: number
  speed: number
  color: string
}

export const createEntities = (): Entity[] => [
  { id: 1, type: 'unit', name: 'Разведчик', x: -180, y: 80, size: 34, speed: 150, color: '#315f9b' },
  { id: 2, type: 'unit', name: 'Копейщик', x: 40, y: -120, size: 38, speed: 100, color: '#9a4937' },
  { id: 3, type: 'building', name: 'Ратуша', x: 230, y: 150, size: 110, speed: 0, color: '#8a714a' },
]
