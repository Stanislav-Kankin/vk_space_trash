export const MATCH_BOARD_SIZE = 7
export const MATCH_MOVE_LIMIT = 5
export const MATCH_RED_TARGET = 15

export type MatchTile = 'button' | 'chip' | 'gear' | 'rock'

export interface MatchPoint {
  row: number
  column: number
}

export interface MatchMoveResult {
  board: MatchTile[][]
  valid: boolean
  cleared: number
  redCleared: number
}

const tileTypes: readonly MatchTile[] = ['button', 'chip', 'gear', 'rock']

const randomTile = (random: () => number, excluded: readonly MatchTile[] = []) => {
  const choices = tileTypes.filter((tile) => !excluded.includes(tile))
  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length))
  return choices[Math.max(0, index)]
}

const cloneBoard = (board: readonly (readonly MatchTile[])[]) => board.map((row) => [...row])

export const findMatches = (board: readonly (readonly MatchTile[])[]): MatchPoint[] => {
  const matches = new Set<string>()

  for (let row = 0; row < MATCH_BOARD_SIZE; row += 1) {
    for (let column = 0; column < MATCH_BOARD_SIZE;) {
      const tile = board[row][column]
      let end = column + 1
      while (end < MATCH_BOARD_SIZE && board[row][end] === tile) end += 1
      if (end - column >= 3) {
        for (let current = column; current < end; current += 1) matches.add(`${row}:${current}`)
      }
      column = end
    }
  }

  for (let column = 0; column < MATCH_BOARD_SIZE; column += 1) {
    for (let row = 0; row < MATCH_BOARD_SIZE;) {
      const tile = board[row][column]
      let end = row + 1
      while (end < MATCH_BOARD_SIZE && board[end][column] === tile) end += 1
      if (end - row >= 3) {
        for (let current = row; current < end; current += 1) matches.add(`${current}:${column}`)
      }
      row = end
    }
  }

  return [...matches].map((key) => {
    const [row, column] = key.split(':').map(Number)
    return { row, column }
  })
}

const swap = (board: readonly (readonly MatchTile[])[], first: MatchPoint, second: MatchPoint) => {
  const next = cloneBoard(board)
  ;[next[first.row][first.column], next[second.row][second.column]] = [next[second.row][second.column], next[first.row][first.column]]
  return next
}

export const areAdjacent = (first: MatchPoint, second: MatchPoint) =>
  Math.abs(first.row - second.row) + Math.abs(first.column - second.column) === 1

export const hasPossibleMove = (board: readonly (readonly MatchTile[])[]) => {
  for (let row = 0; row < MATCH_BOARD_SIZE; row += 1) {
    for (let column = 0; column < MATCH_BOARD_SIZE; column += 1) {
      const point = { row, column }
      const neighbours = [{ row, column: column + 1 }, { row: row + 1, column }]
      for (const neighbour of neighbours) {
        if (neighbour.row >= MATCH_BOARD_SIZE || neighbour.column >= MATCH_BOARD_SIZE) continue
        if (findMatches(swap(board, point, neighbour)).length > 0) return true
      }
    }
  }
  return false
}

export const hasPossibleRedMove = (board: readonly (readonly MatchTile[])[]) => {
  for (let row = 0; row < MATCH_BOARD_SIZE; row += 1) {
    for (let column = 0; column < MATCH_BOARD_SIZE; column += 1) {
      const point = { row, column }
      const neighbours = [{ row, column: column + 1 }, { row: row + 1, column }]
      for (const neighbour of neighbours) {
        if (neighbour.row >= MATCH_BOARD_SIZE || neighbour.column >= MATCH_BOARD_SIZE) continue
        const swapped = swap(board, point, neighbour)
        if (findMatches(swapped).some((match) => swapped[match.row][match.column] === 'button')) return true
      }
    }
  }
  return false
}

export const createMatchBoard = (random: () => number = Math.random): MatchTile[][] => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const board: MatchTile[][] = []
    for (let row = 0; row < MATCH_BOARD_SIZE; row += 1) {
      const nextRow: MatchTile[] = []
      for (let column = 0; column < MATCH_BOARD_SIZE; column += 1) {
        const excluded: MatchTile[] = []
        if (column >= 2 && nextRow[column - 1] === nextRow[column - 2]) excluded.push(nextRow[column - 1])
        if (row >= 2 && board[row - 1][column] === board[row - 2][column]) excluded.push(board[row - 1][column])
        nextRow.push(randomTile(random, excluded))
      }
      board.push(nextRow)
    }
    const redCount = board.flat().filter((tile) => tile === 'button').length
    if (redCount >= MATCH_RED_TARGET && hasPossibleRedMove(board)) return board
  }

  return [
    ['button', 'chip', 'button', 'gear', 'rock', 'chip', 'gear'],
    ['chip', 'button', 'gear', 'rock', 'chip', 'gear', 'rock'],
    ['gear', 'button', 'rock', 'chip', 'gear', 'rock', 'chip'],
    ['rock', 'chip', 'button', 'gear', 'rock', 'chip', 'gear'],
    ['button', 'gear', 'chip', 'rock', 'button', 'gear', 'rock'],
    ['chip', 'rock', 'gear', 'button', 'chip', 'rock', 'button'],
    ['gear', 'chip', 'rock', 'gear', 'rock', 'button', 'chip'],
  ]
}

const collapse = (board: MatchTile[][], matches: readonly MatchPoint[], random: () => number) => {
  const removed = new Set(matches.map(({ row, column }) => `${row}:${column}`))
  const next = Array.from({ length: MATCH_BOARD_SIZE }, () => Array<MatchTile>(MATCH_BOARD_SIZE))

  for (let column = 0; column < MATCH_BOARD_SIZE; column += 1) {
    const remaining: MatchTile[] = []
    for (let row = MATCH_BOARD_SIZE - 1; row >= 0; row -= 1) {
      if (!removed.has(`${row}:${column}`)) remaining.push(board[row][column])
    }
    for (let row = MATCH_BOARD_SIZE - 1, index = 0; row >= 0; row -= 1, index += 1) {
      next[row][column] = remaining[index] ?? randomTile(random)
    }
  }

  return next
}

export const resolveMatchMove = (
  board: readonly (readonly MatchTile[])[],
  first: MatchPoint,
  second: MatchPoint,
  random: () => number = Math.random,
): MatchMoveResult => {
  if (!areAdjacent(first, second)) return { board: cloneBoard(board), valid: false, cleared: 0, redCleared: 0 }

  let next = swap(board, first, second)
  let matches = findMatches(next)
  if (matches.length === 0) return { board: cloneBoard(board), valid: false, cleared: 0, redCleared: 0 }

  let cleared = 0
  let redCleared = 0
  let cascades = 0
  while (matches.length > 0 && cascades < 12) {
    cleared += matches.length
    redCleared += matches.filter(({ row, column }) => next[row][column] === 'button').length
    next = collapse(next, matches, random)
    matches = findMatches(next)
    cascades += 1
  }

  if (!hasPossibleRedMove(next)) next = createMatchBoard(random)
  return { board: next, valid: true, cleared, redCleared }
}
