import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createRooms, FIRST_SHIP_ID, START_ROOM_ID, upgrades } from './content'
import type {
  ExpeditionResult,
  ExpeditionRun,
  Room,
  RoomKind,
  RoomState,
  Screen,
  ShipId,
  ShipProgress,
  UpgradeKey,
} from './types'

interface GameState {
  screen: Screen
  bankedScrap: number
  upgrades: Record<UpgradeKey, number>
  shipProgress: Record<ShipId, ShipProgress>
  run: ExpeditionRun | null
  result: ExpeditionResult | null
  setScreen: (screen: Screen) => void
  startRun: (shipId?: ShipId) => void
  moveTo: (roomId: string) => void
  chooseRoomAction: (choice: 'primary' | 'secondary') => void
  combatAction: (action: 'attack' | 'defend' | 'overload') => void
  extract: () => void
  purchaseUpgrade: (key: UpgradeKey) => void
  clearNotice: () => void
  resetProgress: () => void
}

const DEFAULT_BANKED_SCRAP = 32
const DEFAULT_UPGRADES: Record<UpgradeKey, number> = { hull: 0, battery: 0, scanner: 0 }
const createDefaultShipProgress = (): Record<ShipId, ShipProgress> => ({
  [FIRST_SHIP_ID]: {
    visitedRoomIds: [START_ROOM_ID],
    resolvedRoomIds: [START_ROOM_ID],
    completed: false,
  },
})

const adjacent = (a: Room, b: Room) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1

export const SHIP_SURVEY_COMPLETE_NOTICE = 'КАРТА ОБЪЕКТА ЗАВЕРШЕНА. Вернитесь в шлюз и эвакуируйте разведданные.'

export const getEnemyDamageRange = (intent: 'strike' | 'charge'): readonly [number, number] =>
  intent === 'charge' ? [3, 4] : [2, 3]

const rollEnemyDamage = (intent: 'strike' | 'charge') => {
  const [min, max] = getEnemyDamageRange(intent)
  return min + Math.floor(Math.random() * (max - min + 1))
}

export const getRoomState = (room: Room, currentRoom: Room): RoomState => {
  if (room.visited) return 'visited'
  if (adjacent(room, currentRoom)) return 'available'
  return 'hidden'
}

const roomNotice: Partial<Record<RoomKind, string>> = {
  empty: 'Отсек пуст. Только пыль и старые кабели.',
  start: 'Шлюз эвакуации снова в зоне доступа.',
}

const endFailedRun = (run: ExpeditionRun, reason: string, bankedScrap: number) => {
  const retained = Math.floor(run.scrap * 0.25)
  return {
    screen: 'result' as const,
    bankedScrap: bankedScrap + retained,
    result: {
      status: 'failed' as const,
      scrapBanked: retained,
      scrapFound: run.scrap,
      roomsExplored: run.roomsExplored,
      reason,
      shipCompletedNow: false,
    },
    run: null,
  }
}

const getRunFailure = (run: ExpeditionRun, bankedScrap: number, hullReason: string) => {
  if (run.hull <= 0) return endFailedRun(run, hullReason, bankedScrap)
  if (run.energy <= 0 && run.currentRoomId !== START_ROOM_ID) {
    return endFailedRun(run, 'Батарея разряжена вдали от шлюза', bankedScrap)
  }
  return null
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  screen: 'hangar',
  bankedScrap: DEFAULT_BANKED_SCRAP,
  upgrades: { ...DEFAULT_UPGRADES },
  shipProgress: createDefaultShipProgress(),
  run: null,
  result: null,

  setScreen: (screen) => set({ screen }),

  startRun: (shipId = FIRST_SHIP_ID) => {
    const state = get()
    const levels = state.upgrades
    const maxHull = 10 + levels.hull * 2
    const maxEnergy = 12 + levels.battery * 2
    set({
      screen: 'expedition',
      result: null,
      run: {
        shipId,
        hull: maxHull,
        maxHull,
        energy: maxEnergy,
        maxEnergy,
        scrap: 0,
        roomsExplored: 0,
        currentRoomId: START_ROOM_ID,
        previousRoomId: null,
        rooms: createRooms(state.shipProgress[shipId] ?? createDefaultShipProgress()[shipId]),
        combat: null,
        notice: 'Шлюз отмечен. Канал эвакуации стабилен.',
      },
    })
  },

  moveTo: (roomId) => {
    const { run, bankedScrap } = get()
    if (!run || run.combat || run.energy <= 0) return

    const current = run.rooms.find((room) => room.id === run.currentRoomId)
    const target = run.rooms.find((room) => room.id === roomId)
    if (!current || !current.resolved || !target || !adjacent(current, target)) return

    const firstVisit = !target.visited
    const rooms = run.rooms.map((room) =>
      room.id === roomId
        ? { ...room, visited: true, resolved: room.resolved || room.kind === 'empty' || room.kind === 'start' }
        : room,
    )
    const surveyCompletedNow = firstVisit && rooms.every((room) => room.visited)
    const nextRun: ExpeditionRun = {
      ...run,
      currentRoomId: roomId,
      previousRoomId: current.id,
      energy: run.energy - 1,
      roomsExplored: run.roomsExplored + (firstVisit ? 1 : 0),
      rooms,
      notice: surveyCompletedNow ? SHIP_SURVEY_COMPLETE_NOTICE : roomNotice[target.kind] ?? null,
      combat:
        target.kind === 'enemy' && !target.resolved
          ? { enemyHull: 6, enemyMaxHull: 6, enemyIntent: 'strike', round: 1 }
          : null,
    }

    const failure = getRunFailure(nextRun, bankedScrap, 'Корпус не выдержал повреждений')
    if (failure) {
      set(failure)
      return
    }
    set({ run: nextRun })
  },

  chooseRoomAction: (choice) => {
    const { run, bankedScrap } = get()
    if (!run) return
    const room = run.rooms.find((item) => item.id === run.currentRoomId)
    if (!room) return

    const rooms = run.rooms.map((item) => (item.id === room.id ? { ...item, resolved: true } : item))
    let nextRun: ExpeditionRun = { ...run, rooms, notice: null }
    if (room.kind === 'storage') {
      nextRun =
        choice === 'primary' && run.energy >= 2
          ? { ...nextRun, energy: run.energy - 2, scrap: run.scrap + 4, notice: '+4 лома. Контейнер вскрыт.' }
          : { ...nextRun, notice: 'Склад оставлен нетронутым.' }
    }
    if (room.kind === 'hazard') {
      nextRun =
        choice === 'primary'
          ? { ...nextRun, hull: run.hull - 2, scrap: run.scrap + 5, notice: '+5 лома. Корпус повреждён.' }
          : { ...nextRun, energy: Math.max(0, run.energy - 1), notice: 'Обход найден. Потрачена 1 энергия.' }
    }
    if (room.kind === 'repair') {
      nextRun =
        choice === 'primary' && run.scrap >= 2
          ? {
              ...nextRun,
              hull: Math.min(run.maxHull, run.hull + 3),
              scrap: run.scrap - 2,
              notice: 'Корпус восстановлен на 3.',
            }
          : { ...nextRun, notice: 'Ремонтный модуль отключён.' }
    }

    const failure = getRunFailure(nextRun, bankedScrap, 'Корпус не выдержал повреждений')
    if (failure) {
      set(failure)
      return
    }
    set({ run: nextRun })
  },

  combatAction: (action) => {
    const { run, bankedScrap } = get()
    if (!run?.combat) return
    if (action === 'overload' && run.energy < 2) return

    const damage = action === 'overload' ? 4 : action === 'attack' ? 2 : 0
    const energy = action === 'overload' ? run.energy - 2 : run.energy
    const enemyHull = Math.max(0, run.combat.enemyHull - damage)

    if (enemyHull === 0) {
      const surveyComplete = run.rooms.every((room) => room.visited)
      const nextRun: ExpeditionRun = {
        ...run,
        energy,
        scrap: run.scrap + 3,
        rooms: run.rooms.map((room) =>
          room.id === run.currentRoomId ? { ...room, resolved: true } : room,
        ),
        combat: null,
        notice: surveyComplete ? SHIP_SURVEY_COMPLETE_NOTICE : 'Дрон обезврежен. Получено 3 лома.',
      }
      const failure = getRunFailure(nextRun, bankedScrap, 'Охранный дрон пробил корпус')
      set(failure ?? { run: nextRun })
      return
    }

    const incomingDamage = rollEnemyDamage(run.combat.enemyIntent)
    const enemyDamage = Math.max(0, incomingDamage - (action === 'defend' ? 2 : 0))
    const hull = run.hull - enemyDamage
    const nextRun: ExpeditionRun = {
      ...run,
      hull,
      energy,
      combat: {
        ...run.combat,
        enemyHull,
        round: run.combat.round + 1,
        enemyIntent: run.combat.enemyIntent === 'strike' ? 'charge' : 'strike',
      },
      notice: action === 'defend'
        ? `Щит поглотил 2 урона. Корпус получил ${enemyDamage}.`
        : `Корпус получил ${enemyDamage} урона.`,
    }

    const failure = getRunFailure(nextRun, bankedScrap, 'Охранный дрон пробил корпус')
    if (failure) {
      set(failure)
      return
    }
    set({ run: nextRun })
  },

  extract: () => {
    const { run, bankedScrap, shipProgress } = get()
    if (!run || run.currentRoomId !== START_ROOM_ID || run.combat) return
    const visitedRoomIds = run.rooms.filter((room) => room.visited).map((room) => room.id)
    const resolvedRoomIds = run.rooms.filter((room) => room.resolved).map((room) => room.id)
    const completed = run.rooms.every((room) => room.visited)
    const shipCompletedNow = completed && !shipProgress[run.shipId].completed
    set({
      screen: 'result',
      bankedScrap: bankedScrap + run.scrap,
      shipProgress: {
        ...shipProgress,
        [run.shipId]: {
          visitedRoomIds,
          resolvedRoomIds,
          completed,
        },
      },
      result: {
        status: 'extracted',
        scrapBanked: run.scrap,
        scrapFound: run.scrap,
        roomsExplored: run.roomsExplored,
        reason: shipCompletedNow ? 'Обнаружен маршрут к следующему объекту' : 'Стыковка завершена',
        shipCompletedNow,
      },
      run: null,
    })
  },

  purchaseUpgrade: (key) => {
    const state = get()
    const definition = upgrades.find((upgrade) => upgrade.key === key)
    const level = state.upgrades[key]
    const price = definition?.prices[level]
    if (price === undefined || state.bankedScrap < price) return
    set({
      bankedScrap: state.bankedScrap - price,
      upgrades: { ...state.upgrades, [key]: level + 1 },
    })
  },

  clearNotice: () => {
    const run = get().run
    if (run) set({ run: { ...run, notice: null } })
  },

  resetProgress: () => set({
    screen: 'hangar',
    bankedScrap: DEFAULT_BANKED_SCRAP,
    upgrades: { ...DEFAULT_UPGRADES },
    shipProgress: createDefaultShipProgress(),
    run: null,
    result: null,
  }),
}), {
  name: 'cosmic-scavenger-progress',
  version: 2,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState, version) => {
    const state = persistedState as Partial<GameState>
    return {
      ...state,
      shipProgress: version < 2 ? createDefaultShipProgress() : state.shipProgress ?? createDefaultShipProgress(),
    }
  },
  partialize: (state) => ({
    bankedScrap: state.bankedScrap,
    upgrades: state.upgrades,
    shipProgress: state.shipProgress,
  }),
}))
