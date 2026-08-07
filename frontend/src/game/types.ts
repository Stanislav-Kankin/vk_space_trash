export type Screen = 'hangar' | 'upgrades' | 'expedition' | 'result'

export type RoomKind = 'start' | 'empty' | 'storage' | 'hazard' | 'enemy' | 'repair'

export type RoomState = 'hidden' | 'available' | 'visited'

export interface Room {
  id: string
  x: number
  y: number
  kind: RoomKind
  visited: boolean
  resolved: boolean
}

export interface CombatState {
  enemyHull: number
  enemyMaxHull: number
  enemyIntent: 'strike' | 'charge'
  round: number
}

export interface ExpeditionRun {
  hull: number
  maxHull: number
  energy: number
  maxEnergy: number
  scrap: number
  roomsExplored: number
  currentRoomId: string
  rooms: Room[]
  combat: CombatState | null
  notice: string | null
}

export interface ExpeditionResult {
  status: 'extracted' | 'failed'
  scrapBanked: number
  scrapFound: number
  roomsExplored: number
  reason: string
}

export type UpgradeKey = 'hull' | 'battery' | 'scanner'

export interface UpgradeDefinition {
  key: UpgradeKey
  name: string
  description: string
  prices: readonly number[]
}
