import { create } from 'zustand'
import { createRooms, START_ROOM_ID, upgrades } from './content'
import type {
  ExpeditionResult,
  ExpeditionRun,
  Room,
  RoomKind,
  RoomState,
  Screen,
  UpgradeKey,
} from './types'

interface GameState {
  screen: Screen
  bankedScrap: number
  upgrades: Record<UpgradeKey, number>
  run: ExpeditionRun | null
  result: ExpeditionResult | null
  setScreen: (screen: Screen) => void
  startRun: () => void
  moveTo: (roomId: string) => void
  chooseRoomAction: (choice: 'primary' | 'secondary') => void
  combatAction: (action: 'attack' | 'defend' | 'overload') => void
  extract: () => void
  purchaseUpgrade: (key: UpgradeKey) => void
  clearNotice: () => void
}

const adjacent = (a: Room, b: Room) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1

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
    },
    run: null,
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'hangar',
  bankedScrap: 32,
  upgrades: { hull: 0, battery: 0, scanner: 0 },
  run: null,
  result: null,

  setScreen: (screen) => set({ screen }),

  startRun: () => {
    const levels = get().upgrades
    const maxHull = 10 + levels.hull * 2
    const maxEnergy = 12 + levels.battery * 2
    set({
      screen: 'expedition',
      result: null,
      run: {
        hull: maxHull,
        maxHull,
        energy: maxEnergy,
        maxEnergy,
        scrap: 0,
        roomsExplored: 1,
        currentRoomId: START_ROOM_ID,
        previousRoomId: null,
        rooms: createRooms(),
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
    const nextRun: ExpeditionRun = {
      ...run,
      currentRoomId: roomId,
      previousRoomId: current.id,
      energy: run.energy - 1,
      roomsExplored: run.roomsExplored + (firstVisit ? 1 : 0),
      rooms,
      notice: roomNotice[target.kind] ?? null,
      combat:
        firstVisit && target.kind === 'enemy'
          ? { enemyHull: 6, enemyMaxHull: 6, enemyIntent: 'strike', round: 1 }
          : null,
    }

    if (nextRun.hull <= 0) {
      set(endFailedRun(nextRun, 'Корпус не выдержал повреждений', bankedScrap))
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

    if (nextRun.hull <= 0) {
      set(endFailedRun(nextRun, 'Корпус не выдержал повреждений', bankedScrap))
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
      set({
        run: {
          ...run,
          energy,
          scrap: run.scrap + 3,
          rooms: run.rooms.map((room) =>
            room.id === run.currentRoomId ? { ...room, resolved: true } : room,
          ),
          combat: null,
          notice: 'Дрон обезврежен. Получено 3 лома.',
        },
      })
      return
    }

    const enemyDamage = action === 'defend' ? 0 : run.combat.enemyIntent === 'charge' ? 3 : 2
    const hull = run.hull - enemyDamage
    const nextRun: ExpeditionRun = {
      ...run,
      hull,
      energy,
      combat: {
        ...run.combat,
        enemyHull,
        round: run.combat.round + 1,
        enemyIntent: run.combat.round % 2 === 0 ? 'charge' : 'strike',
      },
      notice: action === 'defend' ? 'Удар принят на щит.' : `Получено ${enemyDamage} урона.`,
    }

    if (hull <= 0) {
      set(endFailedRun(nextRun, 'Охранный дрон пробил корпус', bankedScrap))
      return
    }
    set({ run: nextRun })
  },

  extract: () => {
    const { run, bankedScrap } = get()
    if (!run || run.currentRoomId !== START_ROOM_ID || run.combat) return
    set({
      screen: 'result',
      bankedScrap: bankedScrap + run.scrap,
      result: {
        status: 'extracted',
        scrapBanked: run.scrap,
        scrapFound: run.scrap,
        roomsExplored: run.roomsExplored,
        reason: 'Стыковка завершена',
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
}))
