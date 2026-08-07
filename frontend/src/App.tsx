import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  Icon20LockOutline,
  Icon20ShieldLineOutline,
  Icon20WarningTriangleOutline,
  Icon20WrenchOutline,
  Icon24ChevronLeft,
  Icon24ArrowLeftOutline,
  Icon24ArrowRightOutline,
  Icon24CompassOutline,
  Icon24CancelOutline,
  Icon24MuteOutline,
  Icon24Settings,
  Icon24VolumeOutline,
  Icon28Rocket,
} from '@vkontakte/icons'
import { AnimatePresence, motion } from 'motion/react'
import hangarImage from './assets/scavenger-hangar.webp'
import galaxyMapImage from './assets/galaxy-sector-map.webp'
import airlockImage from './assets/room-airlock.webp'
import cargoImage from './assets/room-cargo.webp'
import enemyImage from './assets/room-enemy.webp'
import hazardImage from './assets/room-hazard.webp'
import repairImage from './assets/room-repair.webp'
import hephaestusControlImage from './assets/hephaestus-control.jpg'
import hephaestusCoolingImage from './assets/hephaestus-cooling.jpg'
import hephaestusFurnaceImage from './assets/hephaestus-furnace.jpg'
import hephaestusIntakeImage from './assets/hephaestus-intake.jpg'
import { gameAudio } from './audio'
import {
  FIRST_SHIP_ID,
  getShip,
  getShipRoomCount,
  getToolDefinition,
  getToolMaxDurability,
  roomCopy,
  salvageDefinitions,
  SECOND_SHIP_ID,
  toolDefinitions,
  upgrades,
} from './game/content'
import { getEnemyDamageRange, SHIP_SURVEY_COMPLETE_NOTICE, getRoomState, useGameStore } from './game/store'
import type { ExpeditionRun, Room, RoomKind, ShipId, ToolKey, UpgradeCategory, UpgradeKey } from './game/types'
import { setVKSwipeBack, VK_VISIBILITY_EVENT } from './vkRuntime'
import './App.css'

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || 'local'
const SOUND_PREFERENCE = 'cosmic-scavenger-sound'
const MOTION_PREFERENCE = 'cosmic-scavenger-reduced-motion'
const preloadUrls = [
  hangarImage,
  galaxyMapImage,
  airlockImage,
  cargoImage,
  enemyImage,
  hazardImage,
  repairImage,
  hephaestusControlImage,
  hephaestusCoolingImage,
  hephaestusFurnaceImage,
  hephaestusIntakeImage,
]

const readBooleanPreference = (key: string, fallback: boolean) => {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value === 'true'
  } catch {
    return fallback
  }
}

const writeBooleanPreference = (key: string, value: boolean) => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // The game remains usable when storage is unavailable in a private webview.
  }
}

const preloadImage = (url: string) => new Promise<void>((resolve) => {
  const image = new Image()
  image.onload = () => resolve()
  image.onerror = () => resolve()
  image.src = url
})

const roomIcons: Record<RoomKind, ReactNode> = {
  start: <Icon20DoorArrowRightOutline />,
  empty: <span className="room-dot" />,
  storage: <Icon20CubeBoxOutline />,
  hazard: <Icon20WarningTriangleOutline />,
  enemy: <Icon20ShieldLineOutline />,
  repair: <Icon20WrenchOutline />,
  debris: <Icon20Flash />,
  cargo: <Icon20CubeBoxOutline />,
  power: <Icon20Flash />,
  terminal: <Icon20CompassOutline />,
  vacuum: <Icon20ShieldLineOutline />,
  trap: <Icon20WarningTriangleOutline />,
  door: <Icon20LockOutline />,
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
    image: hazardImage,
    eyebrow: 'НАРУШЕНИЕ ОБШИВКИ',
    title: 'Рваная переборка',
    body: 'Локальная разгерметизация тянет обломки к пробоине. За ней остался сервисный ящик.',
    alt: 'Отсек с рваной переборкой и сервисным ящиком за пробоиной',
  },
  repair: {
    image: repairImage,
    eyebrow: 'ТЕХНИЧЕСКИЙ СЕКТОР',
    title: 'Ремонтный пост',
    body: 'Сервисная рама ещё держит давление и отвечает на запросы бортовой сети.',
    alt: 'Ремонтный отсек с сервисной рамой и диагностической консолью',
  },
  enemy: {
    image: enemyImage,
    eyebrow: 'ПОСТ ВНУТРЕННЕЙ ОХРАНЫ',
    title: 'Контрольный коридор',
    body: 'Сканирующая рамка ожила. Охранный дрон перекрыл дальнейший маршрут.',
    alt: 'Контрольный коридор с активным охранным дроном',
  },
  debris: {
    image: hephaestusFurnaceImage,
    eyebrow: 'ПЛАВИЛЬНЫЙ ЦЕХ',
    title: 'Спёкшийся техномусор',
    body: 'Высокая температура спрессовала обломки в плотный пласт редких сплавов.',
    alt: 'Плавильный цех с раскалёнными спрессованными обломками',
  },
  cargo: {
    image: hephaestusIntakeImage,
    eyebrow: 'КРАНОВАЯ ЛИНИЯ',
    title: 'Подвесной груз',
    body: 'Магнитная рама застыла над шахтой вместе с контейнером.',
    alt: 'Индустриальный грузовой отсек с магнитным краном',
  },
  power: {
    image: hephaestusControlImage,
    eyebrow: 'СИЛОВОЙ КОНТУР',
    title: 'Распределительный узел',
    body: 'Остаточный заряд держится в массивном промышленном модуле.',
    alt: 'Силовой распределительный узел промышленного корабля',
  },
  terminal: {
    image: hephaestusControlImage,
    eyebrow: 'АРХИВНЫЙ КОНТУР',
    title: 'Мёртвый терминал',
    body: 'Локальная память защищена старым промышленным шифром.',
    alt: 'Заброшенный центр управления с терминалами',
  },
  vacuum: {
    image: hephaestusCoolingImage,
    eyebrow: 'КОНТУР ДАВЛЕНИЯ',
    title: 'Вакуумный тайник',
    body: 'Иней выдаёт утечку вокруг герметичного контейнера.',
    alt: 'Холодная магистраль с вакуумным контейнером',
  },
  trap: {
    image: hephaestusCoolingImage,
    eyebrow: 'НЕСТАБИЛЬНЫЙ КОНТУР',
    title: 'Замаскированная ловушка',
    body: 'Сенсоры фиксируют остаточный импульс в механизмах пола.',
    alt: 'Индустриальный коридор с опасным напольным механизмом',
  },
  door: {
    image: hephaestusIntakeImage,
    eyebrow: 'МАРШРУТ ЗАБЛОКИРОВАН',
    title: 'Заклинившие ворота',
    body: 'Промышленный привод перекошен и удерживает створки.',
    alt: 'Заклинившие промышленные ворота в грузовом секторе',
  },
}

const roomNames: Record<RoomKind, string> = {
  start: 'Стыковочный шлюз',
  empty: 'Тихий отсек',
  storage: 'Грузовой отсек',
  hazard: 'Опасный сектор',
  enemy: 'Сигнатура охраны',
  repair: 'Ремонтный пост',
  debris: 'Спёкшийся техномусор',
  cargo: 'Подвесной груз',
  power: 'Силовой модуль',
  terminal: 'Архивный терминал',
  vacuum: 'Вакуумный тайник',
  trap: 'Контур ловушки',
  door: 'Заклинившие ворота',
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
        <button className="primary-action launch-button" type="button" onClick={() => {
          gameAudio.play('launch')
          setScreen('starmap')
        }}>
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

function StarMapScreen() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const setScreen = useGameStore((state) => state.setScreen)
  const startRun = useGameStore((state) => state.startRun)
  const shipProgress = useGameStore((state) => state.shipProgress)
  const [selectedShipId, setSelectedShipId] = useState<ShipId>(FIRST_SHIP_ID)
  const firstShipComplete = shipProgress[FIRST_SHIP_ID].completed
  const selectedShip = getShip(selectedShipId)
  const progress = shipProgress[selectedShipId]
  const roomCount = getShipRoomCount(selectedShipId)
  const visitedCount = progress.visitedRoomIds.length
  const completion = Math.round((visitedCount / roomCount) * 100)

  const pan = (direction: -1 | 1) => {
    const viewport = viewportRef.current
    if (!viewport) return
    gameAudio.play('ui')
    viewport.scrollBy({ left: direction * Math.max(480, viewport.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <section className="screen star-map-screen" aria-label="Карта звёздного сектора">
      <header className="star-map-header">
        <IconButton label="Вернуться в ангар" onClick={() => setScreen('hangar')}><Icon24ChevronLeft /></IconButton>
        <div><span>НАВИГАЦИОННЫЙ КОНТУР</span><h1>Карта сектора</h1></div>
        <div className="sector-coordinates"><span>СЕКТОР</span><strong>07 / KSA</strong></div>
      </header>

      <div className="star-map-stage">
        <IconButton label="Сдвинуть карту влево" onClick={() => pan(-1)}><Icon24ArrowLeftOutline /></IconButton>
        <div className="star-map-viewport" ref={viewportRef}>
          <div className="star-map-canvas">
            <img src={galaxyMapImage} alt="Галактический сектор с туманностями и дальними звёздами" />
            <div className="star-map-shade" />
            <span className="sector-route route-alpha" aria-hidden="true" />
            <span className="sector-route route-beta" aria-hidden="true" />

            <button className={`ship-node node-alpha ${selectedShipId === FIRST_SHIP_ID ? 'active' : ''}`} type="button" onClick={() => setSelectedShipId(FIRST_SHIP_ID)} aria-label="Исследовать транспорт 7-Альфа">
              <span className="ship-node-signal"><Icon28Rocket /></span>
              <span className="ship-node-copy"><small>ДОСТУПЕН</small><strong>Транспорт 7-Альфа</strong><em>{shipProgress[FIRST_SHIP_ID].visitedRoomIds.length}/{getShipRoomCount(FIRST_SHIP_ID)} отсеков</em></span>
            </button>

            <button
              className={`ship-node node-beta ${firstShipComplete ? `route-detected ${selectedShipId === SECOND_SHIP_ID ? 'active' : ''}` : 'locked'}`}
              type="button"
              disabled={!firstShipComplete}
              onClick={() => setSelectedShipId(SECOND_SHIP_ID)}
              aria-label="Исследовать промышленный переработчик Гефест-9"
            >
              <span className="ship-node-signal">{firstShipComplete ? <Icon20WrenchOutline /> : <Icon20LockOutline />}</span>
              <span className="ship-node-copy"><small>{firstShipComplete ? 'МАРШРУТ ОТКРЫТ' : 'МАРШРУТ ЗАКРЫТ'}</small><strong>Гефест-9</strong><em>{firstShipComplete ? `${shipProgress[SECOND_SHIP_ID].visitedRoomIds.length}/${getShipRoomCount(SECOND_SHIP_ID)} отсеков` : 'Изучите первый объект'}</em></span>
            </button>

            <button className="ship-node locked node-gamma" type="button" disabled>
              <span className="ship-node-signal"><Icon20LockOutline /></span>
              <span className="ship-node-copy"><small>СИГНАЛ НЕ РАСШИФРОВАН</small><strong>Объект K-12</strong><em>Нет данных</em></span>
            </button>
          </div>
        </div>
        <IconButton label="Сдвинуть карту вправо" onClick={() => pan(1)}><Icon24ArrowRightOutline /></IconButton>
      </div>

      <footer className="star-map-selection">
        <div className="target-summary"><span>ВЫБРАННЫЙ ОБЪЕКТ</span><h2>{selectedShip.subtitle}</h2><p>{selectedShip.description}</p></div>
        <div className="survey-progress">
          <div><span>РАЗВЕДАНО</span><strong>{completion}%</strong></div>
          <div className="survey-track"><span style={{ width: `${completion}%` }} /></div>
          <small>{progress.completed ? 'ОБЪЕКТ ИЗУЧЕН' : `${visitedCount} ИЗ ${roomCount} ОТСЕКОВ`}</small>
        </div>
        <button className="primary-action dock-button" type="button" onClick={() => {
          gameAudio.play('launch')
          startRun(selectedShipId)
        }}><Icon28Rocket /><span><small>КАНАЛ СТАБИЛЕН</small>Стыковаться</span></button>
      </footer>
    </section>
  )
}

const upgradeIcons: Record<UpgradeKey, ReactNode> = {
  hull: <Icon20ShieldLineOutline />,
  battery: <Icon20Flash />,
  scanner: <Icon20CompassOutline />,
  trapSense: <Icon20WarningTriangleOutline />,
  salvageBonus: <Icon20CubeBoxOutline />,
  toolDurability: <Icon20WrenchOutline />,
  emergencyCapacitor: <Icon20Flash />,
  cargoStabilizer: <Icon20ShieldLineOutline />,
  shieldAmplifier: <Icon20ShieldLineOutline />,
}

const toolIcons: Record<ToolKey, ReactNode> = {
  mechanic: <Icon20WrenchOutline />,
  laser: <Icon20Flash />,
  grapple: <Icon20CubeBoxOutline />,
  diagnostic: <Icon20CompassOutline />,
  decoder: <Icon20LockOutline />,
  sealant: <Icon20ShieldLineOutline />,
}

type WorkshopTab = UpgradeCategory | 'tools'

function UpgradesScreen() {
  const bankedScrap = useGameStore((state) => state.bankedScrap)
  const levels = useGameStore((state) => state.upgrades)
  const tools = useGameStore((state) => state.tools)
  const loadout = useGameStore((state) => state.loadout)
  const firstShipComplete = useGameStore((state) => state.shipProgress[FIRST_SHIP_ID].completed)
  const setScreen = useGameStore((state) => state.setScreen)
  const purchase = useGameStore((state) => state.purchaseUpgrade)
  const buyTool = useGameStore((state) => state.buyTool)
  const repairTool = useGameStore((state) => state.repairTool)
  const toggleLoadoutTool = useGameStore((state) => state.toggleLoadoutTool)
  const [tab, setTab] = useState<WorkshopTab>('systems')
  const visibleUpgrades = upgrades.filter((upgrade) => upgrade.category === tab)

  return (
    <section className="screen upgrades-screen" aria-label="Улучшения корабля">
      <header className="panel-header">
        <IconButton label="Вернуться в ангар" onClick={() => setScreen('hangar')}><Icon24ChevronLeft /></IconButton>
        <div><span>МАСТЕРСКАЯ</span><h1>Модули корабля</h1></div>
        <div className="scrap-counter"><Icon20CubeBoxOutline /><strong>{bankedScrap}</strong></div>
      </header>

      <div className="workshop-tabs" role="tablist" aria-label="Разделы мастерской">
        <button className={tab === 'systems' ? 'active' : ''} type="button" onClick={() => setTab('systems')}>Модули</button>
        <button className={tab === 'skills' ? 'active' : ''} type="button" onClick={() => setTab('skills')}>Навыки</button>
        <button className={tab === 'tools' ? 'active' : ''} type="button" onClick={() => setTab('tools')}>Инструменты</button>
      </div>

      {tab !== 'tools' && <div className="upgrade-list">
        {visibleUpgrades.map((upgrade) => {
          const level = levels[upgrade.key]
          const price = upgrade.prices[level]
          const maxed = price === undefined
          const affordable = price !== undefined && bankedScrap >= price
          const locked = Boolean(upgrade.unlockAfterFirstShip && !firstShipComplete)
          const maxLevel = upgrade.prices.length
          return (
            <article className={`upgrade-card ${locked ? 'locked' : ''}`} key={upgrade.key}>
              <div className="upgrade-icon">{upgradeIcons[upgrade.key]}</div>
              <div className="upgrade-copy">
                <div className="upgrade-heading"><h2>{upgrade.name}</h2><span>УР. {level}/{maxLevel}</span></div>
                <p>{locked ? 'Откроется после исследования транспорта 7-Альфа' : upgrade.description}</p>
                <div className="level-track" style={{ gridTemplateColumns: `repeat(${maxLevel}, 1fr)` }} aria-label={`Уровень ${level} из ${maxLevel}`}>
                  {Array.from({ length: maxLevel }, (_, index) => index + 1).map((step) => <span className={step <= level ? 'filled' : ''} key={step} />)}
                </div>
              </div>
              <button
                className="buy-button"
                type="button"
                disabled={locked || maxed || !affordable}
                onClick={() => {
                  gameAudio.play('repair')
                  purchase(upgrade.key)
                }}
              >
                {locked ? <><Icon20LockOutline /> ЗАКРЫТО</> : maxed ? 'МАКС.' : <><Icon20CubeBoxOutline /> {price}</>}
              </button>
            </article>
          )
        })}
      </div>}

      {tab === 'tools' && <div className="tool-workshop">
        <div className="loadout-status"><span>КОМПЛЕКТ ЭКСПЕДИЦИИ</span><strong>{loadout.length}/2</strong><small>Снаряжение меняется только в ангаре</small></div>
        <div className="tool-list">
          {toolDefinitions.map((definition) => {
            const tool = tools[definition.key]
            const maxDurability = getToolMaxDurability(definition.key, levels.toolDurability)
            const selected = loadout.includes(definition.key)
            const locked = Boolean(definition.unlockAfterFirstShip && !firstShipComplete)
            const canRepair = tool.owned && tool.durability > 0 && tool.durability < maxDurability && bankedScrap >= definition.repairCost
            return (
              <article className={`tool-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`} key={definition.key}>
                <div className="upgrade-icon">{toolIcons[definition.key]}</div>
                <div className="tool-copy"><h2>{definition.name}</h2><p>{locked ? 'Откроется после первого корабля' : definition.description}</p></div>
                <div className="tool-durability"><span>ПРОЧНОСТЬ</span><strong>{tool.durability}/{maxDurability}</strong><i><b style={{ width: `${(tool.durability / maxDurability) * 100}%` }} /></i></div>
                <div className="tool-actions">
                  {tool.owned ? <>
                    <button type="button" disabled={tool.durability <= 0 || (!selected && loadout.length >= 2)} onClick={() => toggleLoadoutTool(definition.key)}>{selected ? 'Снять' : 'В комплект'}</button>
                    <button type="button" disabled={!canRepair} onClick={() => repairTool(definition.key)}>Починить +1 · {definition.repairCost}</button>
                  </> : <button type="button" disabled={locked || bankedScrap < definition.price} onClick={() => buyTool(definition.key)}><Icon20CubeBoxOutline /> Купить · {definition.price}</button>}
                </div>
              </article>
            )
          })}
        </div>
      </div>}
      <div className="workshop-note"><span /> Выбрано инструментов: {loadout.length} из 2</div>
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

function ShipMap({ run, locked, onMove }: { run: ExpeditionRun; locked: boolean; onMove: (roomId: string) => void }) {
  const scannerLevel = useGameStore((state) => state.upgrades.scanner)
  const ship = getShip(run.shipId)
  const current = run.rooms.find((room) => room.id === run.currentRoomId)!
  const doorBlocksForward = current.kind === 'door' && !current.resolved
  const roomLookup = useMemo(() => new Map(run.rooms.map((room) => [`${room.y}:${room.x}`, room])), [run.rooms])

  return (
    <div className="map-wrap">
      <div className="map-caption"><span>{ship.deckLabel}</span><strong>{run.roomsExplored} отсеков исследовано</strong></div>
      <div className={`ship-map grid-${ship.gridSize}`} role="grid" aria-label={`Карта корабля ${ship.name}`}>
        {Array.from({ length: ship.gridSize ** 2 }, (_, index) => {
          const x = index % ship.gridSize
          const y = Math.floor(index / ship.gridSize)
          const room = roomLookup.get(`${y}:${x}`)
          if (!room) return <span className="map-void" key={`${y}:${x}`} aria-hidden="true" />
          const state = getRoomState(room, current)
          const isCurrent = room.id === run.currentRoomId
          const isAdjacent = Math.abs(room.x - current.x) + Math.abs(room.y - current.y) === 1
          const canMove = isAdjacent
            && !isCurrent
            && !locked
            && run.energy > 0
            && (!doorBlocksForward || room.id === run.previousRoomId)
          const reveal = state === 'visited' || (state === 'available' && scannerLevel > 0) || room.kind === 'start'
          return (
            <button
              type="button"
              role="gridcell"
              key={room.id}
              className={`map-room ${state} ${isCurrent ? 'current' : ''} kind-${room.kind}`}
              data-room-id={room.id}
              disabled={!canMove}
              onClick={() => onMove(room.id)}
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

const sectorCode = (room: Room) => `${room.y + 1}-${room.x + 1}`

const directionMeta = (current: Room, destination: Room) => {
  if (destination.x < current.x) return { label: 'Левый борт', icon: <Icon20ArrowLeftOutline /> }
  if (destination.x > current.x) return { label: 'Правый борт', icon: <Icon20ArrowRightOutline /> }
  if (destination.y < current.y) return { label: 'К носу', icon: <Icon20ArrowUpOutline /> }
  return { label: 'К корме', icon: <Icon20ArrowDownOutline /> }
}

const hephaestusZoneImages = [
  hephaestusIntakeImage,
  hephaestusIntakeImage,
  hephaestusFurnaceImage,
  hephaestusFurnaceImage,
  hephaestusCoolingImage,
  hephaestusControlImage,
]

function RoomScene({ run, room, unresolved, onInteract }: { run: ExpeditionRun; room: Room; unresolved: boolean; onInteract: () => void }) {
  const ship = getShip(run.shipId)
  const baseVisual = roomVisuals[room.kind]
  const visual = run.shipId === SECOND_SHIP_ID
    ? {
        ...baseVisual,
        image: hephaestusZoneImages[room.y],
        eyebrow: room.eyebrow ?? baseVisual.eyebrow,
        title: room.title ?? baseVisual.title,
        body: room.description ?? baseVisual.body,
      }
    : baseVisual
  const interactionLabels: Partial<Record<Room['kind'], string>> = {
    storage: 'Осмотреть контейнер',
    hazard: 'Проверить пробоину',
    repair: 'Подключиться к модулю',
    debris: 'Осмотреть техномусор',
    cargo: 'Проверить подвесной груз',
    power: 'Осмотреть силовой модуль',
    terminal: 'Подключиться к архиву',
    vacuum: 'Осмотреть вакуумный тайник',
    door: 'Осмотреть заклинившие ворота',
  }
  const interactionLabel = interactionLabels[room.kind]

  return (
    <motion.section className={`location-stage location-${room.kind}`} key={room.id} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
      <img src={visual.image} alt={visual.alt} />
      <div className="location-shade" />
      <div className="location-code"><span /> {ship.deckLabel} · СЕКТОР {sectorCode(room)}</div>
      <div className="deck-bearing">НОС <Icon20ArrowUpOutline /></div>
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

function RoomNavigation({ run, locked, onTravel }: { run: ExpeditionRun; locked: boolean; onTravel: (roomId: string) => void }) {
  const scannerLevel = useGameStore((state) => state.upgrades.scanner)
  const current = run.rooms.find((room) => room.id === run.currentRoomId)!
  const previous = run.rooms.find((room) => room.id === run.previousRoomId)
  const exits = run.rooms.filter((room) => Math.abs(room.x - current.x) + Math.abs(room.y - current.y) === 1)
  const doorBlocksForward = current.kind === 'door' && !current.resolved

  return (
    <div className="room-navigation">
      <div className="route-context">
        <span>ПОСЛЕДНИЙ ПЕРЕХОД</span>
        <strong>{previous ? `СЕКТОР ${sectorCode(previous)} → СЕКТОР ${sectorCode(current)}` : `СТЫКОВКА → СЕКТОР ${sectorCode(current)}`}</strong>
      </div>
      <div className="navigation-heading">
        <span>ВЫХОДЫ ИЗ СЕКТОРА {sectorCode(current)}</span>
        <strong>{locked ? 'Осмотрите отсек' : 'Переход стоит 1 энергии'}</strong>
      </div>
      <div className={`exit-grid exits-${exits.length}`}>
        {exits.map((room) => {
          const direction = directionMeta(current, room)
          const known = room.visited || room.kind === 'start' || scannerLevel > 0
          const isReturn = room.id === run.previousRoomId
          const blockedByDoor = doorBlocksForward && !isReturn
          return (
            <button
              type="button"
              key={room.id}
              data-destination-id={room.id}
              className={isReturn ? 'return-exit' : ''}
              disabled={locked || run.energy <= 0 || blockedByDoor}
              onClick={() => onTravel(room.id)}
              aria-label={`Перейти: ${direction.label}, сектор ${sectorCode(room)}, ${known ? roomNames[room.kind] : 'неизвестный отсек'}${isReturn ? ', обратный путь' : ''}`}
            >
              {direction.icon}
              <span>
                <small>{direction.label} · {sectorCode(room)}</small>
                <strong>{blockedByDoor ? 'Сначала откройте ворота' : known ? roomNames[room.kind] : 'Неизвестный отсек'}</strong>
                {isReturn && <em>ОБРАТНЫЙ ПУТЬ</em>}
              </span>
              <i>−1</i>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DeckMapSheet({ run, locked, onClose, onTravel }: { run: ExpeditionRun; locked: boolean; onClose: () => void; onTravel: (roomId: string) => void }) {
  return (
    <motion.div className="sheet-backdrop map-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section className="deck-map-sheet" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>НАВИГАЦИЯ</span><h2>Схема палубы</h2></div>
          <IconButton label="Закрыть схему" onClick={onClose}><Icon24CancelOutline /></IconButton>
        </header>
        <ShipMap run={run} locked={locked} onMove={(roomId) => {
          onClose()
          onTravel(roomId)
        }} />
      </motion.section>
    </motion.div>
  )
}

function RoomEvent({ room, run, onClose }: { room: Room; run: ExpeditionRun; onClose: () => void }) {
  const choose = useGameStore((state) => state.chooseRoomAction)
  const tools = useGameStore((state) => state.tools)
  const loadout = run.equippedTools
  const salvage = salvageDefinitions[room.kind]
  if (!salvage && room.kind !== 'hazard' && room.kind !== 'repair') return null
  const copy = roomCopy[room.kind as keyof typeof roomCopy]
  const primaryTool = salvage ? getToolDefinition(salvage.primaryTool) : null
  const auxiliaryTool = salvage?.auxiliaryTool ? getToolDefinition(salvage.auxiliaryTool) : null
  const primaryAvailable = salvage
    ? loadout.includes(salvage.primaryTool) && tools[salvage.primaryTool].owned && tools[salvage.primaryTool].durability >= 1
    : room.kind === 'hazard' || (room.kind === 'repair' && run.scrap >= 2 && run.hull < run.maxHull)
  const auxiliaryAvailable = Boolean(
    salvage?.auxiliaryTool
    && loadout.includes(salvage.auxiliaryTool)
    && tools[salvage.auxiliaryTool].owned
    && tools[salvage.auxiliaryTool].durability >= 3,
  )

  const act = (choice: 'primary' | 'auxiliary' | 'secondary') => {
    choose(choice)
    onClose()
  }

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.section className={`event-sheet event-${room.kind}`} initial={{ y: 80 }} animate={{ y: 0 }}>
        <div className="sheet-handle" />
        <div className="event-symbol">{roomIcons[room.kind]}</div>
        <p className="event-eyebrow">{copy.eyebrow}</p>
        <h2>{room.title ?? copy.title}</h2>
        <p className="event-body">{room.description ?? copy.body}</p>
        <div className="event-actions">
          <button className="primary-action" type="button" disabled={!primaryAvailable} onClick={() => {
            gameAudio.play(room.kind === 'hazard' ? 'hazard' : room.kind === 'repair' ? 'repair' : 'inspect')
            act('primary')
          }}>
            <span>
              {salvage ? salvage.action : room.kind === 'hazard' ? 'Забрать ящик' : 'Запустить ремонт'}
              <small>{primaryTool ? `${primaryTool.name} · −1 прочности` : room.kind === 'hazard' ? '−2 корпуса' : '−2 лома · +3 корпуса'}</small>
            </span>
          </button>
          {salvage && auxiliaryTool && <button className="secondary-action tool-auxiliary" type="button" disabled={!auxiliaryAvailable} onClick={() => {
            gameAudio.play('inspect')
            act('auxiliary')
          }}>{salvage.action}<small>{auxiliaryTool.name} · −3 прочности</small></button>}
          <button className="secondary-action" type="button" onClick={() => {
            gameAudio.play('ui')
            if (salvage) onClose()
            else act('secondary')
          }}>{room.kind === 'hazard' ? 'Обойти переборку' : 'Оставить как есть'}</button>
        </div>
      </motion.section>
    </motion.div>
  )
}

function CombatSheet({ run }: { run: ExpeditionRun }) {
  const action = useGameStore((state) => state.combatAction)
  const shieldLevel = useGameStore((state) => state.upgrades.shieldAmplifier)
  const combat = run.combat
  if (!combat) return null
  const room = run.rooms.find((item) => item.id === run.currentRoomId)!
  const [intentMinDamage, intentMaxDamage] = getEnemyDamageRange(combat.enemyIntent)

  return (
    <motion.div className="combat-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <img className="combat-background" src={enemyImage} alt="Охранный дрон в контрольном коридоре" />
      <div className="combat-veil" />
      <div className="combat-header"><span>СЕКТОР {sectorCode(room)} · КОНТАКТ · РАУНД {combat.round}</span><strong>Охранный дрон</strong></div>
      <div className="enemy-stage">
        <div className="target-ring"><span className="target-lock" /></div>
        <div className="enemy-intent"><Icon20WarningTriangleOutline /><span>НАМЕРЕНИЕ<strong>Импульсный удар · {intentMinDamage}–{intentMaxDamage}</strong></span></div>
      </div>
      <div className="combat-stats">
        <span>КОРПУС ДРОНА</span>
        <strong>{combat.enemyHull}/{combat.enemyMaxHull}</strong>
        <div><i style={{ width: `${(combat.enemyHull / combat.enemyMaxHull) * 100}%` }} /></div>
      </div>
      <div className="combat-feedback" aria-live="polite">{run.notice ?? 'Дрон выбирает цель.'}</div>
      <div className="combat-actions">
        <button type="button" onClick={() => { gameAudio.play('attack'); action('attack') }}><Icon20WrenchOutline /><span>Атака<small>2 урона</small></span></button>
        <button type="button" onClick={() => { gameAudio.play('defend'); action('defend') }}><Icon20ShieldLineOutline /><span>Защита<small>−{2 + shieldLevel} входящего урона</small></span></button>
        <button type="button" disabled={run.energy < 2} onClick={() => { gameAudio.play('overload'); action('overload') }}><Icon20Flash /><span>Перегрузка<small>4 урона · −2</small></span></button>
      </div>
    </motion.div>
  )
}

type TravelState = {
  from: Room
  to: Room
  phase: 'closing' | 'opening'
}

function TransitOverlay({ travel }: { travel: TravelState }) {
  const direction = directionMeta(travel.from, travel.to)
  const closed = travel.phase === 'closing'

  return (
    <div className="transit-overlay" role="status" aria-label={`Переход в сектор ${sectorCode(travel.to)}`}>
      <motion.div
        className="bulkhead-panel bulkhead-top"
        initial={{ y: '-100%' }}
        animate={{ y: closed ? '0%' : '-100%' }}
        transition={{ duration: closed ? 0.3 : 0.4, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.div
        className="bulkhead-panel bulkhead-bottom"
        initial={{ y: '100%' }}
        animate={{ y: closed ? '0%' : '100%' }}
        transition={{ duration: closed ? 0.3 : 0.4, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.div className="transit-readout" initial={{ opacity: 0 }} animate={{ opacity: closed ? 1 : 0 }}>
        <span>{direction.icon} {direction.label}</span>
        <strong>СЕКТОР {sectorCode(travel.from)} → {sectorCode(travel.to)}</strong>
        <small>ГЕРМЕТИЗАЦИЯ ПЕРЕХОДА</small>
      </motion.div>
    </div>
  )
}

function ExpeditionScreen({ sound, onSound }: { sound: boolean; onSound: () => void }) {
  const run = useGameStore((state) => state.run)
  const moveTo = useGameStore((state) => state.moveTo)
  const extract = useGameStore((state) => state.extract)
  const clearNotice = useGameStore((state) => state.clearNotice)
  const [mapOpen, setMapOpen] = useState(false)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [travel, setTravel] = useState<TravelState | null>(null)
  const travelTimers = useRef<number[]>([])

  useEffect(() => {
    setInteractionOpen(false)
    setMapOpen(false)
  }, [run?.currentRoomId])

  useEffect(() => () => {
    travelTimers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  if (!run) return null

  const currentRoom = run.rooms.find((room) => room.id === run.currentRoomId)!
  const ship = getShip(run.shipId)
  const unresolved = !currentRoom.resolved && currentRoom.kind !== 'enemy'
  const startRoom = run.rooms.find((room) => room.id === ship.startRoomId)!
  const distanceToExit = Math.abs(currentRoom.x - startRoom.x) + Math.abs(currentRoom.y - startRoom.y)
  const locked = Boolean(run.combat) || Boolean(travel)
  const atExit = currentRoom.id === ship.startRoomId

  const requestTravel = (roomId: string) => {
    if (locked || run.energy <= 0) return
    if (currentRoom.kind === 'door' && !currentRoom.resolved && roomId !== run.previousRoomId) return
    const destination = run.rooms.find((room) => room.id === roomId)
    if (!destination) return

    travelTimers.current.forEach((timer) => window.clearTimeout(timer))
    gameAudio.play('door-close')
    setTravel({ from: currentRoom, to: destination, phase: 'closing' })
    travelTimers.current = [
      window.setTimeout(() => {
        moveTo(roomId)
        gameAudio.play('door-open')
        setTravel((current) => current ? { ...current, phase: 'opening' } : null)
      }, 310),
      window.setTimeout(() => setTravel(null), 740),
    ]
  }

  return (
    <section className="screen expedition-screen" aria-label="Экспедиция">
      <header className="expedition-header">
        <div><span>{ship.objectLabel}</span><h1>{ship.subtitle}</h1></div>
        <div className="expedition-actions">
          <IconButton label={sound ? 'Выключить звук' : 'Включить звук'} onClick={onSound}>
            {sound ? <Icon24VolumeOutline /> : <Icon24MuteOutline />}
          </IconButton>
          <IconButton label="Открыть схему палубы" onClick={() => { gameAudio.play('ui'); setMapOpen(true) }}><Icon24CompassOutline /></IconButton>
        </div>
      </header>
      <ResourceBar run={run} />
      <RoomScene run={run} room={currentRoom} unresolved={unresolved} onInteract={() => {
        gameAudio.play('inspect')
        setInteractionOpen(true)
      }} />
      <RoomNavigation run={run} locked={locked} onTravel={requestTravel} />
      <div className="expedition-footer">
        <div className="risk-line"><span>ГЛУБИНА {Math.max(0, 4 - currentRoom.y)}</span><i /><strong>{run.energy <= 4 ? 'РИСК ВЫСОКИЙ' : 'РИСК УМЕРЕННЫЙ'}</strong></div>
        <button className="extract-button" type="button" disabled={!atExit || locked} onClick={() => {
          gameAudio.play('extract')
          extract()
        }}>
          <Icon20DoorArrowRightOutline />
          <span>{atExit ? 'Эвакуироваться' : `Шлюз через ${distanceToExit} сект.`}<small>{atExit ? 'Сохранить всю добычу' : 'Вернитесь в стартовый отсек'}</small></span>
        </button>
      </div>

      <AnimatePresence>
        {run.notice && !run.combat && (
          <motion.button className={`notice ${run.notice === SHIP_SURVEY_COMPLETE_NOTICE ? 'survey-complete' : ''}`} type="button" onClick={clearNotice} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span />{run.notice}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mapOpen && <DeckMapSheet run={run} locked={locked} onClose={() => setMapOpen(false)} onTravel={requestTravel} />}
      </AnimatePresence>
      {interactionOpen && unresolved && <RoomEvent room={currentRoom} run={run} onClose={() => setInteractionOpen(false)} />}
      {run.combat && <CombatSheet run={run} />}
      {travel && <TransitOverlay travel={travel} />}
    </section>
  )
}

function ResultScreen() {
  const result = useGameStore((state) => state.result)
  const bankedScrap = useGameStore((state) => state.bankedScrap)
  const setScreen = useGameStore((state) => state.setScreen)
  if (!result) return null
  const success = result.status === 'extracted'
  const shipCompleted = result.shipCompletedNow
  const ship = getShip(result.shipId)

  return (
    <section className={`screen result-screen ${success ? 'success' : 'failure'}`} aria-label="Результат экспедиции">
      <div className="result-scan" aria-hidden="true"><Icon28Rocket /></div>
      <p className="result-eyebrow">{shipCompleted ? 'РАЗВЕДДАННЫЕ ЭВАКУИРОВАНЫ' : success ? 'СТЫКОВКА ПОДТВЕРЖДЕНА' : 'СИГНАЛ ПОТЕРЯН'}</p>
      <h1>{shipCompleted ? `${ship.name} изучен` : success ? 'Добыча доставлена' : 'Экспедиция сорвана'}</h1>
      <p className="result-reason">{result.reason}</p>
      {result.completionReward > 0 && <div className="completion-reward"><span>НАГРАДА ЗА ИССЛЕДОВАНИЕ</span><strong>+{result.completionReward} лома</strong><small>Открыты новые навыки, инструменты и маршрут к «Гефесту-9»</small></div>}
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

function SettingsSheet({
  open,
  onClose,
  sound,
  onSound,
  reducedMotion,
  onReducedMotion,
}: {
  open: boolean
  onClose: () => void
  sound: boolean
  onSound: () => void
  reducedMotion: boolean
  onReducedMotion: () => void
}) {
  const resetProgress = useGameStore((state) => state.resetProgress)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) setConfirmReset(false)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.section className="settings-sheet" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>Системы борта</h2>
            <label><span>Звук и атмосфера<small>Механизмы, сигналы и фон корабля</small></span><input type="checkbox" checked={sound} onChange={onSound} /></label>
            <label><span>Меньше движения<small>Сократить анимации</small></span><input type="checkbox" checked={reducedMotion} onChange={onReducedMotion} /></label>
            <button
              className={`reset-progress ${confirmReset ? 'confirm' : ''}`}
              type="button"
              onClick={() => {
                if (!confirmReset) {
                  gameAudio.play('ui')
                  setConfirmReset(true)
                  return
                }
                resetProgress()
                setConfirmReset(false)
                onClose()
              }}
            >
              {confirmReset ? 'Подтвердить сброс' : 'Сбросить альфа-прогресс'}
            </button>
            <div className="build-info"><span>ЗАКРЫТАЯ АЛЬФА</span><code>СБОРКА {BUILD_VERSION}</code></div>
            <button className="secondary-action" type="button" onClick={onClose}>Готово</button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function App() {
  const [booted, setBooted] = useState(false)
  const [sound, setSound] = useState(() => readBooleanPreference(SOUND_PREFERENCE, true))
  const [reducedMotion, setReducedMotion] = useState(() => readBooleanPreference(MOTION_PREFERENCE, false))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const screen = useGameStore((state) => state.screen)

  const toggleSound = () => {
    setSound((value) => {
      const next = !value
      writeBooleanPreference(SOUND_PREFERENCE, next)
      gameAudio.setEnabled(next)
      if (next) gameAudio.play('ui')
      return next
    })
  }

  const toggleReducedMotion = () => {
    setReducedMotion((value) => {
      const next = !value
      writeBooleanPreference(MOTION_PREFERENCE, next)
      return next
    })
  }

  useEffect(() => {
    let active = true
    const minimumDelay = new Promise<void>((resolve) => window.setTimeout(resolve, 650))
    const preloadTimeout = new Promise<void>((resolve) => window.setTimeout(resolve, 4_000))
    const preload = Promise.all(preloadUrls.map(preloadImage)).then(() => undefined)
    void Promise.all([minimumDelay, Promise.race([preload, preloadTimeout])]).then(() => {
      if (active) setBooted(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    void setVKSwipeBack(screen !== 'expedition')
  }, [screen])

  useEffect(() => {
    gameAudio.setEnabled(sound)
    document.documentElement.dataset.reduceMotion = reducedMotion ? 'true' : 'false'

    const syncAudio = (visible: boolean) => {
      if (visible && screen === 'expedition' && sound) gameAudio.startAmbience()
      else gameAudio.stopAmbience()
    }
    const handleDocumentVisibility = () => syncAudio(!document.hidden)
    const handleVKVisibility = (event: Event) => {
      syncAudio((event as CustomEvent<{ visible: boolean }>).detail.visible)
    }

    syncAudio(!document.hidden)
    document.addEventListener('visibilitychange', handleDocumentVisibility)
    window.addEventListener(VK_VISIBILITY_EVENT, handleVKVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleDocumentVisibility)
      window.removeEventListener(VK_VISIBILITY_EVENT, handleVKVisibility)
      gameAudio.stopAmbience()
    }
  }, [screen, sound, reducedMotion])

  if (!booted) return <LoadingScreen />

  return (
    <main className="game-shell">
      <AnimatePresence mode="wait">
        <motion.div className="screen-frame" key={screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {screen === 'hangar' && <HangarScreen onSettings={() => setSettingsOpen(true)} sound={sound} onSound={toggleSound} />}
          {screen === 'upgrades' && <UpgradesScreen />}
          {screen === 'starmap' && <StarMapScreen />}
          {screen === 'expedition' && <ExpeditionScreen sound={sound} onSound={toggleSound} />}
          {screen === 'result' && <ResultScreen />}
        </motion.div>
      </AnimatePresence>
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sound={sound}
        onSound={toggleSound}
        reducedMotion={reducedMotion}
        onReducedMotion={toggleReducedMotion}
      />
    </main>
  )
}

export default App
