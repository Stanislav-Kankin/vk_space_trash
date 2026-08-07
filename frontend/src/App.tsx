import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Icon20ArrowDownOutline,
  Icon20ArrowLeftOutline,
  Icon20ArrowRightOutline,
  Icon20ArrowUpOutline,
  Icon20CompassOutline,
  Icon20CubeBoxOutline,
  Icon20DoorArrowRightOutline,
  Icon20Flash,
  Icon20HelpOutline,
  Icon20ShieldLineOutline,
  Icon20WarningTriangleOutline,
  Icon20WrenchOutline,
  Icon24ChevronLeft,
  Icon24CompassOutline,
  Icon24CancelOutline,
  Icon24MuteOutline,
  Icon24Settings,
  Icon24VolumeOutline,
  Icon28Rocket,
} from '@vkontakte/icons'
import { AnimatePresence, motion } from 'motion/react'
import hangarImage from './assets/scavenger-hangar.webp'
import airlockImage from './assets/room-airlock.webp'
import cargoImage from './assets/room-cargo.webp'
import { roomCopy, START_ROOM_ID, upgrades } from './game/content'
import { getRoomState, useGameStore } from './game/store'
import type { ExpeditionRun, Room, RoomKind, UpgradeKey } from './game/types'
import './App.css'

const roomIcons: Record<RoomKind, ReactNode> = {
  start: <Icon20DoorArrowRightOutline />,
  empty: <span className="room-dot" />,
  storage: <Icon20CubeBoxOutline />,
  hazard: <Icon20WarningTriangleOutline />,
  enemy: <Icon20ShieldLineOutline />,
  repair: <Icon20WrenchOutline />,
}

const roomVisuals: Record<RoomKind, { image: string; eyebrow: string; title: string; body: string; alt: string }> = {
  start: {
    image: airlockImage,
    eyebrow: 'ТОЧКА ЭВАКУАЦИИ',
    title: 'Стыковочный шлюз',
    body: 'Герметичный переход к «Кобальту». Отсюда можно сохранить добычу и покинуть объект.',
    alt: 'Стыковочный шлюз с грузовой дверью и проходом в глубину корабля',
  },
  storage: {
    image: cargoImage,
    eyebrow: 'ГРУЗОВОЙ СЕКТОР',
    title: 'Герметичный склад',
    body: 'Погрузчик застыл посреди смены. За аварийными створками остался усиленный контейнер.',
    alt: 'Заброшенный грузовой отсек с контейнером под аварийными створками',
  },
  empty: {
    image: airlockImage,
    eyebrow: 'СЕРВИСНЫЙ СЕКТОР',
    title: 'Тихий переход',
    body: 'Системы молчат. По кабельным лоткам можно пройти в соседние отсеки.',
    alt: 'Пустой сервисный переход заброшенного корабля',
  },
  hazard: {
    image: airlockImage,
    eyebrow: 'НАРУШЕНИЕ ОБШИВКИ',
    title: 'Повреждённый коридор',
    body: 'Датчики отмечают падение давления и нестабильную переборку впереди.',
    alt: 'Повреждённый технический коридор заброшенного корабля',
  },
  repair: {
    image: cargoImage,
    eyebrow: 'ТЕХНИЧЕСКИЙ СЕКТОР',
    title: 'Ремонтный пост',
    body: 'Старая сервисная автоматика всё ещё отвечает на запросы бортовой сети.',
    alt: 'Ремонтный отсек с промышленным оборудованием',
  },
  enemy: {
    image: cargoImage,
    eyebrow: 'СИГНАТУРА ОХРАНЫ',
    title: 'Контролируемый отсек',
    body: 'Автоматическая защита объекта перешла в боевой режим.',
    alt: 'Тёмный отсек с активной системой охраны',
  },
}

const roomNames: Record<RoomKind, string> = {
  start: 'Стыковочный шлюз',
  empty: 'Тихий отсек',
  storage: 'Грузовой отсек',
  hazard: 'Опасный сектор',
  enemy: 'Сигнатура охраны',
  repair: 'Ремонтный пост',
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}

function LoadingScreen() {
  return (
    <main className="game-shell loading-screen" aria-label="Загрузка игры">
      <div className="loading-mark" aria-hidden="true">
        <span />
      </div>
      <p className="loading-kicker">СИСТЕМА СБОРА</p>
      <h1>Космический мусорщик</h1>
      <div className="loading-line"><span /></div>
      <p className="loading-status">Синхронизация шлюза</p>
    </main>
  )
}

function TopBar({ onSettings, sound, onSound }: { onSettings: () => void; sound: boolean; onSound: () => void }) {
  return (
    <header className="top-bar">
      <div className="call-sign">
        <span className="status-light" />
        <span>Борт К-17</span>
      </div>
      <div className="top-actions">
        <IconButton label={sound ? 'Выключить звук' : 'Включить звук'} onClick={onSound}>
          {sound ? <Icon24VolumeOutline /> : <Icon24MuteOutline />}
        </IconButton>
        <IconButton label="Настройки" onClick={onSettings}>
          <Icon24Settings />
        </IconButton>
      </div>
    </header>
  )
}

function HangarScreen({ onSettings, sound, onSound }: { onSettings: () => void; sound: boolean; onSound: () => void }) {
  const bankedScrap = useGameStore((state) => state.bankedScrap)
  const levels = useGameStore((state) => state.upgrades)
  const startRun = useGameStore((state) => state.startRun)
  const setScreen = useGameStore((state) => state.setScreen)
  const installed = Object.values(levels).reduce((sum, level) => sum + level, 0)

  return (
    <section className="screen hangar-screen" aria-label="Ангар">
      <TopBar onSettings={onSettings} sound={sound} onSound={onSound} />
      <div className="hangar-visual">
        <img src={hangarImage} alt="Потрёпанный корабль мусорщика в орбитальном ангаре" />
        <div className="hangar-shade" />
        <div className="hangar-title">
          <p>НЕЗАВИСИМЫЙ БОРТ</p>
          <h1>Космический<br />мусорщик</h1>
          <div className="ship-state"><span /> «Кобальт» готов к выходу</div>
        </div>
      </div>

      <div className="hangar-console">
        <div className="hangar-metrics" aria-label="Состояние ангара">
          <div><span>ЗАПАС</span><strong>{bankedScrap}</strong><small>лома</small></div>
          <div><span>МОДУЛИ</span><strong>{installed}</strong><small>уровней</small></div>
          <div><span>СЕКТОР</span><strong>07</strong><small>нестабилен</small></div>
        </div>
        <button className="primary-action launch-button" type="button" onClick={startRun}>
          <Icon28Rocket />
          <span><small>МАРШРУТ ГОТОВ</small>Начать вылазку</span>
        </button>
        <button className="secondary-action" type="button" onClick={() => setScreen('upgrades')}>
          <Icon20WrenchOutline /> Улучшения корабля
        </button>
      </div>
    </section>
  )
}

const upgradeIcons: Record<UpgradeKey, ReactNode> = {
  hull: <Icon20ShieldLineOutline />,
  battery: <Icon20Flash />,
  scanner: <Icon20CompassOutline />,
}

function UpgradesScreen() {
  const bankedScrap = useGameStore((state) => state.bankedScrap)
  const levels = useGameStore((state) => state.upgrades)
  const setScreen = useGameStore((state) => state.setScreen)
  const purchase = useGameStore((state) => state.purchaseUpgrade)

  return (
    <section className="screen upgrades-screen" aria-label="Улучшения корабля">
      <header className="panel-header">
        <IconButton label="Вернуться в ангар" onClick={() => setScreen('hangar')}><Icon24ChevronLeft /></IconButton>
        <div><span>МАСТЕРСКАЯ</span><h1>Модули корабля</h1></div>
        <div className="scrap-counter"><Icon20CubeBoxOutline /><strong>{bankedScrap}</strong></div>
      </header>

      <div className="upgrade-list">
        {upgrades.map((upgrade) => {
          const level = levels[upgrade.key]
          const price = upgrade.prices[level]
          const maxed = price === undefined
          const affordable = price !== undefined && bankedScrap >= price
          return (
            <article className="upgrade-card" key={upgrade.key}>
              <div className="upgrade-icon">{upgradeIcons[upgrade.key]}</div>
              <div className="upgrade-copy">
                <div className="upgrade-heading"><h2>{upgrade.name}</h2><span>УР. {level}/3</span></div>
                <p>{upgrade.description}</p>
                <div className="level-track" aria-label={`Уровень ${level} из 3`}>
                  {[1, 2, 3].map((step) => <span className={step <= level ? 'filled' : ''} key={step} />)}
                </div>
              </div>
              <button
                className="buy-button"
                type="button"
                disabled={maxed || !affordable}
                onClick={() => purchase(upgrade.key)}
              >
                {maxed ? 'МАКС.' : <><Icon20CubeBoxOutline /> {price}</>}
              </button>
            </article>
          )
        })}
      </div>
      <div className="workshop-note"><span /> Корпус подготовлен к следующей вылазке</div>
    </section>
  )
}

function ResourceBar({ run }: { run: ExpeditionRun }) {
  return (
    <div className="resource-bar" aria-label="Ресурсы экспедиции">
      <div className={run.hull <= 3 ? 'critical' : ''}>
        <Icon20ShieldLineOutline />
        <span>КОРПУС<strong>{run.hull}/{run.maxHull}</strong></span>
      </div>
      <div className={run.energy <= 3 ? 'warning' : ''}>
        <Icon20Flash />
        <span>ЭНЕРГИЯ<strong>{run.energy}/{run.maxEnergy}</strong></span>
      </div>
      <div>
        <Icon20CubeBoxOutline />
        <span>ДОБЫЧА<strong>{run.scrap}</strong></span>
      </div>
    </div>
  )
}

function RoomIcon({ room, reveal }: { room: Room; reveal: boolean }) {
  if (!reveal) return <Icon20HelpOutline />
  return roomIcons[room.kind]
}

function ShipMap({ run, locked, onMove }: { run: ExpeditionRun; locked: boolean; onMove?: () => void }) {
  const moveTo = useGameStore((state) => state.moveTo)
  const scannerLevel = useGameStore((state) => state.upgrades.scanner)
  const current = run.rooms.find((room) => room.id === run.currentRoomId)!
  const roomLookup = useMemo(() => new Map(run.rooms.map((room) => [`${room.y}:${room.x}`, room])), [run.rooms])

  return (
    <div className="map-wrap">
      <div className="map-caption"><span>ПАЛУБА 03</span><strong>{run.roomsExplored} отсеков исследовано</strong></div>
      <div className="ship-map" role="grid" aria-label="Карта заброшенного корабля">
        {Array.from({ length: 25 }, (_, index) => {
          const x = index % 5
          const y = Math.floor(index / 5)
          const room = roomLookup.get(`${y}:${x}`)
          if (!room) return <span className="map-void" key={`${y}:${x}`} aria-hidden="true" />
          const state = getRoomState(room, current)
          const isCurrent = room.id === run.currentRoomId
          const isAdjacent = Math.abs(room.x - current.x) + Math.abs(room.y - current.y) === 1
          const canMove = isAdjacent && !isCurrent && !locked && run.energy > 0
          const reveal = state === 'visited' || (state === 'available' && scannerLevel > 0) || room.kind === 'start'
          return (
            <button
              type="button"
              role="gridcell"
              key={room.id}
              className={`map-room ${state} ${isCurrent ? 'current' : ''} kind-${room.kind}`}
              data-room-id={room.id}
              disabled={!canMove}
              onClick={() => {
                moveTo(room.id)
                onMove?.()
              }}
              aria-label={isCurrent ? 'Текущий отсек' : canMove ? 'Перейти в соседний отсек' : 'Недоступный отсек'}
            >
              <RoomIcon room={room} reveal={reveal} />
              {isCurrent && <span className="position-pulse" />}
            </button>
          )
        })}
      </div>
      <div className="map-legend"><span><i className="legend-current" />Вы здесь</span><span><i className="legend-available" />Доступно</span></div>
    </div>
  )
}

const directionMeta = (current: Room, destination: Room) => {
  if (destination.x < current.x) return { label: 'Влево', icon: <Icon20ArrowLeftOutline /> }
  if (destination.x > current.x) return { label: 'Вправо', icon: <Icon20ArrowRightOutline /> }
  if (destination.y < current.y) return { label: 'Вперёд', icon: <Icon20ArrowUpOutline /> }
  return { label: 'Назад', icon: <Icon20ArrowDownOutline /> }
}

function RoomScene({ room, unresolved, onInteract }: { room: Room; unresolved: boolean; onInteract: () => void }) {
  const visual = roomVisuals[room.kind]
  const interactionLabels: Partial<Record<Room['kind'], string>> = {
    storage: 'Осмотреть контейнер',
    hazard: 'Проверить пробоину',
    repair: 'Подключиться к модулю',
  }
  const interactionLabel = interactionLabels[room.kind]

  return (
    <motion.section className={`location-stage location-${room.kind}`} key={room.id} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
      <img src={visual.image} alt={visual.alt} />
      <div className="location-shade" />
      <div className="location-code"><span /> ПАЛУБА 03 · СЕКТОР {room.id}</div>
      {unresolved && interactionLabel && (
        <button className="interest-point" type="button" onClick={onInteract} aria-label={interactionLabel}>
          <span className="interest-reticle">{roomIcons[room.kind]}</span>
          <span><small>СИГНАТУРА ОБНАРУЖЕНА</small><strong>{interactionLabel}</strong></span>
        </button>
      )}
      <div className="location-copy">
        <p>{visual.eyebrow}</p>
        <h2>{visual.title}</h2>
        <span>{visual.body}</span>
      </div>
    </motion.section>
  )
}

function RoomNavigation({ run, locked }: { run: ExpeditionRun; locked: boolean }) {
  const moveTo = useGameStore((state) => state.moveTo)
  const scannerLevel = useGameStore((state) => state.upgrades.scanner)
  const current = run.rooms.find((room) => room.id === run.currentRoomId)!
  const exits = run.rooms.filter((room) => Math.abs(room.x - current.x) + Math.abs(room.y - current.y) === 1)

  return (
    <div className="room-navigation">
      <div className="navigation-heading">
        <span>ДОСТУПНЫЕ ПЕРЕХОДЫ</span>
        <strong>{locked ? 'Осмотрите отсек' : 'Переход стоит 1 энергии'}</strong>
      </div>
      <div className={`exit-grid exits-${exits.length}`}>
        {exits.map((room) => {
          const direction = directionMeta(current, room)
          const known = room.visited || room.kind === 'start' || scannerLevel > 0
          return (
            <button
              type="button"
              key={room.id}
              data-destination-id={room.id}
              className={room.kind === 'storage' && !room.visited ? 'recommended-exit' : ''}
              disabled={locked || run.energy <= 0}
              onClick={() => moveTo(room.id)}
              aria-label={`Перейти: ${direction.label}, ${known ? roomNames[room.kind] : 'неизвестный отсек'}`}
            >
              {direction.icon}
              <span><strong>{direction.label}</strong><small>{known ? roomNames[room.kind] : 'Неизвестный отсек'}</small></span>
              <i>−1</i>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DeckMapSheet({ run, locked, onClose }: { run: ExpeditionRun; locked: boolean; onClose: () => void }) {
  return (
    <motion.div className="sheet-backdrop map-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section className="deck-map-sheet" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>НАВИГАЦИЯ</span><h2>Схема палубы</h2></div>
          <IconButton label="Закрыть схему" onClick={onClose}><Icon24CancelOutline /></IconButton>
        </header>
        <ShipMap run={run} locked={locked} onMove={onClose} />
      </motion.section>
    </motion.div>
  )
}

function RoomEvent({ room, run }: { room: Room; run: ExpeditionRun }) {
  const choose = useGameStore((state) => state.chooseRoomAction)
  if (room.kind !== 'storage' && room.kind !== 'hazard' && room.kind !== 'repair') return null
  const copy = roomCopy[room.kind]
  const primary = {
    storage: { label: 'Вскрыть контейнер', cost: '−2 энергии', disabled: run.energy < 2 },
    hazard: { label: 'Забрать ящик', cost: '−2 корпуса · +5 лома', disabled: false },
    repair: { label: 'Запустить ремонт', cost: '−2 лома · +3 корпуса', disabled: run.scrap < 2 || run.hull === run.maxHull },
  }[room.kind]
  const secondary = room.kind === 'hazard' ? 'Обойти переборку' : 'Оставить как есть'

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.section className={`event-sheet event-${room.kind}`} initial={{ y: 80 }} animate={{ y: 0 }}>
        <div className="sheet-handle" />
        <div className="event-symbol">{roomIcons[room.kind]}</div>
        <p className="event-eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p className="event-body">{copy.body}</p>
        <div className="event-actions">
          <button className="primary-action" type="button" disabled={primary.disabled} onClick={() => choose('primary')}>
            <span>{primary.label}<small>{primary.cost}</small></span>
          </button>
          <button className="secondary-action" type="button" onClick={() => choose('secondary')}>{secondary}</button>
        </div>
      </motion.section>
    </motion.div>
  )
}

function CombatSheet({ run }: { run: ExpeditionRun }) {
  const action = useGameStore((state) => state.combatAction)
  const combat = run.combat
  if (!combat) return null
  const intentDamage = combat.enemyIntent === 'charge' ? 3 : 2

  return (
    <motion.div className="combat-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="combat-header"><span>КОНТАКТ · РАУНД {combat.round}</span><strong>Охранный дрон</strong></div>
      <div className="enemy-stage">
        <div className="target-ring"><div className="drone-core"><span /></div></div>
        <div className="enemy-intent"><Icon20WarningTriangleOutline /><span>НАМЕРЕНИЕ<strong>Импульсный удар · {intentDamage}</strong></span></div>
      </div>
      <div className="combat-stats">
        <span>КОРПУС ДРОНА</span>
        <strong>{combat.enemyHull}/{combat.enemyMaxHull}</strong>
        <div><i style={{ width: `${(combat.enemyHull / combat.enemyMaxHull) * 100}%` }} /></div>
      </div>
      <div className="combat-actions">
        <button type="button" onClick={() => action('attack')}><Icon20WrenchOutline /><span>Атака<small>2 урона</small></span></button>
        <button type="button" onClick={() => action('defend')}><Icon20ShieldLineOutline /><span>Защита<small>Блок удара</small></span></button>
        <button type="button" disabled={run.energy < 2} onClick={() => action('overload')}><Icon20Flash /><span>Перегрузка<small>4 урона · −2</small></span></button>
      </div>
    </motion.div>
  )
}

function ExpeditionScreen() {
  const run = useGameStore((state) => state.run)
  const extract = useGameStore((state) => state.extract)
  const clearNotice = useGameStore((state) => state.clearNotice)
  const [mapOpen, setMapOpen] = useState(false)
  const [interactionOpen, setInteractionOpen] = useState(false)

  useEffect(() => {
    setInteractionOpen(false)
    setMapOpen(false)
  }, [run?.currentRoomId])

  if (!run) return null

  const currentRoom = run.rooms.find((room) => room.id === run.currentRoomId)!
  const unresolved = !currentRoom.resolved && currentRoom.kind !== 'enemy'
  const distanceToExit = Math.abs(currentRoom.x - 2) + Math.abs(currentRoom.y - 4)
  const locked = unresolved || Boolean(run.combat)
  const atExit = currentRoom.id === START_ROOM_ID

  return (
    <section className="screen expedition-screen" aria-label="Экспедиция">
      <header className="expedition-header">
        <div><span>ОБЪЕКТ 7-АЛЬФА</span><h1>Заброшенный транспорт</h1></div>
        <IconButton label="Открыть схему палубы" onClick={() => setMapOpen(true)}><Icon24CompassOutline /></IconButton>
      </header>
      <ResourceBar run={run} />
      <RoomScene room={currentRoom} unresolved={unresolved} onInteract={() => setInteractionOpen(true)} />
      <RoomNavigation run={run} locked={locked} />
      <div className="expedition-footer">
        <div className="risk-line"><span>ГЛУБИНА {Math.max(0, 4 - currentRoom.y)}</span><i /><strong>{run.energy <= 4 ? 'РИСК ВЫСОКИЙ' : 'РИСК УМЕРЕННЫЙ'}</strong></div>
        <button className="extract-button" type="button" disabled={!atExit || locked} onClick={extract}>
          <Icon20DoorArrowRightOutline />
          <span>{atExit ? 'Эвакуироваться' : `Шлюз через ${distanceToExit} сект.`}<small>{atExit ? 'Сохранить всю добычу' : 'Вернитесь в стартовый отсек'}</small></span>
        </button>
      </div>

      <AnimatePresence>
        {run.notice && !run.combat && (
          <motion.button className="notice" type="button" onClick={clearNotice} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span />{run.notice}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mapOpen && <DeckMapSheet run={run} locked={locked} onClose={() => setMapOpen(false)} />}
      </AnimatePresence>
      {interactionOpen && unresolved && <RoomEvent room={currentRoom} run={run} />}
      {run.combat && <CombatSheet run={run} />}
    </section>
  )
}

function ResultScreen() {
  const result = useGameStore((state) => state.result)
  const bankedScrap = useGameStore((state) => state.bankedScrap)
  const setScreen = useGameStore((state) => state.setScreen)
  if (!result) return null
  const success = result.status === 'extracted'

  return (
    <section className={`screen result-screen ${success ? 'success' : 'failure'}`} aria-label="Результат экспедиции">
      <div className="result-scan" aria-hidden="true"><Icon28Rocket /></div>
      <p className="result-eyebrow">{success ? 'СТЫКОВКА ПОДТВЕРЖДЕНА' : 'СИГНАЛ ПОТЕРЯН'}</p>
      <h1>{success ? 'Добыча доставлена' : 'Экспедиция сорвана'}</h1>
      <p className="result-reason">{result.reason}</p>
      <div className="result-total"><span>ЗАЧИСЛЕНО</span><strong>+{result.scrapBanked}</strong><small>лома</small></div>
      <div className="result-stats">
        <div><span>Найдено</span><strong>{result.scrapFound}</strong></div>
        <div><span>Отсеков</span><strong>{result.roomsExplored}</strong></div>
        <div><span>В запасе</span><strong>{bankedScrap}</strong></div>
      </div>
      <button className="primary-action" type="button" onClick={() => setScreen('hangar')}>Вернуться в ангар</button>
      <button className="secondary-action" type="button" onClick={() => setScreen('upgrades')}>Открыть мастерскую</button>
    </section>
  )
}

function SettingsSheet({ open, onClose, sound, onSound }: { open: boolean; onClose: () => void; sound: boolean; onSound: () => void }) {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.section className="settings-sheet" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>Системы борта</h2>
            <label><span>Звук интерфейса<small>Сигналы и подтверждения</small></span><input type="checkbox" checked={sound} onChange={onSound} /></label>
            <label><span>Меньше движения<small>Сократить анимации</small></span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
            <button className="secondary-action" type="button" onClick={onClose}>Готово</button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function App() {
  const [booted, setBooted] = useState(false)
  const [sound, setSound] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const screen = useGameStore((state) => state.screen)

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 850)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen])

  if (!booted) return <LoadingScreen />

  return (
    <main className="game-shell">
      <AnimatePresence mode="wait">
        <motion.div className="screen-frame" key={screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {screen === 'hangar' && <HangarScreen onSettings={() => setSettingsOpen(true)} sound={sound} onSound={() => setSound((value) => !value)} />}
          {screen === 'upgrades' && <UpgradesScreen />}
          {screen === 'expedition' && <ExpeditionScreen />}
          {screen === 'result' && <ResultScreen />}
        </motion.div>
      </AnimatePresence>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} sound={sound} onSound={() => setSound((value) => !value)} />
    </main>
  )
}

export default App
