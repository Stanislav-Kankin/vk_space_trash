export type Screen = 'hangar' | 'upgrades' | 'starmap' | 'expedition' | 'result'

export type ShipId = 'transport-7-alpha' | 'hephaestus-9'

export interface ShipProgress {
  visitedRoomIds: string[]
  resolvedRoomIds: string[]
  completed: boolean
}

export type ToolKey = 'mechanic' | 'laser' | 'grapple' | 'diagnostic' | 'decoder' | 'sealant'

export interface ToolState {
  owned: boolean
  durability: number
}

export type RoomKind =
  | 'start'
  | 'empty'
  | 'storage'
  | 'hazard'
  | 'enemy'
  | 'repair'
  | 'debris'
  | 'cargo'
  | 'power'
  | 'terminal'
  | 'vacuum'
  | 'trap'
  | 'door'
  | 'puzzle'

export type RoomState = 'hidden' | 'available' | 'visited'

export interface TrapDefinition {
  name: string
  difficulty: number
  effect: 'hull' | 'energy'
  damage: number
}

export interface Room {
  id: string
  x: number
  y: number
  kind: RoomKind
  visited: boolean
  resolved: boolean
  title?: string
  eyebrow?: string
  description?: string
  trap?: TrapDefinition
}

export interface CombatState {
  enemyHull: number
  enemyMaxHull: number
  enemyIntent: 'strike' | 'charge'
  round: number
  phase: 'player' | 'enemy'
  guard: number
}

export interface TrapEvent {
  id: string
  name: string
  triggered: boolean
  effect: 'hull' | 'energy'
  damage: number
  roll: number
  sense: number
  total: number
  difficulty: number
  bypassedByCode?: boolean
}

export type RandomEventKind =
  | 'digital-lock'
  | 'crew-tablet'
  | 'radiation'
  | 'power-grid'
  | 'cargo-crane'
  | 'star-chart'

export interface RandomEncounter {
  id: string
  kind: RandomEventKind
  seed: number
}

export interface RandomEventResolution {
  status: 'success' | 'partial' | 'failure' | 'skip'
  choice?: 'scrap' | 'energy' | 'intel' | 'code'
  score?: number
}

export interface ExpeditionRun {
  shipId: ShipId
  hull: number
  maxHull: number
  energy: number
  maxEnergy: number
  scrap: number
  roomsExplored: number
  currentRoomId: string
  previousRoomId: string | null
  rooms: Room[]
  equippedTools: ToolKey[]
  emergencyUsed: boolean
  intelRoomIds: string[]
  trapBypassCharges: number
  combat: CombatState | null
  trapEvent: TrapEvent | null
  randomEncounter: RandomEncounter | null
  notice: string | null
}

export interface ExpeditionResult {
  status: 'extracted' | 'failed'
  shipId: ShipId
  scrapBanked: number
  scrapFound: number
  roomsExplored: number
  reason: string
  shipCompletedNow: boolean
  completionReward: number
}

export type UpgradeKey =
  | 'hull'
  | 'battery'
  | 'scanner'
  | 'trapSense'
  | 'salvageBonus'
  | 'toolDurability'
  | 'emergencyCapacitor'
  | 'cargoStabilizer'
  | 'shieldAmplifier'

export type UpgradeCategory = 'systems' | 'skills'

export interface UpgradeDefinition {
  key: UpgradeKey
  category: UpgradeCategory
  name: string
  description: string
  prices: readonly number[]
  unlockAfterFirstShip?: boolean
}

export interface ToolDefinition {
  key: ToolKey
  name: string
  description: string
  price: number
  durability: number
  repairCost: number
  unlockAfterFirstShip?: boolean
}

export interface SalvageDefinition {
  primaryTool: ToolKey
  auxiliaryTool?: ToolKey
  minLoot: number
  maxLoot: number
  action: string
}

export interface ShipDefinition {
  id: ShipId
  name: string
  objectLabel: string
  subtitle: string
  description: string
  deckLabel: string
  gridSize: number
  startRoomId: string
  completionReward: number
}
