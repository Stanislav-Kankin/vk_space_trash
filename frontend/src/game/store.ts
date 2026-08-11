import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  createRooms,
  FIRST_SHIP_ID,
  getShip,
  getToolDefinition,
  getToolMaxDurability,
  salvageDefinitions,
  SECOND_SHIP_ID,
  ships,
  upgrades,
} from './content'
import {
  createRandomEncounter,
  drawRandomEvent,
  getCargoReward,
  getDigitalLockConfig,
  getPowerGridReward,
  getRadiationConfig,
  getStarChartConfig,
  getTabletScenario,
  randomEventDistance,
  randomEventKinds,
} from './randomEvents'
import type {
  ExpeditionResult,
  ExpeditionRun,
  Room,
  RoomKind,
  RoomState,
  RandomEventKind,
  RandomEventResolution,
  Screen,
  ShipId,
  ShipProgress,
  ToolKey,
  ToolState,
  UpgradeKey,
} from './types'

type RoomAction = 'primary' | 'auxiliary' | 'secondary'

interface GameState {
  screen: Screen
  bankedScrap: number
  upgrades: Record<UpgradeKey, number>
  tools: Record<ToolKey, ToolState>
  loadout: ToolKey[]
  claimedCompletionRewards: ShipId[]
  totalMoves: number
  movesUntilRandomEvent: number
  randomEventBag: RandomEventKind[]
  shipProgress: Record<ShipId, ShipProgress>
  run: ExpeditionRun | null
  result: ExpeditionResult | null
  setScreen: (screen: Screen) => void
  startRun: (shipId?: ShipId) => void
  moveTo: (roomId: string) => void
  chooseRoomAction: (choice: RoomAction) => void
  combatAction: (action: 'attack' | 'defend' | 'overload') => void
  resolveEnemyTurn: () => void
  completePuzzle: (success: boolean) => void
  resolveRandomEvent: (resolution: RandomEventResolution) => void
  extract: () => void
  purchaseUpgrade: (key: UpgradeKey) => void
  buyTool: (key: ToolKey) => void
  repairTool: (key: ToolKey) => void
  toggleLoadoutTool: (key: ToolKey) => void
  clearNotice: () => void
  clearTrapEvent: () => void
  resetProgress: () => void
}

const DEFAULT_BANKED_SCRAP = 32
const DEFAULT_UPGRADES: Record<UpgradeKey, number> = {
  hull: 0,
  battery: 0,
  scanner: 0,
  trapSense: 0,
  salvageBonus: 0,
  toolDurability: 0,
  emergencyCapacitor: 0,
  cargoStabilizer: 0,
  shieldAmplifier: 0,
}

const createDefaultTools = (): Record<ToolKey, ToolState> => ({
  mechanic: { owned: true, durability: getToolDefinition('mechanic').durability },
  laser: { owned: false, durability: 0 },
  grapple: { owned: false, durability: 0 },
  diagnostic: { owned: false, durability: 0 },
  decoder: { owned: false, durability: 0 },
  sealant: { owned: false, durability: 0 },
})

const createDefaultShipProgress = (): Record<ShipId, ShipProgress> => ({
  [FIRST_SHIP_ID]: {
    visitedRoomIds: [ships[FIRST_SHIP_ID].startRoomId],
    resolvedRoomIds: [ships[FIRST_SHIP_ID].startRoomId],
    completed: false,
  },
  [SECOND_SHIP_ID]: {
    visitedRoomIds: [ships[SECOND_SHIP_ID].startRoomId],
    resolvedRoomIds: [ships[SECOND_SHIP_ID].startRoomId],
    completed: false,
  },
})

const adjacent = (a: Room, b: Room) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1

export const SHIP_SURVEY_COMPLETE_NOTICE = 'КАРТА ОБЪЕКТА ЗАВЕРШЕНА. Вернитесь в шлюз и эвакуируйте разведданные.'

export const getEnemyDamageRange = (intent: 'strike' | 'charge'): readonly [number, number] =>
  intent === 'charge' ? [1, 3] : [1, 3]

const rollEnemyDamage = (intent: 'strike' | 'charge') => {
  const [min, max] = getEnemyDamageRange(intent)
  return min + Math.floor(Math.random() * (max - min + 1))
}

const seededLoot = (shipId: ShipId, room: Room, min: number, max: number) => {
  const seed = `${shipId}:${room.id}:${room.kind}`
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return min + (Math.abs(hash) % (max - min + 1))
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

const endFailedRun = (run: ExpeditionRun, reason: string, state: GameState) => {
  const retainedRate = 0.25 + state.upgrades.cargoStabilizer * 0.05
  const retained = Math.floor(run.scrap * retainedRate)
  return {
    screen: 'result' as const,
    bankedScrap: state.bankedScrap + retained,
    result: {
      status: 'failed' as const,
      shipId: run.shipId,
      scrapBanked: retained,
      scrapFound: run.scrap,
      roomsExplored: run.roomsExplored,
      reason,
      shipCompletedNow: false,
      completionReward: 0,
    },
    run: null,
  }
}

const getRunOutcome = (run: ExpeditionRun, state: GameState, hullReason: string) => {
  if (run.hull <= 0) return endFailedRun(run, hullReason, state)
  if (run.energy <= 0 && run.currentRoomId !== getShip(run.shipId).startRoomId) {
    const capacitorLevel = state.upgrades.emergencyCapacitor
    if (capacitorLevel > 0 && !run.emergencyUsed) {
      return {
        run: {
          ...run,
          energy: capacitorLevel * 2,
          emergencyUsed: true,
          notice: `Аварийный конденсатор активирован: +${capacitorLevel * 2} энергии.`,
        },
      }
    }
    return endFailedRun(run, 'Батарея разряжена вдали от шлюза', state)
  }
  return { run }
}

const toolIsAvailable = (state: GameState, run: ExpeditionRun, tool: ToolKey, cost: number) =>
  run.equippedTools.includes(tool) && state.tools[tool].owned && state.tools[tool].durability >= cost

const consumeTool = (state: GameState, tool: ToolKey, cost: number) => {
  const durability = Math.max(0, state.tools[tool].durability - cost)
  return {
    ...state.tools,
    [tool]: { owned: durability > 0, durability },
  }
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  screen: 'hangar',
  bankedScrap: DEFAULT_BANKED_SCRAP,
  upgrades: { ...DEFAULT_UPGRADES },
  tools: createDefaultTools(),
  loadout: ['mechanic'],
  claimedCompletionRewards: [],
  totalMoves: 0,
  movesUntilRandomEvent: randomEventDistance(),
  randomEventBag: [...randomEventKinds],
  shipProgress: createDefaultShipProgress(),
  run: null,
  result: null,

  setScreen: (screen) => set({ screen }),

  startRun: (shipId = FIRST_SHIP_ID) => {
    const state = get()
    if (shipId === SECOND_SHIP_ID && !state.shipProgress[FIRST_SHIP_ID].completed) return
    const ship = getShip(shipId)
    const maxHull = 10 + state.upgrades.hull * 2
    const maxEnergy = 12 + state.upgrades.battery * 2
    const equippedTools = state.loadout.filter((key) => state.tools[key].owned && state.tools[key].durability > 0)
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
        currentRoomId: ship.startRoomId,
        previousRoomId: null,
        rooms: createRooms(shipId, state.shipProgress[shipId]),
        equippedTools,
        emergencyUsed: false,
        intelRoomIds: [],
        trapBypassCharges: 0,
        combat: null,
        trapEvent: null,
        randomEncounter: null,
        notice: 'Шлюз отмечен. Канал эвакуации стабилен.',
      },
    })
  },

  moveTo: (roomId) => {
    const state = get()
    const { run } = state
    if (!run || run.combat || run.trapEvent || run.randomEncounter || run.energy <= 0) return

    const current = run.rooms.find((room) => room.id === run.currentRoomId)
    const target = run.rooms.find((room) => room.id === roomId)
    if (!current || !target || !adjacent(current, target)) return
    if (current.kind === 'door' && !current.resolved && roomId !== run.previousRoomId) return

    const firstVisit = !target.visited
    let hull = run.hull
    let energy = run.energy - 1
    let trapNotice: string | null = null
    let trapEvent: ExpeditionRun['trapEvent'] = null
    const trapTriggered = firstVisit && target.kind === 'trap' && target.trap
    let trapResolved = false
    let trapBypassCharges = run.trapBypassCharges

    if (trapTriggered && target.trap) {
      const bypassedByCode = trapBypassCharges > 0
      const roll = bypassedByCode ? 20 : Math.floor(Math.random() * 20) + 1
      const total = bypassedByCode ? target.trap.difficulty : roll + state.upgrades.trapSense
      trapResolved = true
      if (bypassedByCode) trapBypassCharges -= 1
      trapEvent = {
        id: `${target.id}:${roll}:${total}`,
        name: target.trap.name,
        triggered: total < target.trap.difficulty,
        effect: target.trap.effect,
        damage: target.trap.damage,
        roll,
        sense: state.upgrades.trapSense,
        total,
        difficulty: target.trap.difficulty,
        bypassedByCode,
      }
      if (bypassedByCode) {
        trapNotice = 'Служебный код принят. Ловушка переведена в безопасный режим.'
      } else if (total >= target.trap.difficulty) {
        trapNotice = `Ловушка обнаружена: d20 ${roll} + чутьё ${state.upgrades.trapSense} = ${total} против ${target.trap.difficulty}. Урон предотвращён.`
      } else {
        if (target.trap.effect === 'hull') hull -= target.trap.damage
        else energy -= target.trap.damage
        trapNotice = `Ловушка сработала: d20 ${roll} + чутьё ${state.upgrades.trapSense} = ${total} против ${target.trap.difficulty}. Потеряно ${target.trap.damage} ${target.trap.effect === 'hull' ? 'корпуса' : 'энергии'}.`
      }
    }

    const rooms = run.rooms.map((room) =>
      room.id === roomId
        ? {
            ...room,
            visited: true,
            resolved: room.resolved || room.kind === 'empty' || room.kind === 'start' || trapResolved,
          }
        : room,
    )
    const surveyCompletedNow = firstVisit && rooms.every((room) => room.visited)
    const totalMoves = state.totalMoves + 1
    let movesUntilRandomEvent = Math.max(0, state.movesUntilRandomEvent - 1)
    let randomEventBag = state.randomEventBag
    let randomEncounter: ExpeditionRun['randomEncounter'] = null
    const eventEligible = !trapEvent
      && target.kind !== 'start'
      && target.kind !== 'enemy'
      && target.kind !== 'trap'
      && target.kind !== 'door'
      && target.kind !== 'puzzle'
      && hull > 0
      && energy > 0
    if (movesUntilRandomEvent === 0 && eventEligible) {
      const draw = drawRandomEvent(randomEventBag)
      randomEncounter = createRandomEncounter(draw.kind, totalMoves)
      randomEventBag = draw.bag
      movesUntilRandomEvent = randomEventDistance()
    }
    const nextRun: ExpeditionRun = {
      ...run,
      currentRoomId: roomId,
      previousRoomId: current.id,
      hull,
      energy,
      roomsExplored: run.roomsExplored + (firstVisit ? 1 : 0),
      rooms,
      trapBypassCharges,
      trapEvent,
      randomEncounter,
      notice: surveyCompletedNow ? SHIP_SURVEY_COMPLETE_NOTICE : trapNotice ?? roomNotice[target.kind] ?? null,
      combat:
        target.kind === 'enemy' && !target.resolved
          ? {
              enemyHull: run.shipId === SECOND_SHIP_ID ? 8 : 6,
              enemyMaxHull: run.shipId === SECOND_SHIP_ID ? 8 : 6,
              enemyIntent: 'strike',
              round: 1,
              phase: 'player',
              guard: 0,
            }
          : null,
    }

    set({
      totalMoves,
      movesUntilRandomEvent,
      randomEventBag,
      ...getRunOutcome(nextRun, state, 'Корпус не выдержал повреждений'),
    })
  },

  chooseRoomAction: (choice) => {
    const state = get()
    const { run } = state
    if (!run) return
    const room = run.rooms.find((item) => item.id === run.currentRoomId)
    if (!room) return

    const salvage = salvageDefinitions[room.kind]
    if (salvage && (choice === 'primary' || choice === 'auxiliary')) {
      const tool = choice === 'primary' ? salvage.primaryTool : salvage.auxiliaryTool
      const wear = choice === 'primary' ? 1 : 3
      if (!tool || !toolIsAvailable(state, run, tool, wear)) return
      const loot = salvage.maxLoot === 0
        ? 0
        : seededLoot(run.shipId, room, salvage.minLoot, salvage.maxLoot) + state.upgrades.salvageBonus
      const nextRun: ExpeditionRun = {
        ...run,
        scrap: run.scrap + loot,
        rooms: run.rooms.map((item) => item.id === room.id ? { ...item, resolved: true } : item),
        notice: loot > 0
          ? `+${loot} лома. ${getToolDefinition(tool).name}: −${wear} прочности.`
          : `Проход открыт. ${getToolDefinition(tool).name}: −${wear} прочности.`,
      }
      const nextTools = consumeTool(state, tool, wear)
      set({
        tools: nextTools,
        loadout: nextTools[tool].owned ? state.loadout : state.loadout.filter((key) => key !== tool),
        ...getRunOutcome(nextRun, state, 'Корпус не выдержал повреждений'),
      })
      return
    }

    let nextRun: ExpeditionRun = { ...run, notice: null }
    if (room.kind === 'hazard') {
      const bonus = state.upgrades.salvageBonus
      nextRun = choice === 'primary'
        ? {
            ...nextRun,
            hull: run.hull - 2,
            scrap: run.scrap + 5 + bonus,
            rooms: run.rooms.map((item) => item.id === room.id ? { ...item, resolved: true } : item),
            notice: `+${5 + bonus} лома. Корпус повреждён.`,
          }
        : {
            ...nextRun,
            energy: Math.max(0, run.energy - 1),
            rooms: run.rooms.map((item) => item.id === room.id ? { ...item, resolved: true } : item),
            notice: 'Обход найден. Потрачена 1 энергия.',
          }
    }
    if (room.kind === 'repair') {
      nextRun = choice === 'primary' && run.scrap >= 2
        ? {
            ...nextRun,
            hull: Math.min(run.maxHull, run.hull + 3),
            scrap: run.scrap - 2,
            rooms: run.rooms.map((item) => item.id === room.id ? { ...item, resolved: true } : item),
            notice: 'Корпус восстановлен на 3.',
          }
        : {
            ...nextRun,
            rooms: run.rooms.map((item) => item.id === room.id ? { ...item, resolved: true } : item),
            notice: 'Ремонтный модуль отключён.',
          }
    }

    set(getRunOutcome(nextRun, state, 'Корпус не выдержал повреждений'))
  },

  combatAction: (action) => {
    const state = get()
    const { run } = state
    if (!run?.combat || run.combat.phase !== 'player') return
    if (action === 'overload' && run.energy < 2) return

    const damage = action === 'overload' ? 4 : action === 'attack' ? 2 : 0
    const energy = action === 'overload' ? run.energy - 2 : run.energy
    const enemyHull = Math.max(0, run.combat.enemyHull - damage)

    if (enemyHull === 0) {
      const surveyComplete = run.rooms.every((room) => room.visited)
      const loot = 3 + state.upgrades.salvageBonus
      const nextRun: ExpeditionRun = {
        ...run,
        energy,
        scrap: run.scrap + loot,
        rooms: run.rooms.map((room) => room.id === run.currentRoomId ? { ...room, resolved: true } : room),
        combat: null,
        notice: surveyComplete ? SHIP_SURVEY_COMPLETE_NOTICE : `Дрон обезврежен. Получено ${loot} лома.`,
      }
      set(getRunOutcome(nextRun, state, 'Охранный дрон пробил корпус'))
      return
    }

    const shield = action === 'defend' ? 2 + state.upgrades.shieldAmplifier : 0
    const nextRun: ExpeditionRun = {
      ...run,
      energy,
      combat: {
        ...run.combat,
        enemyHull,
        phase: 'enemy',
        guard: shield,
      },
      notice: shield > 0 ? `Щит поднят: поглощение ${shield}. Дрон атакует.` : 'Дрон перехватил инициативу и атакует.',
    }

    set(getRunOutcome(nextRun, state, 'Охранный дрон пробил корпус'))
  },

  resolveEnemyTurn: () => {
    const state = get()
    const { run } = state
    if (!run?.combat || run.combat.phase !== 'enemy') return

    const incomingDamage = rollEnemyDamage(run.combat.enemyIntent)
    const enemyDamage = Math.max(0, incomingDamage - run.combat.guard)
    const nextRun: ExpeditionRun = {
      ...run,
      hull: run.hull - enemyDamage,
      combat: {
        ...run.combat,
        round: run.combat.round + 1,
        enemyIntent: run.combat.enemyIntent === 'strike' ? 'charge' : 'strike',
        phase: 'player',
        guard: 0,
      },
      notice: run.combat.guard > 0
        ? `Удар ${incomingDamage}. Щит поглотил ${Math.min(incomingDamage, run.combat.guard)}. Корпус получил ${enemyDamage}.`
        : `Импульсный удар: корпус получил ${enemyDamage} урона.`,
    }

    set(getRunOutcome(nextRun, state, 'Охранный дрон пробил корпус'))
  },

  completePuzzle: (success) => {
    const state = get()
    const { run } = state
    if (!run) return
    const room = run.rooms.find((item) => item.id === run.currentRoomId)
    if (!room || room.kind !== 'puzzle' || room.resolved) return
    const reward = success ? 15 + state.upgrades.salvageBonus : 0
    const nextRun: ExpeditionRun = {
      ...run,
      scrap: run.scrap + reward,
      rooms: run.rooms.map((item) => item.id === room.id ? { ...item, resolved: true } : item),
      notice: success
        ? `Сортировочная кассета открыта: +${reward} лома.`
        : 'Матрица заблокирована. Кассета осталась закрыта.',
    }
    set(getRunOutcome(nextRun, state, 'Корпус не выдержал повреждений'))
  },

  resolveRandomEvent: (resolution) => {
    const state = get()
    const { run } = state
    const encounter = run?.randomEncounter
    if (!run || !encounter) return

    let nextRun: ExpeditionRun = { ...run, randomEncounter: null }
    if (resolution.status === 'skip') {
      nextRun.notice = 'Сигнал оставлен без внимания.'
      set({ run: nextRun })
      return
    }

    if (encounter.kind === 'digital-lock') {
      const config = getDigitalLockConfig(encounter.seed)
      nextRun = resolution.status === 'success'
        ? { ...nextRun, scrap: run.scrap + config.reward, notice: `Цифровой замок открыт: +${config.reward} лома.` }
        : { ...nextRun, notice: 'Защита заблокировала модуль. Добычи нет.' }
    }

    if (encounter.kind === 'crew-tablet') {
      const scenario = getTabletScenario(encounter.seed)
      if (resolution.status !== 'success') {
        nextRun.notice = 'Батарея планшета разрядилась. Тайник не найден.'
      } else if (resolution.choice === 'intel') {
        const intel = run.rooms
          .filter((room) => !room.visited && !run.intelRoomIds.includes(room.id))
          .sort((first, second) => {
            const current = run.rooms.find((room) => room.id === run.currentRoomId)!
            return (Math.abs(first.x - current.x) + Math.abs(first.y - current.y))
              - (Math.abs(second.x - current.x) + Math.abs(second.y - current.y))
          })
          .slice(0, 3)
          .map((room) => room.id)
        nextRun = { ...nextRun, intelRoomIds: [...run.intelRoomIds, ...intel], notice: `Служебная карта раскрыла ${intel.length} отсека.` }
      } else if (resolution.choice === 'code') {
        nextRun = { ...nextRun, trapBypassCharges: run.trapBypassCharges + 1, notice: 'Загружен код обхода одной ловушки.' }
      } else {
        nextRun = { ...nextRun, scrap: run.scrap + scenario.scrapReward, notice: `Личный тайник найден: +${scenario.scrapReward} лома.` }
      }
    }

    if (encounter.kind === 'radiation') {
      const score = resolution.score ?? 0
      const config = getRadiationConfig(encounter.seed)
      if (score >= 3) nextRun = { ...nextRun, scrap: run.scrap + config.reward, notice: `Защита настроена: +${config.reward} лома.` }
      else if (score === 2) nextRun.notice = 'Защита выдержала. Контейнер остался недоступен.'
      else nextRun = { ...nextRun, hull: run.hull - 2, notice: 'Радиационный импульс: −2 корпуса.' }
    }

    if (encounter.kind === 'power-grid') {
      if (resolution.status !== 'success') {
        nextRun = { ...nextRun, energy: Math.max(0, run.energy - 1), notice: 'Короткое замыкание: −1 энергия.' }
      } else if (resolution.choice === 'energy') {
        const restored = Math.min(3, run.maxEnergy - run.energy)
        nextRun = { ...nextRun, energy: run.energy + restored, notice: `Аккумулятор подключён: +${restored} энергии.` }
      } else {
        const reward = getPowerGridReward(encounter.seed)
        nextRun = { ...nextRun, scrap: run.scrap + reward, notice: `Аккумулятор разобран: +${reward} лома.` }
      }
    }

    if (encounter.kind === 'cargo-crane') {
      const score = resolution.score ?? 0
      const reward = getCargoReward(encounter.seed, score)
      nextRun = reward > 0
        ? { ...nextRun, scrap: run.scrap + reward, notice: `Груз захвачен: +${reward} лома.` }
        : { ...nextRun, notice: 'Контейнеры ушли в шахту. Добычи нет.' }
    }

    if (encounter.kind === 'star-chart') {
      if (resolution.status !== 'success') {
        nextRun.notice = 'Навигационный сигнал потерян.'
      } else {
        const revealCount = getStarChartConfig(encounter.seed).revealedRooms
        const intel = run.rooms
          .filter((room) => !room.visited && !run.intelRoomIds.includes(room.id))
          .slice(0, revealCount)
          .map((room) => room.id)
        nextRun = { ...nextRun, intelRoomIds: [...run.intelRoomIds, ...intel], notice: `Звёздная карта раскрыла ${intel.length} отсека.` }
      }
    }

    set(getRunOutcome(nextRun, state, 'Корпус не выдержал повреждений'))
  },

  extract: () => {
    const state = get()
    const { run } = state
    if (!run || run.currentRoomId !== getShip(run.shipId).startRoomId || run.combat) return
    const visitedRoomIds = run.rooms.filter((room) => room.visited).map((room) => room.id)
    const resolvedRoomIds = run.rooms.filter((room) => room.resolved).map((room) => room.id)
    const completed = run.rooms.every((room) => room.visited)
    const shipCompletedNow = completed && !state.shipProgress[run.shipId].completed
    const rewardAvailable = shipCompletedNow && !state.claimedCompletionRewards.includes(run.shipId)
    const completionReward = rewardAvailable ? getShip(run.shipId).completionReward : 0
    set({
      screen: 'result',
      bankedScrap: state.bankedScrap + run.scrap + completionReward,
      claimedCompletionRewards: rewardAvailable
        ? [...state.claimedCompletionRewards, run.shipId]
        : state.claimedCompletionRewards,
      shipProgress: {
        ...state.shipProgress,
        [run.shipId]: { visitedRoomIds, resolvedRoomIds, completed },
      },
      result: {
        status: 'extracted',
        shipId: run.shipId,
        scrapBanked: run.scrap + completionReward,
        scrapFound: run.scrap,
        roomsExplored: run.roomsExplored,
        reason: shipCompletedNow
          ? run.shipId === FIRST_SHIP_ID ? 'Обнаружен маршрут к следующему объекту' : 'Промышленный контур полностью разведан'
          : 'Стыковка завершена',
        shipCompletedNow,
        completionReward,
      },
      run: null,
    })
  },

  purchaseUpgrade: (key) => {
    const state = get()
    const definition = upgrades.find((upgrade) => upgrade.key === key)
    if (!definition || (definition.unlockAfterFirstShip && !state.shipProgress[FIRST_SHIP_ID].completed)) return
    const level = state.upgrades[key]
    const price = definition.prices[level]
    if (price === undefined || state.bankedScrap < price) return
    set({ bankedScrap: state.bankedScrap - price, upgrades: { ...state.upgrades, [key]: level + 1 } })
  },

  buyTool: (key) => {
    const state = get()
    const definition = getToolDefinition(key)
    if (definition.unlockAfterFirstShip && !state.shipProgress[FIRST_SHIP_ID].completed) return
    if (state.tools[key].owned || state.bankedScrap < definition.price) return
    set({
      bankedScrap: state.bankedScrap - definition.price,
      tools: {
        ...state.tools,
        [key]: { owned: true, durability: getToolMaxDurability(key, state.upgrades.toolDurability) },
      },
    })
  },

  repairTool: (key) => {
    const state = get()
    const definition = getToolDefinition(key)
    const tool = state.tools[key]
    const maxDurability = getToolMaxDurability(key, state.upgrades.toolDurability)
    if (!tool.owned || tool.durability <= 0 || tool.durability >= maxDurability || state.bankedScrap < definition.repairCost) return
    set({
      bankedScrap: state.bankedScrap - definition.repairCost,
      tools: { ...state.tools, [key]: { ...tool, durability: tool.durability + 1 } },
    })
  },

  toggleLoadoutTool: (key) => {
    const state = get()
    const selected = state.loadout.includes(key)
    if (selected) {
      set({ loadout: state.loadout.filter((item) => item !== key) })
      return
    }
    if (state.loadout.length >= 2 || !state.tools[key].owned || state.tools[key].durability <= 0) return
    set({ loadout: [...state.loadout, key] })
  },

  clearNotice: () => {
    const run = get().run
    if (run) set({ run: { ...run, notice: null } })
  },

  clearTrapEvent: () => {
    const run = get().run
    if (run) set({ run: { ...run, trapEvent: null } })
  },

  resetProgress: () => set({
    screen: 'hangar',
    bankedScrap: DEFAULT_BANKED_SCRAP,
    upgrades: { ...DEFAULT_UPGRADES },
    tools: createDefaultTools(),
    loadout: ['mechanic'],
    claimedCompletionRewards: [],
    totalMoves: 0,
    movesUntilRandomEvent: randomEventDistance(),
    randomEventBag: [...randomEventKinds],
    shipProgress: createDefaultShipProgress(),
    run: null,
    result: null,
  }),
}), {
  name: 'cosmic-scavenger-progress',
  version: 4,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState, version) => {
    const state = persistedState as Partial<GameState>
    const defaults = createDefaultShipProgress()
    const oldUpgrades = state.upgrades as Partial<Record<UpgradeKey, number>> | undefined
    const oldScannerLevel = oldUpgrades?.scanner ?? 0
    const scannerRefund = version < 3 && oldScannerLevel > 1
      ? [28, 44].slice(0, oldScannerLevel - 1).reduce((sum, price) => sum + price, 0)
      : 0
    const shipProgress = {
      [FIRST_SHIP_ID]: { ...defaults[FIRST_SHIP_ID], ...state.shipProgress?.[FIRST_SHIP_ID] },
      [SECOND_SHIP_ID]: { ...defaults[SECOND_SHIP_ID], ...state.shipProgress?.[SECOND_SHIP_ID] },
    }
    const claimedCompletionRewards = state.claimedCompletionRewards ?? []
    const legacyCompletionReward = version < 3
      && shipProgress[FIRST_SHIP_ID].completed
      && !claimedCompletionRewards.includes(FIRST_SHIP_ID)
    return {
      ...state,
      bankedScrap: (state.bankedScrap ?? DEFAULT_BANKED_SCRAP) + scannerRefund + (legacyCompletionReward ? 50 : 0),
      upgrades: { ...DEFAULT_UPGRADES, ...oldUpgrades, scanner: Math.min(1, oldScannerLevel) },
      tools: { ...createDefaultTools(), ...state.tools },
      loadout: state.loadout ?? ['mechanic'],
      claimedCompletionRewards: legacyCompletionReward
        ? [...claimedCompletionRewards, FIRST_SHIP_ID]
        : claimedCompletionRewards,
      shipProgress,
      totalMoves: state.totalMoves ?? 0,
      movesUntilRandomEvent: state.movesUntilRandomEvent ?? randomEventDistance(),
      randomEventBag: state.randomEventBag ?? [...randomEventKinds],
    }
  },
  partialize: (state) => ({
    bankedScrap: state.bankedScrap,
    upgrades: state.upgrades,
    tools: state.tools,
    loadout: state.loadout,
    claimedCompletionRewards: state.claimedCompletionRewards,
    shipProgress: state.shipProgress,
    totalMoves: state.totalMoves,
    movesUntilRandomEvent: state.movesUntilRandomEvent,
    randomEventBag: state.randomEventBag,
  }),
}))
