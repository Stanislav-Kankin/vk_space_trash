import { beforeEach, describe, expect, it } from 'vitest'
import { START_ROOM_ID } from './content'
import { useGameStore } from './store'

describe('mock expedition state', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState(), true)
  })

  it('starts at the evacuation airlock with upgrade bonuses', () => {
    useGameStore.setState({ upgrades: { hull: 1, battery: 1, scanner: 0 } })
    useGameStore.getState().startRun()

    const run = useGameStore.getState().run
    expect(run?.currentRoomId).toBe(START_ROOM_ID)
    expect(run?.hull).toBe(12)
    expect(run?.energy).toBe(14)
  })

  it('allows only adjacent movement and spends one energy', () => {
    useGameStore.getState().startRun()
    useGameStore.getState().moveTo('0:1')
    expect(useGameStore.getState().run?.currentRoomId).toBe(START_ROOM_ID)

    useGameStore.getState().moveTo('4:1')
    expect(useGameStore.getState().run?.currentRoomId).toBe('4:1')
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

  it('purchases an affordable permanent upgrade', () => {
    useGameStore.getState().purchaseUpgrade('battery')
    expect(useGameStore.getState().upgrades.battery).toBe(1)
    expect(useGameStore.getState().bankedScrap).toBe(22)
  })
})
