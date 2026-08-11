import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Icon20ChevronRightOutline,
  Icon20CubeBoxOutline,
  Icon20Flash,
  Icon20HelpOutline,
  Icon20LockOutline,
  Icon20MessageOutline,
  Icon20PictureOutline,
  Icon20WrenchOutline,
  Icon24CancelOutline,
  Icon24CompassOutline,
} from '@vkontakte/icons'
import { motion } from 'motion/react'
import cargoImage from './assets/room-cargo.webp'
import coolingImage from './assets/hephaestus-cooling.jpg'
import controlImage from './assets/hephaestus-control.jpg'
import intakeImage from './assets/hephaestus-intake.jpg'
import galaxyImage from './assets/galaxy-sector-map.webp'
import repairImage from './assets/room-repair.webp'
import { gameAudio } from './audio'
import {
  MATCH_BOARD_SIZE,
  MATCH_MOVE_LIMIT,
  MATCH_RED_TARGET,
  createMatchBoard,
  resolveMatchMove,
  type MatchPoint,
  type MatchTile,
} from './game/matchThree'
import {
  getDigitalLockConfig,
  getPowerGridReward,
  getRadiationConfig,
  getStarChartConfig,
  getTabletScenario,
  seededInt,
} from './game/randomEvents'
import { useGameStore } from './game/store'
import type { RandomEncounter } from './game/types'
import './RandomEncounter.css'

const matchTileLabels: Record<MatchTile, string> = {
  button: 'Красная кнопка',
  chip: 'Зелёная микросхема',
  gear: 'Голубая шестерёнка',
  rock: 'Чёрный камень',
}

const matchTargetLabels: Record<MatchTile, string> = {
  button: 'красных кнопок',
  chip: 'зелёных микросхем',
  gear: 'голубых шестерёнок',
  rock: 'чёрных камней',
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="encounter-close" type="button" aria-label={label} onClick={onClick}><Icon24CancelOutline /></button>
}

function useTimers() {
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])
  return (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
  }
}

interface AnimatedMatchThreeProps {
  targetTile: MatchTile
  target: number
  moveLimit: number
  eyebrow: string
  title: string
  successText: string
  onClose: () => void
  onFinished: (success: boolean) => void
}

function AnimatedMatchThree({ targetTile, target, moveLimit, eyebrow, title, successText, onClose, onFinished }: AnimatedMatchThreeProps) {
  const [board, setBoard] = useState(() => createMatchBoard(Math.random, targetTile, target))
  const [selected, setSelected] = useState<MatchPoint | null>(null)
  const [movesLeft, setMovesLeft] = useState(moveLimit)
  const [collected, setCollected] = useState(0)
  const [message, setMessage] = useState('Поменяйте местами соседние элементы.')
  const [boardVersion, setBoardVersion] = useState(0)
  const [finished, setFinished] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [clearingTiles, setClearingTiles] = useState<Set<string>>(() => new Set())
  const [tileMotion, setTileMotion] = useState<{ x: number; y: number; fresh: boolean }[][] | null>(null)
  const animationTimers = useRef<number[]>([])

  useEffect(() => () => animationTimers.current.forEach((timer) => window.clearTimeout(timer)), [])

  const wait = (duration: number) => new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, duration)
    animationTimers.current.push(timer)
  })

  const finish = (success: boolean) => {
    setFinished(true)
    setMessage(success ? successText : 'Ходы закончились. Защита заблокирована.')
    const timer = window.setTimeout(() => onFinished(success), 1100)
    animationTimers.current.push(timer)
  }

  const selectTile = async (point: MatchPoint) => {
    if (finished || animating) return
    if (!selected) {
      setSelected(point)
      gameAudio.play('ui')
      return
    }
    if (selected.row === point.row && selected.column === point.column) {
      setSelected(null)
      return
    }

    const first = selected
    const result = resolveMatchMove(board, first, point, Math.random, targetTile)
    if (!result.valid) {
      setSelected(point)
      setMessage('Здесь нет линии из трёх. Выберите другой элемент.')
      gameAudio.play('ui')
      return
    }

    const nextMoves = movesLeft - 1
    const gained = result.clearedByTile[targetTile]
    const nextCollected = collected + gained
    const emptyMotion = () => board.map((row) => row.map(() => ({ x: 0, y: 0, fresh: false })))
    const swapMotion = emptyMotion()
    swapMotion[first.row][first.column] = { x: (point.column - first.column) * 44, y: (point.row - first.row) * 44, fresh: false }
    swapMotion[point.row][point.column] = { x: (first.column - point.column) * 44, y: (first.row - point.row) * 44, fresh: false }

    setAnimating(true)
    setMovesLeft(nextMoves)
    setSelected(null)
    setBoard(result.cascades[0].board)
    setTileMotion(swapMotion)
    setBoardVersion((version) => version + 1)
    setMessage('Контур перестраивает матрицу...')
    gameAudio.play('inspect')
    await wait(210)
    setTileMotion(null)

    let targetInCascades = 0
    for (let index = 0; index < result.cascades.length; index += 1) {
      const cascade = result.cascades[index]
      const matched = new Set(cascade.matches.map(({ row, column }) => `${row}:${column}`))
      targetInCascades += cascade.matches.filter(({ row, column }) => cascade.board[row][column] === targetTile).length
      setBoard(cascade.board)
      setClearingTiles(matched)
      setMessage(index === 0 ? 'Совпадение зафиксировано.' : `Каскад ${index + 1}: новые совпадения.`)
      gameAudio.play('inspect')
      await wait(420)

      setClearingTiles(new Set())
      setBoard(cascade.collapsedBoard)
      setTileMotion(cascade.fallOffsets.map((row, rowIndex) => row.map((offset, columnIndex) => ({
        x: 0,
        y: offset * 44,
        fresh: cascade.newTiles[rowIndex][columnIndex],
      }))))
      setBoardVersion((version) => version + 1)
      setCollected(collected + targetInCascades)
      await wait(390)
      setTileMotion(null)
    }

    if (result.reshuffled) {
      setBoard(result.board)
      setTileMotion(result.board.map((row) => row.map(() => ({ x: 0, y: -MATCH_BOARD_SIZE * 44, fresh: true }))))
      setBoardVersion((version) => version + 1)
      setMessage('Нет доступных целевых линий. Матрица перемешана.')
      await wait(420)
      setTileMotion(null)
    } else setBoard(result.board)

    setCollected(nextCollected)
    setAnimating(false)
    setMessage(gained > 0 ? `Целевых элементов: +${gained}` : `Собрано элементов: ${result.cleared}`)
    if (nextCollected >= target) finish(true)
    else if (nextMoves === 0) finish(false)
  }

  return (
    <motion.div className="match-three-screen" role="dialog" aria-modal="true" aria-labelledby="match-three-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="match-three-header">
        <div><span>{eyebrow}</span><h2 id="match-three-title">{title}</h2></div>
        <CloseButton label="Оставить модуль" onClick={onClose} />
      </header>
      <div className="match-three-mission">
        <div><span>ЦЕЛЬ</span><strong>{Math.min(collected, target)}/{target}</strong><small>{matchTargetLabels[targetTile]}</small></div>
        <div><span>ХОДЫ</span><strong>{movesLeft}</strong><small>осталось</small></div>
        <div className="match-three-colors" aria-label="Типы элементов">
          {(Object.keys(matchTileLabels) as MatchTile[]).map((tile) => <i className={`match-mini match-${tile} ${tile === targetTile ? 'target' : ''}`} key={tile} title={matchTileLabels[tile]} />)}
        </div>
      </div>
      <div className={`match-board ${animating ? 'animating' : ''}`} role="grid" aria-label="Сортировочная матрица семь на семь">
        {board.flatMap((row, rowIndex) => row.map((tile, columnIndex) => {
          const active = selected?.row === rowIndex && selected.column === columnIndex
          const clearing = clearingTiles.has(`${rowIndex}:${columnIndex}`)
          const motionState = tileMotion?.[rowIndex][columnIndex]
          return (
            <motion.button
              key={`${boardVersion}:${rowIndex}:${columnIndex}:${tile}`}
              className={`match-tile match-${tile} ${active ? 'selected' : ''} ${clearing ? 'clearing' : ''}`}
              type="button"
              role="gridcell"
              data-row={rowIndex}
              data-column={columnIndex}
              data-tile={tile}
              aria-label={`${matchTileLabels[tile]}, ряд ${rowIndex + 1}, колонка ${columnIndex + 1}`}
              aria-selected={active}
              disabled={finished || animating}
              onClick={() => { void selectTile({ row: rowIndex, column: columnIndex }) }}
              initial={{ x: motionState?.x ?? 0, y: motionState?.y ?? 0, opacity: motionState?.fresh ? 0.2 : 1 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={{ duration: motionState ? 0.34 : 0.12, ease: [0.22, 0.75, 0.25, 1] }}
            ><span /></motion.button>
          )
        }))}
      </div>
      <div className={`match-three-feedback ${finished ? 'finished' : ''}`} aria-live="polite">{message}</div>
      <p className="match-three-rule">Совпадение засчитывается по горизонтали или вертикали. Неудачная перестановка не тратит ход.</p>
    </motion.div>
  )
}

export function FixedMatchThreeEvent({ onClose }: { onClose: () => void }) {
  const completePuzzle = useGameStore((state) => state.completePuzzle)
  return (
    <AnimatedMatchThree
      targetTile="button"
      target={MATCH_RED_TARGET}
      moveLimit={MATCH_MOVE_LIMIT}
      eyebrow="АВАРИЙНАЯ СОРТИРОВКА"
      title="Соберите красные кнопки"
      successText="Кассета разблокирована. +15 лома."
      onClose={onClose}
      onFinished={(success) => { completePuzzle(success); onClose() }}
    />
  )
}

function EventScene({ className, image, eyebrow, title, onClose, children }: {
  className: string
  image: string
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <motion.section className={`random-event ${className}`} role="dialog" aria-modal="true" aria-labelledby="random-event-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <img className="random-event-background" src={image} alt="" />
      <div className="random-event-veil" />
      <header className="random-event-header"><div><span>{eyebrow}</span><h2 id="random-event-title">{title}</h2></div><CloseButton label="Оставить находку" onClick={onClose} /></header>
      <div className="random-event-content">{children}</div>
    </motion.section>
  )
}

function DigitalLockEvent({ encounter, onClose }: { encounter: RandomEncounter; onClose: () => void }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const config = getDigitalLockConfig(encounter.seed)
  return <AnimatedMatchThree targetTile={config.targetTile} target={config.target} moveLimit={config.moves} eyebrow="ЦИФРОВОЙ ЗАМОК" title={`Соберите ${matchTargetLabels[config.targetTile]}`} successText={`Модуль открыт. Внутри ${config.reward} лома.`} onClose={onClose} onFinished={(success) => resolve({ status: success ? 'success' : 'failure' })} />
}

function CrewTabletEvent({ encounter, onClose }: { encounter: RandomEncounter; onClose: () => void }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const scenario = getTabletScenario(encounter.seed)
  const [opened, setOpened] = useState<number[]>([])
  const [activeClue, setActiveClue] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [failed, setFailed] = useState(false)
  const schedule = useTimers()
  const clues = [scenario.message, scenario.photo, scenario.route]
  const clueIcons = [Icon20MessageOutline, Icon20PictureOutline, Icon24CompassOutline]
  const clueNames = ['Сообщения', 'Фотографии', 'Маршрут']

  const openClue = (index: number) => {
    setActiveClue(index)
    setOpened((current) => current.includes(index) ? current : [...current, index])
    gameAudio.play('ui')
  }

  const chooseLocation = (index: number) => {
    if (index === scenario.correctLocation) {
      setSolved(true)
      gameAudio.play('repair')
    } else {
      setFailed(true)
      gameAudio.play('hazard')
      schedule(() => resolve({ status: 'failure' }), 1200)
    }
  }

  return (
    <EventScene className="tablet-event" image={controlImage} eyebrow="ЛИЧНАЯ НАХОДКА" title="Планшет члена экипажа" onClose={onClose}>
      <div className="tablet-device">
        <div className="tablet-owner"><div className="crew-portrait"><span>{scenario.owner.split(' ').map((part) => part[0]).join('')}</span></div><div><small>{scenario.role}</small><strong>{scenario.owner}</strong><i>ПОСЛЕДНИЙ СЕАНС · 2187 ДНЕЙ</i></div></div>
        {!solved && !failed && <>
          <div className="tablet-apps">{clues.map((_, index) => {
            const ClueIcon = clueIcons[index]
            return <button className={opened.includes(index) ? 'opened' : ''} type="button" key={clueNames[index]} onClick={() => openClue(index)}><ClueIcon /><span>{clueNames[index]}</span></button>
          })}</div>
          <motion.div className="tablet-clue" key={activeClue ?? 'empty'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{activeClue === null ? 'Откройте хотя бы две записи и найдите тайник владельца.' : clues[activeClue]}</motion.div>
          {opened.length >= 2 && <div className="tablet-locations"><span>ГДЕ ОСТАЛСЯ ТАЙНИК?</span>{scenario.locations.map((location, index) => <button type="button" key={location} onClick={() => chooseLocation(index)}><Icon20ChevronRightOutline />{location}</button>)}</div>}
        </>}
        {failed && <div className="tablet-result failure"><Icon20Flash /><strong>Батарея разряжена</strong><span>Неверная точка исчерпала остаточный заряд.</span></div>}
        {solved && <div className="tablet-reward"><span>ТАЙНИК НАЙДЕН · ВЫБЕРИТЕ ДАННЫЕ</span><button type="button" onClick={() => resolve({ status: 'success', choice: 'scrap' })}><Icon20CubeBoxOutline /><strong>Личный тайник<small>{scenario.scrapReward} лома</small></strong></button><button type="button" onClick={() => resolve({ status: 'success', choice: 'intel' })}><Icon24CompassOutline /><strong>Служебная карта<small>раскрыть 3 отсека</small></strong></button><button type="button" onClick={() => resolve({ status: 'success', choice: 'code' })}><Icon20LockOutline /><strong>Код безопасности<small>обойти 1 ловушку</small></strong></button></div>}
      </div>
    </EventScene>
  )
}

function RadiationEvent({ encounter, onClose }: { encounter: RandomEncounter; onClose: () => void }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const config = getRadiationConfig(encounter.seed)
  const [activeRing, setActiveRing] = useState(0)
  const [results, setResults] = useState<(boolean | null)[]>([null, null, null])
  const [score, setScore] = useState(0)
  const startedAt = useRef(performance.now())
  const schedule = useTimers()

  const lockRing = (index: number) => {
    if (index !== activeRing || results[index] !== null) return
    const duration = config.durations[index]
    const angle = ((performance.now() - startedAt.current) % duration) / duration * 360
    const distance = Math.abs(((angle - config.safeCenters[index] + 540) % 360) - 180)
    const success = distance <= 48
    const nextScore = score + (success ? 1 : 0)
    const nextResults = [...results]
    nextResults[index] = success
    setResults(nextResults)
    setScore(nextScore)
    gameAudio.play(success ? 'repair' : 'hazard')
    if (index < 2) setActiveRing(index + 1)
    else schedule(() => resolve({ status: nextScore >= 3 ? 'success' : nextScore === 2 ? 'partial' : 'failure', score: nextScore }), 1300)
  }

  return (
    <EventScene className="radiation-event" image={coolingImage} eyebrow="ОПАСНАЯ ЗОНА" title="Калибровка защиты" onClose={onClose}>
      <div className="radiation-haze" aria-hidden="true"><i /><i /><i /></div>
      <p className="event-instruction">Остановите импульс внутри голубого сектора на каждом контуре.</p>
      <div className="radiation-rings">{results.map((result, index) => <button
        type="button"
        key={config.durations[index]}
        className={`${index === activeRing ? 'active' : ''} ${result === true ? 'locked success' : result === false ? 'locked failure' : ''}`}
        style={{ '--ring-duration': `${config.durations[index]}ms`, '--safe-angle': `${(config.safeCenters[index] + 332) % 360}deg` } as CSSProperties}
        disabled={index !== activeRing || result !== null}
        onClick={() => lockRing(index)}
        aria-label={`Зафиксировать контур ${index + 1}`}
      ><i className="safe-sector" /><i className="radiation-needle" /><span>{result === null ? `КОНТУР ${index + 1}` : result ? 'СТАБИЛЕН' : 'ПРОБОЙ'}</span></button>)}</div>
      <div className="radiation-meter"><span>ЗАЩИТА</span><div>{results.map((result, index) => <i key={index} className={result === true ? 'success' : result === false ? 'failure' : ''} />)}</div><strong>{score}/3</strong></div>
      <p className="event-stakes">3 попадания: контейнер с {config.reward} ломом · 2: безопасный проход · 0–1: −2 корпуса</p>
    </EventScene>
  )
}

type PowerTile = { type: 'straight' | 'corner' | 'junction'; solution: number; required: boolean }

const powerTiles: readonly PowerTile[] = [
  { type: 'corner', solution: 2, required: false }, { type: 'corner', solution: 1, required: true }, { type: 'corner', solution: 2, required: true },
  { type: 'straight', solution: 0, required: true }, { type: 'corner', solution: 3, required: true }, { type: 'corner', solution: 1, required: true },
  { type: 'junction', solution: 0, required: false }, { type: 'straight', solution: 1, required: false }, { type: 'corner', solution: 0, required: false },
]

function PowerGridEvent({ encounter, onClose }: { encounter: RandomEncounter; onClose: () => void }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const initialRotations = powerTiles.map((tile, index) => tile.required ? (tile.solution + 3) % 4 : seededInt(encounter.seed, 30 + index, 0, 3))
  const [rotations, setRotations] = useState(initialRotations)
  const [turns, setTurns] = useState(8)
  const [solved, setSolved] = useState(false)
  const [failed, setFailed] = useState(false)
  const schedule = useTimers()

  const rotate = (index: number) => {
    if (solved || failed || turns <= 0) return
    const next = [...rotations]
    next[index] = (next[index] + 1) % 4
    const nextTurns = turns - 1
    const complete = powerTiles.every((tile, tileIndex) => !tile.required || next[tileIndex] === tile.solution)
    setRotations(next)
    setTurns(nextTurns)
    gameAudio.play('ui')
    if (complete) {
      setSolved(true)
      gameAudio.play('repair')
    } else if (nextTurns === 0) {
      setFailed(true)
      gameAudio.play('hazard')
      schedule(() => resolve({ status: 'failure' }), 1200)
    }
  }

  return (
    <EventScene className={`power-event ${solved ? 'solved' : ''}`} image={repairImage} eyebrow="АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ" title="Замкните силовой контур" onClose={onClose}>
      <div className="power-status"><span>ОСТАЛОСЬ ПОВОРОТОВ</span><strong>{turns}</strong><i>{solved ? 'ЛИНИЯ СТАБИЛЬНА' : failed ? 'КОРОТКОЕ ЗАМЫКАНИЕ' : 'ПИТАНИЕ ОТКЛЮЧЕНО'}</i></div>
      <div className="power-grid" role="grid" aria-label="Силовая схема три на три">{powerTiles.map((tile, index) => <button type="button" role="gridcell" key={index} className={`${tile.type} ${tile.required ? 'required' : ''}`} disabled={solved || failed} onClick={() => rotate(index)} aria-label={`Повернуть сегмент ${index + 1}`}><i style={{ transform: `rotate(${rotations[index] * 90}deg)` }}><span /><b /></i></button>)}</div>
      {!solved && !failed && <p className="event-instruction">Поверните светящиеся сегменты и соедините вход слева с аккумулятором справа.</p>}
      {solved && <div className="power-reward"><span>КУДА НАПРАВИТЬ ЗАРЯД?</span><button type="button" onClick={() => resolve({ status: 'success', choice: 'energy' })}><Icon20Flash />В батарею<strong>+3 энергии</strong></button><button type="button" onClick={() => resolve({ status: 'success', choice: 'scrap' })}><Icon20WrenchOutline />Разобрать<strong>+{getPowerGridReward(encounter.seed)} лома</strong></button></div>}
    </EventScene>
  )
}

function CargoCraneEvent({ encounter, onClose }: { encounter: RandomEncounter; onClose: () => void }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState<'hit' | 'miss' | null>(null)
  const startedAt = useRef(performance.now())
  const schedule = useTimers()
  const duration = seededInt(encounter.seed, 41, 2900, 3500)

  const capture = () => {
    if (result || round >= 3) return
    const progress = ((performance.now() - startedAt.current) % duration) / duration
    const hit = progress >= 0.39 && progress <= 0.61
    const nextScore = score + (hit ? 1 : 0)
    setScore(nextScore)
    setResult(hit ? 'hit' : 'miss')
    gameAudio.play(hit ? 'repair' : 'hazard')
    schedule(() => {
      if (round === 2) resolve({ status: nextScore >= 2 ? 'success' : 'failure', score: nextScore })
      else {
        setRound((value) => value + 1)
        setResult(null)
        startedAt.current = performance.now()
      }
    }, 850)
  }

  return (
    <EventScene className="cargo-event" image={intakeImage} eyebrow="ГРУЗОВАЯ ЛИНИЯ" title="Магнитный захват" onClose={onClose}>
      <div className="crane-stage">
        <div className="crane-rail"><i /><span /></div>
        <div className="capture-zone"><Icon20Flash /><span>ЗОНА ЗАХВАТА</span></div>
        <motion.div className={`moving-cargo cargo-${round} ${result ?? ''}`} key={round} initial={{ left: '-18%' }} animate={{ left: '103%' }} transition={{ duration: duration / 1000, ease: 'linear', repeat: Infinity }}><Icon20CubeBoxOutline /><span>К-{round + 1}</span></motion.div>
        {result && <motion.strong className={`capture-result ${result}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{result === 'hit' ? 'ЗАХВАТ' : 'МИМО'}</motion.strong>}
      </div>
      <div className="cargo-score"><span>КОНТЕЙНЕР {Math.min(round + 1, 3)}/3</span><strong>{score} захвачено</strong></div>
      <button className="capture-button" type="button" disabled={Boolean(result)} onClick={capture}><Icon20Flash />Включить магнит</button>
      <p className="event-stakes">Нажмите, когда центр контейнера окажется в голубой зоне.</p>
    </EventScene>
  )
}

function StarChartEvent({ encounter, onClose }: { encounter: RandomEncounter; onClose: () => void }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const config = getStarChartConfig(encounter.seed)
  const [rotations, setRotations] = useState(config.targets.map((target) => (target + 3) % 4))
  const [turns, setTurns] = useState(6)
  const [solved, setSolved] = useState(false)
  const [failed, setFailed] = useState(false)
  const schedule = useTimers()

  const rotateLayer = (index: number) => {
    if (solved || failed || turns <= 0) return
    const next = [...rotations]
    next[index] = (next[index] + 1) % 4
    const nextTurns = turns - 1
    const complete = next.every((rotation, layer) => rotation === config.targets[layer])
    setRotations(next)
    setTurns(nextTurns)
    gameAudio.play('ui')
    if (complete) {
      setSolved(true)
      gameAudio.play('repair')
      schedule(() => resolve({ status: 'success', choice: 'intel' }), 1200)
    } else if (nextTurns === 0) {
      setFailed(true)
      gameAudio.play('hazard')
      schedule(() => resolve({ status: 'failure' }), 1200)
    }
  }

  return (
    <EventScene className={`star-event ${solved ? 'solved' : ''}`} image={galaxyImage} eyebrow="НАВИГАЦИОННЫЙ МОДУЛЬ" title="Звёздное совмещение" onClose={onClose}>
      <div className="star-scope" aria-label="Три слоя звёздной карты">{rotations.map((rotation, index) => <motion.div className={`star-layer layer-${index + 1}`} key={index} animate={{ rotate: rotation * 90 }} transition={{ duration: 0.35 }}><i /><i /><i /><i /><span /></motion.div>)}<div className="star-target"><Icon24CompassOutline /></div></div>
      <div className="star-controls">{rotations.map((rotation, index) => <button type="button" key={index} disabled={solved || failed} onClick={() => rotateLayer(index)}><span>СЛОЙ {index + 1}</span><strong>{rotation * 90}°</strong></button>)}</div>
      <div className="star-status"><span>ПОВОРОТЫ {turns}</span><strong>{solved ? `КАРТА СИНХРОНИЗИРОВАНА · ${config.revealedRooms} ОТСЕКА` : failed ? 'СИГНАЛ ПОТЕРЯН' : 'СОВМЕСТИТЕ МАРКЕРЫ С СЕВЕРОМ'}</strong></div>
    </EventScene>
  )
}

export function RandomEncounterOverlay({ encounter }: { encounter: RandomEncounter }) {
  const resolve = useGameStore((state) => state.resolveRandomEvent)
  const close = () => resolve({ status: 'skip' })
  if (encounter.kind === 'digital-lock') return <DigitalLockEvent encounter={encounter} onClose={close} />
  if (encounter.kind === 'crew-tablet') return <CrewTabletEvent encounter={encounter} onClose={close} />
  if (encounter.kind === 'radiation') return <RadiationEvent encounter={encounter} onClose={close} />
  if (encounter.kind === 'power-grid') return <PowerGridEvent encounter={encounter} onClose={close} />
  if (encounter.kind === 'cargo-crane') return <CargoCraneEvent encounter={encounter} onClose={close} />
  if (encounter.kind === 'star-chart') return <StarChartEvent encounter={encounter} onClose={close} />
  return <EventScene className="unknown-event" image={cargoImage} eyebrow="НЕИЗВЕСТНЫЙ СИГНАЛ" title="Находка потеряна" onClose={close}><Icon20HelpOutline /></EventScene>
}
