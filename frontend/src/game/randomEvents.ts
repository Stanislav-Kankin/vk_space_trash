import type { MatchTile } from './matchThree'
import type { RandomEncounter, RandomEventKind } from './types'

export const RANDOM_EVENT_MIN_DISTANCE = 7
export const RANDOM_EVENT_MAX_DISTANCE = 25

export const randomEventKinds: readonly RandomEventKind[] = [
  'digital-lock',
  'crew-tablet',
  'radiation',
  'power-grid',
  'cargo-crane',
  'star-chart',
]

const seededValue = (seed: number, salt: number) => {
  let value = (seed + Math.imul(salt + 1, 0x9e3779b1)) | 0
  value ^= value >>> 16
  value = Math.imul(value, 0x21f0aaad)
  value ^= value >>> 15
  value = Math.imul(value, 0x735a2d97)
  value ^= value >>> 15
  return value >>> 0
}

export const seededInt = (seed: number, salt: number, min: number, max: number) =>
  min + (seededValue(seed, salt) % (max - min + 1))

export const randomEventDistance = (random: () => number = Math.random) =>
  RANDOM_EVENT_MIN_DISTANCE + Math.floor(random() * (RANDOM_EVENT_MAX_DISTANCE - RANDOM_EVENT_MIN_DISTANCE + 1))

export const drawRandomEvent = (
  bag: readonly RandomEventKind[],
  random: () => number = Math.random,
): { kind: RandomEventKind; bag: RandomEventKind[] } => {
  const available = bag.length > 0 ? [...bag] : [...randomEventKinds]
  const index = Math.min(available.length - 1, Math.floor(random() * available.length))
  const [kind] = available.splice(Math.max(0, index), 1)
  return { kind, bag: available }
}

export const createRandomEncounter = (kind: RandomEventKind, moveNumber: number, random: () => number = Math.random): RandomEncounter => {
  const seed = Math.floor(random() * 0x7fffffff)
  return { id: `${kind}:${moveNumber}:${seed}`, kind, seed }
}

const digitalTiers = [
  { target: 15, moves: 5, rewardMin: 8, rewardMax: 12 },
  { target: 18, moves: 7, rewardMin: 11, rewardMax: 16 },
  { target: 25, moves: 10, rewardMin: 15, rewardMax: 20 },
] as const

const matchTiles: readonly MatchTile[] = ['button', 'chip', 'gear', 'rock']

export const getDigitalLockConfig = (seed: number) => {
  const tier = digitalTiers[seededInt(seed, 1, 0, digitalTiers.length - 1)]
  return {
    ...tier,
    targetTile: matchTiles[seededInt(seed, 2, 0, matchTiles.length - 1)],
    reward: seededInt(seed, 3, tier.rewardMin, tier.rewardMax),
  }
}

export interface TabletScenario {
  owner: string
  role: string
  message: string
  photo: string
  route: string
  locations: readonly string[]
  correctLocation: number
  scrapReward: number
}

const tabletScenarios: readonly Omit<TabletScenario, 'scrapReward'>[] = [
  {
    owner: 'МИРА ВОЛКОВА',
    role: 'ИНЖЕНЕР СМЕНЫ',
    message: 'Спрятала кассету подальше от гула главного реактора.',
    photo: 'На последнем снимке видны жёлтые захваты грузовой линии.',
    route: 'Последняя отметка: сектор погрузки у внешнего борта.',
    locations: ['Реакторный пост', 'Грузовой балкон', 'Медицинский блок'],
    correctLocation: 1,
  },
  {
    owner: 'ЯН КОРНЕЕВ',
    role: 'НАВИГАТОР',
    message: 'Резервный ключ там, где всегда видны звёзды.',
    photo: 'Стекло обзорной рубки покрыто трещиной в форме дуги.',
    route: 'Маршрут обрывается рядом с носовым визором.',
    locations: ['Носовая рубка', 'Склад фильтров', 'Нижний шлюз'],
    correctLocation: 0,
  },
  {
    owner: 'ЛЕЯ СОКОЛ',
    role: 'МЕДИК',
    message: 'Образцы нельзя оставлять рядом с тёплой магистралью.',
    photo: 'На контейнере виден голубой знак криогенного хранения.',
    route: 'Планшет последний раз подключался к холодному контуру.',
    locations: ['Криогенный шкаф', 'Мастерская', 'Архив мостика'],
    correctLocation: 0,
  },
  {
    owner: 'АРСЕН РЭЙ',
    role: 'СТАРШИЙ МЕХАНИК',
    message: 'Комплект оставил возле рамы, которая ещё отвечает сети.',
    photo: 'За плечом владельца виден зелёный индикатор диагностики.',
    route: 'Последний сервисный запрос пришёл из ремонтного поста.',
    locations: ['Жилой модуль', 'Ремонтная рама', 'Шахта антенны'],
    correctLocation: 1,
  },
]

export const getTabletScenario = (seed: number): TabletScenario => {
  const scenario = tabletScenarios[seededInt(seed, 4, 0, tabletScenarios.length - 1)]
  return { ...scenario, scrapReward: seededInt(seed, 5, 6, 14) }
}

export const getRadiationConfig = (seed: number) => ({
  durations: [seededInt(seed, 6, 2600, 3400), seededInt(seed, 7, 3000, 3900), seededInt(seed, 8, 3400, 4400)],
  safeCenters: [seededInt(seed, 9, 30, 330), seededInt(seed, 10, 30, 330), seededInt(seed, 11, 30, 330)],
  reward: seededInt(seed, 12, 8, 16),
})

export const getPowerGridReward = (seed: number) => seededInt(seed, 13, 8, 14)

export const getCargoReward = (seed: number, score: number) => {
  if (score >= 3) return seededInt(seed, 14, 12, 18)
  if (score === 2) return seededInt(seed, 15, 7, 11)
  return 0
}

export const getStarChartConfig = (seed: number) => ({
  targets: [seededInt(seed, 16, 0, 3), seededInt(seed, 17, 0, 3), seededInt(seed, 18, 0, 3)],
  revealedRooms: seededInt(seed, 19, 3, 4),
})
