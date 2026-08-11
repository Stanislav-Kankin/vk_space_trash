import type {
  Room,
  RoomKind,
  SalvageDefinition,
  ShipDefinition,
  ShipId,
  ShipProgress,
  ToolDefinition,
  ToolKey,
  UpgradeDefinition,
} from './types'

export const FIRST_SHIP_ID = 'transport-7-alpha' as const
export const SECOND_SHIP_ID = 'hephaestus-9' as const
export const START_ROOM_ID = '4:2'
export const SECOND_START_ROOM_ID = '5:3'

export const ships: Record<ShipId, ShipDefinition> = {
  [FIRST_SHIP_ID]: {
    id: FIRST_SHIP_ID,
    name: 'Транспорт 7-Альфа',
    objectLabel: 'ОБЪЕКТ 7-АЛЬФА',
    subtitle: 'Заброшенный транспорт',
    description: 'Реактор заглушен. Шлюз К-17 удерживает стабильный канал.',
    deckLabel: 'ПАЛУБА 03',
    gridSize: 5,
    startRoomId: START_ROOM_ID,
    completionReward: 50,
  },
  [SECOND_SHIP_ID]: {
    id: SECOND_SHIP_ID,
    name: 'Гефест-9',
    objectLabel: 'ОБЪЕКТ ГЕФЕСТ-9',
    subtitle: 'Промышленный переработчик',
    description: 'Плавильный комплекс обесточен. Внутри сохранились грузовые линии и сплавленный техномусор.',
    deckLabel: 'ПРОМПАЛУБА 06',
    gridSize: 6,
    startRoomId: SECOND_START_ROOM_ID,
    completionReward: 0,
  },
}

type RoomBlueprint = Omit<Room, 'visited' | 'resolved'>

const transportBlueprint: RoomBlueprint[] = [
  { id: '0:1', x: 1, y: 0, kind: 'storage' },
  { id: '0:2', x: 2, y: 0, kind: 'hazard' },
  { id: '1:0', x: 0, y: 1, kind: 'empty' },
  { id: '1:1', x: 1, y: 1, kind: 'enemy' },
  { id: '1:2', x: 2, y: 1, kind: 'storage' },
  { id: '1:3', x: 3, y: 1, kind: 'repair' },
  { id: '2:0', x: 0, y: 2, kind: 'hazard' },
  { id: '2:1', x: 1, y: 2, kind: 'storage' },
  { id: '2:2', x: 2, y: 2, kind: 'empty' },
  { id: '2:3', x: 3, y: 2, kind: 'enemy' },
  { id: '2:4', x: 4, y: 2, kind: 'storage' },
  { id: '3:0', x: 0, y: 3, kind: 'repair' },
  { id: '3:1', x: 1, y: 3, kind: 'empty' },
  { id: '3:2', x: 2, y: 3, kind: 'hazard' },
  { id: '3:3', x: 3, y: 3, kind: 'storage' },
  {
    id: '3:4',
    x: 4,
    y: 3,
    kind: 'puzzle',
    title: 'Сортировочная матрица',
    eyebrow: 'СИСТЕМА: РУЧНОЙ КОНТУР',
    description: 'Аварийный пульт удерживает кассету с ценными компонентами. Матрицу можно собрать вручную.',
  },
  { id: '4:1', x: 1, y: 4, kind: 'storage' },
  { id: START_ROOM_ID, x: 2, y: 4, kind: 'start' },
  { id: '4:3', x: 3, y: 4, kind: 'empty' },
]

const hephaestusKinds: RoomKind[][] = [
  ['storage', 'trap', 'empty', 'cargo', 'enemy', 'terminal'],
  ['door', 'storage', 'repair', 'cargo', 'power', 'hazard'],
  ['vacuum', 'empty', 'enemy', 'debris', 'storage', 'power'],
  ['debris', 'power', 'empty', 'repair', 'cargo', 'enemy'],
  ['empty', 'storage', 'vacuum', 'terminal', 'debris', 'hazard'],
  ['power', 'empty', 'cargo', 'start', 'storage', 'trap'],
]

const hephaestusTitles = [
  ['Приёмный склад', 'Захват пресса', 'Весовой коридор', 'Магнитная подвеска', 'Пост охраны', 'Архив поставок'],
  ['Заклинившие ворота', 'Контейнерный ряд', 'Сервисная рама', 'Крановая шахта', 'Силовая гребёнка', 'Рваный конвейер'],
  ['Вакуумный карман', 'Переход дробилки', 'Дрон-сортировщик', 'Спёкшийся завал', 'Бункер сырья', 'Привод дробилки'],
  ['Шлаковый канал', 'Термоконтур', 'Галерея печи', 'Ремонтный пост', 'Подвесной ковш', 'Охранный узел'],
  ['Холодная магистраль', 'Резервный склад', 'Криогенный тайник', 'Журнал аварий', 'Остывший техномусор', 'Разрыв коллектора'],
  ['Распределитель', 'Командный переход', 'Подвесной груз', 'Стыковочный шлюз', 'Склад смены', 'Дуговой капкан'],
] as const

const zoneCopy = [
  ['ПРИЁМНЫЙ СЕКТОР', 'Грузовые линии замерли посреди последней смены.'],
  ['СОРТИРОВОЧНЫЙ УЗЕЛ', 'Конвейеры и крановые пути ведут к центральной дробилке.'],
  ['ПЕРЕРАБОТКА', 'Здесь корпус вибрировал от дробилок и магнитных сепараторов.'],
  ['ПЛАВИЛЬНЫЙ ЦЕХ', 'Жар спрессовал обломки в плотные пласты ценного техномусора.'],
  ['КОНТУР ОХЛАЖДЕНИЯ', 'Иней и пар скрывают повреждённые магистрали.'],
  ['УПРАВЛЕНИЕ И ШЛЮЗ', 'Силовые шкафы ещё держат остаточный заряд.'],
] as const

const hephaestusBlueprint: RoomBlueprint[] = hephaestusKinds.flatMap((row, y) => row.map((kind, x) => {
  const trap = y === 0 && x === 1
    ? { name: 'Захват гидравлического пресса', difficulty: 14, effect: 'hull' as const, damage: 3 }
    : y === 5 && x === 5
      ? { name: 'Дуговой капкан', difficulty: 22, effect: 'energy' as const, damage: 4 }
      : undefined
  return {
    id: `${y}:${x}`,
    x,
    y,
    kind,
    title: hephaestusTitles[y][x],
    eyebrow: zoneCopy[y][0],
    description: trap ? `${trap.name}. Сенсоры отмечают нестабильный контур.` : zoneCopy[y][1],
    trap,
  }
}))

const blueprints: Record<ShipId, RoomBlueprint[]> = {
  [FIRST_SHIP_ID]: transportBlueprint,
  [SECOND_SHIP_ID]: hephaestusBlueprint,
}

export const SHIP_ROOM_COUNT = transportBlueprint.length
export const SECOND_SHIP_ROOM_COUNT = hephaestusBlueprint.length

export const getShip = (shipId: ShipId) => ships[shipId]
export const getShipRoomCount = (shipId: ShipId) => blueprints[shipId].length

export const createRooms = (shipId: ShipId, progress?: ShipProgress): Room[] => {
  const startRoomId = ships[shipId].startRoomId
  const visited = new Set(progress?.visitedRoomIds ?? [startRoomId])
  const resolved = new Set(progress?.resolvedRoomIds ?? [startRoomId])
  return blueprints[shipId].map((room) => ({
    ...room,
    visited: visited.has(room.id) || room.id === startRoomId,
    resolved: resolved.has(room.id) || room.id === startRoomId,
  }))
}

export const upgrades: readonly UpgradeDefinition[] = [
  { key: 'hull', category: 'systems', name: 'Усиленный корпус', description: '+2 к прочности в каждой экспедиции', prices: [12, 24, 40, 65, 95] },
  { key: 'battery', category: 'systems', name: 'Резервная батарея', description: '+2 к запасу энергии', prices: [10, 22, 36, 52, 70, 90, 115, 145, 180, 220] },
  { key: 'scanner', category: 'systems', name: 'Сканер отсеков', description: 'Показывает класс соседнего отсека', prices: [14] },
  { key: 'emergencyCapacitor', category: 'systems', name: 'Аварийный конденсатор', description: 'Один раз за вылазку возвращает 2 энергии за уровень', prices: [35, 75, 130], unlockAfterFirstShip: true },
  { key: 'shieldAmplifier', category: 'systems', name: 'Усилитель щита', description: '+1 к поглощению урона в защите', prices: [30, 65, 110], unlockAfterFirstShip: true },
  { key: 'trapSense', category: 'skills', name: 'Чутьё ловушек', description: '+1 к проверкам обнаружения ловушек', prices: [12, 18, 25, 35, 48, 64, 82, 105, 132, 165], unlockAfterFirstShip: true },
  { key: 'salvageBonus', category: 'skills', name: 'Опытный сборщик', description: '+1 к любой найденной добыче', prices: [25, 55, 95], unlockAfterFirstShip: true },
  { key: 'toolDurability', category: 'skills', name: 'Усиленные насадки', description: '+2 к максимальной прочности инструментов', prices: [25, 45, 70, 105, 150], unlockAfterFirstShip: true },
  { key: 'cargoStabilizer', category: 'skills', name: 'Стабилизатор груза', description: '+5% сохранённого лома при поражении', prices: [25, 50, 85, 130, 190], unlockAfterFirstShip: true },
]

export const toolDefinitions: readonly ToolDefinition[] = [
  { key: 'mechanic', name: 'Инструмент механика', description: 'Ящики и заклинившие механизмы', price: 20, durability: 12, repairCost: 2 },
  { key: 'laser', name: 'Лазерный резак', description: 'Сплавленные обломки и бронепанели', price: 50, durability: 20, repairCost: 3, unlockAfterFirstShip: true },
  { key: 'grapple', name: 'Магнитный захват', description: 'Груз в шахтах и за пределами корпуса', price: 30, durability: 16, repairCost: 2, unlockAfterFirstShip: true },
  { key: 'diagnostic', name: 'Диагностический щуп', description: 'Энергоблоки и ядра механизмов', price: 35, durability: 18, repairCost: 2, unlockAfterFirstShip: true },
  { key: 'decoder', name: 'Ключ-дешифратор', description: 'Терминалы, архивы и электронные замки', price: 40, durability: 14, repairCost: 3, unlockAfterFirstShip: true },
  { key: 'sealant', name: 'Герметизатор', description: 'Вакуумные тайники и повреждённые магистрали', price: 30, durability: 12, repairCost: 2, unlockAfterFirstShip: true },
]

export const salvageDefinitions: Partial<Record<RoomKind, SalvageDefinition>> = {
  storage: { primaryTool: 'mechanic', auxiliaryTool: 'laser', minLoot: 2, maxLoot: 8, action: 'Вскрыть контейнер' },
  debris: { primaryTool: 'laser', auxiliaryTool: 'grapple', minLoot: 10, maxLoot: 40, action: 'Разделать техномусор' },
  cargo: { primaryTool: 'grapple', auxiliaryTool: 'mechanic', minLoot: 5, maxLoot: 14, action: 'Снять подвесной груз' },
  power: { primaryTool: 'diagnostic', auxiliaryTool: 'laser', minLoot: 6, maxLoot: 18, action: 'Извлечь силовой модуль' },
  terminal: { primaryTool: 'decoder', minLoot: 4, maxLoot: 12, action: 'Расшифровать архив' },
  vacuum: { primaryTool: 'sealant', auxiliaryTool: 'grapple', minLoot: 6, maxLoot: 16, action: 'Вскрыть вакуумный тайник' },
  door: { primaryTool: 'mechanic', auxiliaryTool: 'laser', minLoot: 0, maxLoot: 0, action: 'Разблокировать ворота' },
}

export const roomCopy = {
  storage: { eyebrow: 'Сигнатура: груз', title: 'Герметичный склад', body: 'Контейнер зажат аварийными створками. Нужен подходящий инструмент.' },
  debris: { eyebrow: 'Сигнатура: сплав', title: 'Спёкшийся техномусор', body: 'Обломки спрессованы высокой температурой, но внутри видны ценные компоненты.' },
  cargo: { eyebrow: 'Сигнатура: груз', title: 'Подвесной контейнер', body: 'Груз завис над шахтой. До него можно добраться инструментом.' },
  power: { eyebrow: 'Система: остаточный заряд', title: 'Силовой модуль', body: 'В блоке сохранились редкие проводники и стабилизаторы.' },
  terminal: { eyebrow: 'Система: зашифрована', title: 'Архивный терминал', body: 'За электронной защитой скрыты схемы и учёт ценных деталей.' },
  vacuum: { eyebrow: 'Опасность: вакуум', title: 'Разгерметизированный тайник', body: 'Контейнер находится за повреждённым контуром давления.' },
  door: { eyebrow: 'Маршрут: заблокирован', title: 'Заклинившие ворота', body: 'Привод перекошен. Назад пройти можно, но путь вглубь закрыт.' },
  hazard: { eyebrow: 'Опасность: разгерметизация', title: 'Рваная переборка', body: 'За пробоиной виден сервисный ящик. Можно рискнуть корпусом.' },
  repair: { eyebrow: 'Система: доступна', title: 'Ремонтный модуль', body: 'Старая станция ещё держит давление и принимает лом.' },
  puzzle: { eyebrow: 'Система: ручной контур', title: 'Сортировочная матрица', body: 'Соберите красные кнопки в линии по три, чтобы разблокировать кассету с ломом.' },
} as const

export const getToolDefinition = (key: ToolKey) => toolDefinitions.find((tool) => tool.key === key)!
export const getToolMaxDurability = (key: ToolKey, durabilityLevel: number) => getToolDefinition(key).durability + durabilityLevel * 2
