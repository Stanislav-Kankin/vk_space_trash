import type { Room, UpgradeDefinition } from './types'

export const START_ROOM_ID = '4:2'

export const createRooms = (): Room[] => [
  { id: '0:1', x: 1, y: 0, kind: 'storage', visited: false, resolved: false },
  { id: '0:2', x: 2, y: 0, kind: 'hazard', visited: false, resolved: false },
  { id: '1:0', x: 0, y: 1, kind: 'empty', visited: false, resolved: false },
  { id: '1:1', x: 1, y: 1, kind: 'enemy', visited: false, resolved: false },
  { id: '1:2', x: 2, y: 1, kind: 'storage', visited: false, resolved: false },
  { id: '1:3', x: 3, y: 1, kind: 'repair', visited: false, resolved: false },
  { id: '2:0', x: 0, y: 2, kind: 'hazard', visited: false, resolved: false },
  { id: '2:1', x: 1, y: 2, kind: 'storage', visited: false, resolved: false },
  { id: '2:2', x: 2, y: 2, kind: 'empty', visited: false, resolved: false },
  { id: '2:3', x: 3, y: 2, kind: 'enemy', visited: false, resolved: false },
  { id: '2:4', x: 4, y: 2, kind: 'storage', visited: false, resolved: false },
  { id: '3:0', x: 0, y: 3, kind: 'repair', visited: false, resolved: false },
  { id: '3:1', x: 1, y: 3, kind: 'empty', visited: false, resolved: false },
  { id: '3:2', x: 2, y: 3, kind: 'hazard', visited: false, resolved: false },
  { id: '3:3', x: 3, y: 3, kind: 'storage', visited: false, resolved: false },
  { id: '3:4', x: 4, y: 3, kind: 'empty', visited: false, resolved: false },
  { id: '4:1', x: 1, y: 4, kind: 'storage', visited: false, resolved: false },
  { id: START_ROOM_ID, x: 2, y: 4, kind: 'start', visited: true, resolved: true },
  { id: '4:3', x: 3, y: 4, kind: 'empty', visited: false, resolved: false },
]

export const upgrades: readonly UpgradeDefinition[] = [
  {
    key: 'hull',
    name: 'Усиленный корпус',
    description: '+2 к прочности в каждой экспедиции',
    prices: [12, 24, 40],
  },
  {
    key: 'battery',
    name: 'Резервная батарея',
    description: '+2 к запасу энергии',
    prices: [10, 22, 36],
  },
  {
    key: 'scanner',
    name: 'Сканер отсеков',
    description: 'Показывает класс соседнего отсека',
    prices: [14, 28, 44],
  },
]

export const roomCopy = {
  storage: {
    eyebrow: 'Сигнатура: груз',
    title: 'Герметичный склад',
    body: 'Контейнер зажат аварийными створками. Резак справится, но батарея просядет.',
  },
  hazard: {
    eyebrow: 'Опасность: разгерметизация',
    title: 'Рваная переборка',
    body: 'За пробоиной виден сервисный ящик. Можно протиснуться через острые края.',
  },
  repair: {
    eyebrow: 'Система: доступна',
    title: 'Ремонтный модуль',
    body: 'Старая станция ещё держит давление. Наноблоки примут лом в обмен на ремонт.',
  },
} as const
