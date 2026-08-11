import { describe, expect, it } from 'vitest'
import {
  MATCH_BOARD_SIZE,
  createMatchBoard,
  findMatches,
  hasPossibleMove,
  hasPossibleRedMove,
  resolveMatchMove,
  type MatchTile,
} from './matchThree'

const testBoard: MatchTile[][] = [
  ['button', 'button', 'chip', 'gear', 'rock', 'chip', 'gear'],
  ['chip', 'gear', 'button', 'rock', 'chip', 'gear', 'rock'],
  ['gear', 'rock', 'chip', 'button', 'gear', 'rock', 'chip'],
  ['rock', 'chip', 'gear', 'chip', 'rock', 'button', 'gear'],
  ['button', 'gear', 'rock', 'gear', 'button', 'chip', 'rock'],
  ['chip', 'rock', 'button', 'rock', 'chip', 'gear', 'button'],
  ['gear', 'chip', 'rock', 'button', 'gear', 'rock', 'chip'],
]

describe('sorting matrix', () => {
  it('creates a playable 7 by 7 board without automatic matches', () => {
    const board = createMatchBoard(() => 0.42)
    expect(board).toHaveLength(MATCH_BOARD_SIZE)
    expect(board.every((row) => row.length === MATCH_BOARD_SIZE)).toBe(true)
    expect(findMatches(board)).toHaveLength(0)
    expect(hasPossibleMove(board)).toBe(true)
    expect(hasPossibleRedMove(board)).toBe(true)
  })

  it('does not consume an invalid swap', () => {
    const result = resolveMatchMove(testBoard, { row: 0, column: 0 }, { row: 1, column: 0 }, () => 0.6)
    expect(result.valid).toBe(false)
    expect(result.cleared).toBe(0)
    expect(result.board).toEqual(testBoard)
  })

  it('collects three red buttons after a valid adjacent swap', () => {
    const result = resolveMatchMove(testBoard, { row: 0, column: 2 }, { row: 1, column: 2 }, () => 0.7)
    expect(result.valid).toBe(true)
    expect(result.redCleared).toBeGreaterThanOrEqual(3)
    expect(result.cleared).toBeGreaterThanOrEqual(3)
    expect(result.cascades.length).toBeGreaterThanOrEqual(1)
    expect(result.cascades[0].matches).toHaveLength(3)
    expect(result.cascades[0].fallOffsets.some((row) => row.some((offset) => offset < 0))).toBe(true)
  })
})
