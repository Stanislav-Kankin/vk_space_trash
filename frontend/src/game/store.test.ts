import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FIRST_SHIP_ID,
  SECOND_SHIP_ID,
  SECOND_SHIP_ROOM_COUNT,
  SECOND_START_ROOM_ID,
  SHIP_ROOM_COUNT,
  START_ROOM_ID,
} from './content'
import { SHIP_SURVEY_COMPLETE_NOTICE, useGameStore } from './store'

describe('mock expedition state', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useGameStore.setState(useGameStore.getInitialState(), true)
  })

  it('starts at the evacuation airlock with upgrade bonuses', () => {
    useGameStore.setState({ upgrades: { ...useGameStore.getState().upgrades, hull: 1, battery: 1 } })
    useGameStore.getState().startRun()

    const run = useGameStore.getState().run
    expect(run?.currentRoomId).toBe(START_ROOM_ID)
    expect(run?.previousRoomId).toBeNull()
    expect(run?.hull).toBe(12)
    expect(run?.energy).toBe(14)
  })

  it('migrates version 1 progress without losing scrap or upgrades', async () => {
    localStorage.setItem('cosmic-scavenger-progress', JSON.stringify({
      version: 1,
      state: {
        bankedScrap: 57,
        upgrades: { hull: 1, battery: 2, scanner: 0 },
      },
    }))

    await useGameStore.persist.rehydrate()
    const state = useGameStore.getState()
    expect(state.bankedScrap).toBe(57)
    expect(state.upgrades).toMatchObject({ hull: 1, battery: 2, scanner: 0 })
    expect(state.shipProgress[FIRST_SHIP_ID]).toEqual({
      visitedRoomIds: [START_ROOM_ID],
      resolvedRoomIds: [START_ROOM_ID],
      completed: false,
    })
  })

  it('converts the old scanner to one level and refunds removed levels', async () => {
    localStorage.setItem('cosmic-scavenger-progress', JSON.stringify({
      version: 2,
      state: {
        bankedScrap: 10,
        upgrades: { hull: 0, battery: 0, scanner: 3 },
      },
    }))

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().upgrades.scanner).toBe(1)
    expect(useGameStore.getState().bankedScrap).toBe(82)
  })

  it('allows only adjacent movement and spends one energy', () => {
    useGameStore.getState().startRun()
    useGameStore.getState().moveTo('0:1')
    expect(useGameStore.getState().run?.currentRoomId).toBe(START_ROOM_ID)

    useGameStore.getState().moveTo('4:1')
    expect(useGameStore.getState().run?.currentRoomId).toBe('4:1')
    expect(useGameStore.getState().run?.previousRoomId).toBe(START_ROOM_ID)
    expect(useGameStore.getState().run?.energy).toBe(11)
  })

  it('ends the run at zero energy outside the evacuation airlock and retains 25 percent of scrap', () => {
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({ run: { ...run, energy: 1, scrap: 7 } })

    useGameStore.getState().moveTo('4:1')

    const state = useGameStore.getState()
    expect(state.screen).toBe('result')
    expect(state.run).toBeNull()
    expect(state.result).toMatchObject({
      status: 'failed',
      scrapBanked: 1,
      scrapFound: 7,
      reason: 'Батарея разряжена вдали от шлюза',
      shipCompletedNow: false,
    })
    expect(state.bankedScrap).toBe(33)
  })

  it('allows evacuation after reaching the airlock on the last energy unit', () => {
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '4:1',
        energy: 1,
        rooms: run.rooms.map((room) => room.id === '4:1' ? { ...room, visited: true, resolved: true } : room),
      },
    })

    useGameStore.getState().moveTo(START_ROOM_ID)
    expect(useGameStore.getState().run?.energy).toBe(0)
    expect(useGameStore.getState().screen).toBe('expedition')

    useGameStore.getState().extract()
    expect(useGameStore.getState().result?.status).toBe('extracted')
  })

  it('uses the emergency capacitor once instead of ending the run', () => {
    useGameStore.setState({ upgrades: { ...useGameStore.getState().upgrades, emergencyCapacitor: 2 } })
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({ run: { ...run, energy: 1 } })

    useGameStore.getState().moveTo('4:1')

    expect(useGameStore.getState().screen).toBe('expedition')
    expect(useGameStore.getState().run).toMatchObject({ energy: 4, emergencyUsed: true })
    expect(useGameStore.getState().run?.notice).toContain('Аварийный конденсатор')
  })

  it('raises retained scrap with the cargo stabilizer', () => {
    useGameStore.setState({ upgrades: { ...useGameStore.getState().upgrades, cargoStabilizer: 5 } })
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({ run: { ...run, energy: 1, scrap: 8 } })

    useGameStore.getState().moveTo('4:1')

    expect(useGameStore.getState().result?.scrapBanked).toBe(4)
  })

  it('ends the run when bypassing a hazard consumes the last energy outside the airlock', () => {
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '3:2',
        energy: 1,
        rooms: run.rooms.map((room) => room.id === '3:2' ? { ...room, visited: true } : room),
      },
    })

    useGameStore.getState().chooseRoomAction('secondary')

    expect(useGameStore.getState().result).toMatchObject({
      status: 'failed',
      scrapBanked: 0,
      scrapFound: 0,
      reason: 'Батарея разряжена вдали от шлюза',
    })
  })

  it('rolls drone damage by intent and lets defense absorb two damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '1:1',
        combat: { enemyHull: 6, enemyMaxHull: 6, enemyIntent: 'charge', round: 2 },
      },
    })

    useGameStore.getState().combatAction('defend')
    expect(useGameStore.getState().run).toMatchObject({
      hull: 8,
      combat: { enemyHull: 6, enemyIntent: 'strike', round: 3 },
    })

    useGameStore.getState().combatAction('attack')
    expect(useGameStore.getState().run).toMatchObject({
      hull: 5,
      combat: { enemyHull: 4, enemyIntent: 'charge', round: 4 },
    })
  })

  it('refuses extraction away from the starting room', () => {
    useGameStore.getState().startRun()
    useGameStore.getState().moveTo('4:1')
    useGameStore.getState().extract()

    expect(useGameStore.getState().screen).toBe('expedition')
    expect(useGameStore.getState().result).toBeNull()
  })

  it('banks loot after returning to the starting room', () => {
    useGameStore.getState().startRun()
    useGameStore.getState().moveTo('4:1')
    useGameStore.getState().chooseRoomAction('primary')
    useGameStore.getState().moveTo(START_ROOM_ID)
    useGameStore.getState().extract()

    expect(useGameStore.getState().screen).toBe('result')
    expect(useGameStore.getState().result?.scrapBanked).toBe(4)
    expect(useGameStore.getState().bankedScrap).toBe(36)
  })

  it('saves surveyed rooms on extraction and restores them in the next expedition', () => {
    useGameStore.getState().startRun()
    useGameStore.getState().moveTo('4:1')
    useGameStore.getState().chooseRoomAction('primary')
    useGameStore.getState().moveTo(START_ROOM_ID)
    useGameStore.getState().extract()

    const saved = useGameStore.getState().shipProgress[FIRST_SHIP_ID]
    expect(saved.visitedRoomIds).toContain('4:1')
    expect(saved.resolvedRoomIds).toContain('4:1')
    expect(localStorage.getItem('cosmic-scavenger-progress')).toContain('4:1')

    useGameStore.getState().startRun()
    const restoredRoom = useGameStore.getState().run?.rooms.find((room) => room.id === '4:1')
    expect(restoredRoom).toMatchObject({ visited: true, resolved: true })
  })

  it('marks the first ship complete after every room is surveyed and evacuated', () => {
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: START_ROOM_ID,
        rooms: run.rooms.map((room) => ({ ...room, visited: true, resolved: true })),
      },
    })
    useGameStore.getState().extract()

    const progress = useGameStore.getState().shipProgress[FIRST_SHIP_ID]
    expect(progress.completed).toBe(true)
    expect(progress.visitedRoomIds).toHaveLength(SHIP_ROOM_COUNT)
    expect(useGameStore.getState().result?.shipCompletedNow).toBe(true)
    expect(useGameStore.getState().result?.reason).toBe('Обнаружен маршрут к следующему объекту')
    expect(useGameStore.getState().result?.completionReward).toBe(50)
    expect(useGameStore.getState().bankedScrap).toBe(82)

    useGameStore.getState().startRun()
    useGameStore.getState().extract()
    expect(useGameStore.getState().result?.shipCompletedNow).toBe(false)
    expect(useGameStore.getState().result?.completionReward).toBe(0)
  })

  it('unlocks the 6 by 6 industrial ship only after the first ship is complete', () => {
    useGameStore.getState().startRun(SECOND_SHIP_ID)
    expect(useGameStore.getState().run).toBeNull()

    useGameStore.setState({
      shipProgress: {
        ...useGameStore.getState().shipProgress,
        [FIRST_SHIP_ID]: { visitedRoomIds: [], resolvedRoomIds: [], completed: true },
      },
    })
    useGameStore.getState().startRun(SECOND_SHIP_ID)

    const run = useGameStore.getState().run
    expect(run?.currentRoomId).toBe(SECOND_START_ROOM_ID)
    expect(run?.rooms).toHaveLength(SECOND_SHIP_ROOM_COUNT)
    expect(new Set(run?.rooms.map((room) => room.x))).toHaveLength(6)
    expect(new Set(run?.rooms.map((room) => room.y))).toHaveLength(6)
  })

  it('resolves an industrial trap with d20 plus trap sense', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    useGameStore.setState({
      upgrades: { ...useGameStore.getState().upgrades, trapSense: 10 },
      shipProgress: {
        ...useGameStore.getState().shipProgress,
        [FIRST_SHIP_ID]: { visitedRoomIds: [], resolvedRoomIds: [], completed: true },
      },
    })
    useGameStore.getState().startRun(SECOND_SHIP_ID)
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '0:0',
        rooms: run.rooms.map((room) => room.id === '0:0' ? { ...room, visited: true, resolved: true } : room),
      },
    })

    useGameStore.getState().moveTo('0:1')

    const nextRun = useGameStore.getState().run
    expect(nextRun?.hull).toBe(10)
    expect(nextRun?.notice).toContain('d20 5 + чутьё 10 = 15 против 14')
    expect(nextRun?.notice).toContain('Урон предотвращён')
    expect(nextRun?.rooms.find((room) => room.id === '0:1')?.resolved).toBe(true)
  })

  it('uses an auxiliary tool with triple durability wear', () => {
    useGameStore.setState({
      bankedScrap: 100,
      shipProgress: {
        ...useGameStore.getState().shipProgress,
        [FIRST_SHIP_ID]: { visitedRoomIds: [], resolvedRoomIds: [], completed: true },
      },
    })
    useGameStore.getState().buyTool('laser')
    useGameStore.getState().toggleLoadoutTool('mechanic')
    useGameStore.getState().toggleLoadoutTool('laser')
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '4:1',
        rooms: run.rooms.map((room) => room.id === '4:1' ? { ...room, visited: true } : room),
      },
    })

    useGameStore.getState().chooseRoomAction('auxiliary')

    expect(useGameStore.getState().tools.laser.durability).toBe(17)
    expect(useGameStore.getState().run?.scrap).toBeGreaterThanOrEqual(2)
    expect(useGameStore.getState().run?.rooms.find((room) => room.id === '4:1')?.resolved).toBe(true)
  })

  it('breaks a tool, removes it from the loadout and sells a replacement', () => {
    useGameStore.setState({
      tools: { ...useGameStore.getState().tools, mechanic: { owned: true, durability: 1 } },
    })
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '4:1',
        rooms: run.rooms.map((room) => room.id === '4:1' ? { ...room, visited: true } : room),
      },
    })

    useGameStore.getState().chooseRoomAction('primary')
    expect(useGameStore.getState().tools.mechanic).toEqual({ owned: false, durability: 0 })
    expect(useGameStore.getState().loadout).not.toContain('mechanic')

    useGameStore.getState().buyTool('mechanic')
    expect(useGameStore.getState().tools.mechanic).toEqual({ owned: true, durability: 12 })
    expect(useGameStore.getState().bankedScrap).toBe(12)
  })

  it('repairs an intact tool one point at the configured price', () => {
    useGameStore.setState({
      tools: { ...useGameStore.getState().tools, mechanic: { owned: true, durability: 10 } },
    })

    useGameStore.getState().repairTool('mechanic')

    expect(useGameStore.getState().tools.mechanic.durability).toBe(11)
    expect(useGameStore.getState().bankedScrap).toBe(30)
  })

  it('adds up to three bonus scrap to salvage', () => {
    useGameStore.setState({ upgrades: { ...useGameStore.getState().upgrades, salvageBonus: 3 } })
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '4:1',
        rooms: run.rooms.map((room) => room.id === '4:1' ? { ...room, visited: true } : room),
      },
    })

    useGameStore.getState().chooseRoomAction('primary')
    expect(useGameStore.getState().run?.scrap).toBe(7)
  })

  it('keeps a jammed door passable only toward the previous room until opened', () => {
    useGameStore.setState({
      shipProgress: {
        ...useGameStore.getState().shipProgress,
        [FIRST_SHIP_ID]: { visitedRoomIds: [], resolvedRoomIds: [], completed: true },
      },
    })
    useGameStore.getState().startRun(SECOND_SHIP_ID)
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '1:0',
        previousRoomId: '2:0',
        rooms: run.rooms.map((room) => ['1:0', '2:0'].includes(room.id) ? { ...room, visited: true, resolved: room.id === '2:0' } : room),
      },
    })

    useGameStore.getState().moveTo('0:0')
    expect(useGameStore.getState().run?.currentRoomId).toBe('1:0')
    useGameStore.getState().moveTo('2:0')
    expect(useGameStore.getState().run?.currentRoomId).toBe('2:0')
    useGameStore.getState().moveTo('1:0')
    useGameStore.getState().chooseRoomAction('primary')
    expect(useGameStore.getState().run?.rooms.find((room) => room.id === '1:0')?.resolved).toBe(true)
    useGameStore.getState().moveTo('0:0')
    expect(useGameStore.getState().run?.currentRoomId).toBe('0:0')
  })

  it('notifies the player when the last unknown room is reached', () => {
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        rooms: run.rooms.map((room) => room.id === '4:3'
          ? { ...room, visited: false, resolved: false }
          : { ...room, visited: true, resolved: true }),
      },
    })

    useGameStore.getState().moveTo('4:3')

    expect(useGameStore.getState().run?.notice).toBe(SHIP_SURVEY_COMPLETE_NOTICE)
  })

  it('purchases an affordable permanent upgrade', () => {
    useGameStore.getState().purchaseUpgrade('battery')
    expect(useGameStore.getState().upgrades.battery).toBe(1)
    expect(useGameStore.getState().bankedScrap).toBe(22)
    expect(localStorage.getItem('cosmic-scavenger-progress')).toContain('"battery":1')
  })

  it('resets only the persisted alpha progress', () => {
    useGameStore.getState().purchaseUpgrade('battery')
    useGameStore.getState().startRun()
    useGameStore.getState().resetProgress()

    const state = useGameStore.getState()
    expect(state.screen).toBe('hangar')
    expect(state.bankedScrap).toBe(32)
    expect(state.upgrades).toMatchObject({ hull: 0, battery: 0, scanner: 0, trapSense: 0, salvageBonus: 0 })
    expect(state.tools.mechanic).toEqual({ owned: true, durability: 12 })
    expect(state.loadout).toEqual(['mechanic'])
    expect(state.shipProgress[FIRST_SHIP_ID]).toEqual({
      visitedRoomIds: [START_ROOM_ID],
      resolvedRoomIds: [START_ROOM_ID],
      completed: false,
    })
    expect(state.run).toBeNull()
  })
})
