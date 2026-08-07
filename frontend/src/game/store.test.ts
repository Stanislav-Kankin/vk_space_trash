import { beforeEach, describe, expect, it } from 'vitest'
import { FIRST_SHIP_ID, SHIP_ROOM_COUNT, START_ROOM_ID } from './content'
import { useGameStore } from './store'

describe('mock expedition state', () => {
  beforeEach(() => {
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
