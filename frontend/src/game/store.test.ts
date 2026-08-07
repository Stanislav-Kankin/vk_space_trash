import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIRST_SHIP_ID, SHIP_ROOM_COUNT, START_ROOM_ID } from './content'
import { SHIP_SURVEY_COMPLETE_NOTICE, useGameStore } from './store'

describe('mock expedition state', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useGameStore.setState(useGameStore.getInitialState(), true)
  })

  it('starts at the evacuation airlock with upgrade bonuses', () => {
    useGameStore.setState({ upgrades: { hull: 1, battery: 1, scanner: 0 } })
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
    expect(state.upgrades).toEqual({ hull: 1, battery: 2, scanner: 0 })
    expect(state.shipProgress[FIRST_SHIP_ID]).toEqual({
      visitedRoomIds: [START_ROOM_ID],
      resolvedRoomIds: [START_ROOM_ID],
      completed: false,
    })
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

  it('ends the run when a room action consumes the last energy outside the airlock', () => {
    useGameStore.getState().startRun()
    const run = useGameStore.getState().run!
    useGameStore.setState({
      run: {
        ...run,
        currentRoomId: '4:1',
        energy: 2,
        rooms: run.rooms.map((room) => room.id === '4:1' ? { ...room, visited: true } : room),
      },
    })

    useGameStore.getState().chooseRoomAction('primary')

    expect(useGameStore.getState().result).toMatchObject({
      status: 'failed',
      scrapBanked: 1,
      scrapFound: 4,
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
    useGameStore.getState().chooseRoomAction('secondary')
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

    useGameStore.getState().startRun()
    useGameStore.getState().extract()
    expect(useGameStore.getState().result?.shipCompletedNow).toBe(false)
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
    expect(state.upgrades).toEqual({ hull: 0, battery: 0, scanner: 0 })
    expect(state.shipProgress[FIRST_SHIP_ID]).toEqual({
      visitedRoomIds: [START_ROOM_ID],
      resolvedRoomIds: [START_ROOM_ID],
      completed: false,
    })
    expect(state.run).toBeNull()
  })
})
