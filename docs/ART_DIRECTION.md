# Art Direction

## Visual character

Мир выглядит утилитарным и физически изношенным: ремонтные швы, царапины, старые панели, сервисная разметка и приборный свет. Корабль игрока должен восприниматься рабочим инструментом, а не военным супероружием.

## Palette

- Графит и почти чёрный: фон и глубина.
- Стальной серый: панели и конструкция.
- Циан: доступные действия и исправные системы.
- Янтарный: добыча, риск и важные решения.
- Красный: только критическая опасность и бой.
- Зелёный: подтверждённый успех и исправность.

Не использовать доминирующий фиолетовый, белые стеклянные карточки, эмодзи вместо иконок, чрезмерный неон и длинные декоративные анимации.

## Interface

Текущий отсек занимает основную часть экрана экспедиции. Интерактивные объекты привязаны к окружению, а доступные выходы вынесены в отдельную компактную навигацию под сценой. Схема палубы строится на DOM/CSS-сетке и открывается отдельным слоем; связи и более сложные элементы позднее могут использовать SVG. Интерфейс плотный, но читаемый: компактные заголовки, моноширинные системные подписи, крупные значения ресурсов и цели касания не меньше 44x44.

Фоновое изображение ангара сгенерировано специально для проекта встроенным image generation tool. Оно сохранено как `frontend/src/assets/scavenger-hangar.webp`.

Панорама карты сектора также сгенерирована специально для проекта и сохранена как `frontend/src/assets/galaxy-sector-map.webp`.

## Sector map asset prompt

```text
Use case: stylized-concept
Asset type: wide interactive star-map background for a sci-fi scavenger game UI
Primary request: a cinematic deep-space panorama showing a navigable star region with a dense galactic dust lane, distant nebulae, sparse stars, subtle planetary silhouettes, and faint wreckage fields
Style/medium: high-end realistic science-fiction concept art, matching a gritty industrial derelict-spaceship game, restrained and believable rather than colorful fantasy
Composition/framing: very wide landscape panorama, visual flow from left to right for horizontal panning, one brighter navigable region slightly left of center, two dim distant regions toward the right, generous dark negative space where UI ship nodes can sit
Lighting/mood: cold cyan starlight, small amber navigation glows, deep black space, ominous but inviting exploration
Color palette: charcoal black, steel blue, muted cyan, small amber accents; avoid purple-dominated palette
Constraints: background only, no interface, no labels, no text, no logos, no watermark, no large foreground spaceship, no decorative gradient blobs
```

## Hangar asset prompt

```text
Use case: stylized-concept
Asset type: mobile game hangar environment background
Primary request: an original deep-space salvage hangar belonging to an independent cosmic scavenger, with a compact battered utility spacecraft docked inside and a clearly visible open boarding ramp
Scene/backdrop: large industrial orbital hangar, worn bulkheads, service gantries, cables, storage crates, distant stars visible through a shielded aperture
Subject: the practical compact scavenger ship is the unmistakable focal point, visibly assembled from rugged modules, no resemblance to any existing science-fiction franchise
Style/medium: polished cinematic game environment concept art, grounded industrial realism
Composition/framing: vertical 9:16 mobile composition, wide-angle eye-level view, ship fully readable in the middle and upper area, quieter lower area suitable for overlaid game controls without hiding the ship
Lighting/mood: restrained cyan system lighting, warm amber maintenance lights, tiny red critical indicators only, crisp readable silhouettes, atmospheric depth without heavy fog
Color palette: dark graphite, steel gray, cyan, amber, small neutral white highlights; absolutely no purple
Materials/textures: scratched painted metal, worn steel, subtle dust and repair marks, practical mechanical detail
Constraints: show the actual hangar and spacecraft clearly; no people; no text; no logos; no watermark; no UI; original design only
Avoid: purple or blue-purple gradients, glossy cyberpunk neon, fantasy shapes, excessive darkness, blur, bokeh, lens flare, franchise references
```

## Room assets

Фоны стартового шлюза, грузового, аварийного, ремонтного и охранного отсеков сгенерированы специально для проекта встроенным image generation tool. Новые помещения используют шлюз и грузовой отсек как референсы общей архитектуры корабля. Рабочие файлы сохранены в `frontend/src/assets/room-*.webp`.

### Starting airlock prompt

```text
Use case: stylized-concept
Asset type: mobile game environment background, starting airlock location
Input images: Image 1 is a visual style reference for materials, lighting restraint, industrial realism, and the original game's world; do not copy its composition
Primary request: the interior of the starting boarding airlock on an abandoned orbital freight ship, seen from the cosmic scavenger's point of view immediately after docking
Scene/backdrop: a compact pressure vestibule opening into a larger dark service corridor, a clearly readable sealed cargo bulkhead door on one side and a maintenance passage on the other, practical pipes, pressure gauges without readable text, cable trays and worn floor tracks
Subject: the abandoned ship interior and its distinct navigable doorways; no spacecraft exterior
Style/medium: polished cinematic game environment art, grounded industrial science fiction realism, consistent with Image 1
Composition/framing: vertical 9:16 mobile composition, first-person eye-level wide angle, strong depth, navigable exits clearly separated, central middle area visually readable, lower quarter quieter for overlaid room title and controls
Lighting/mood: restrained cyan emergency systems, warm amber light at the cargo route, tiny red indicators only, tense but clearly visible, no heavy fog
Color palette: graphite, steel gray, oxidized metal, cyan, amber, neutral white; absolutely no purple
Materials/textures: scratched paint, dirty steel, worn rubber seals, repair welds, dust, chipped safety markings without letters
Constraints: actual location must be clearly inspectable; no people; no character hands; no text; no numbers; no logos; no watermark; no UI; original design only
Avoid: empty generic corridor, purple or blue-purple gradients, excessive neon, fantasy architecture, blur, bokeh, lens flare, franchise resemblance
```

### Cargo room prompt

```text
Use case: stylized-concept
Asset type: mobile game environment background, cargo room location
Input images: Image 1 is a visual style reference for materials, lighting restraint, industrial realism, and the original game's world; do not copy its composition
Primary request: a sealed cargo compartment inside an abandoned orbital freight ship, with one valuable reinforced salvage container visibly jammed behind half-open emergency shutters
Scene/backdrop: medium-sized cargo bay with stacked practical shipping crates, ceiling rails, damaged loading arm, side service door and the return bulkhead visible in the depth
Subject: the jammed reinforced container is the unmistakable interactable focal point, with readable physical space around it and clear exits
Style/medium: polished cinematic game environment art, grounded industrial science fiction realism, consistent with Image 1
Composition/framing: vertical 9:16 mobile composition, first-person eye-level wide angle, container prominent in the middle area but not filling the frame, exits visibly distinct, lower quarter quieter for overlaid event controls
Lighting/mood: cool cyan systems mixed with focused amber work light on the salvage container, cautious discovery mood, crisp silhouettes, minimal haze
Color palette: graphite, steel, faded off-white paint, cyan, amber, tiny red warning lights; absolutely no purple
Materials/textures: dented containers, scratched steel, dust, torn straps, hydraulic grease, chipped floor markings without letters
Constraints: show the actual cargo room clearly; no people; no character hands; no text; no numbers; no logos; no watermark; no UI; original design only
Avoid: warehouse on Earth, military armory, piles of gold, purple gradients, glossy cyberpunk neon, excessive darkness, blur, bokeh, lens flare, franchise resemblance
```

### Damaged compartment prompt

```text
Use case: stylized-concept
Asset type: mobile game environment background, damaged pressure-control compartment
Input images: Image 1 is the starting airlock and Image 2 is the adjacent cargo room from the same abandoned orbital freighter; preserve their exact industrial design language, doorway proportions, floor geometry, camera height, material wear, restrained lighting, and graphite/cyan/amber palette, but create a new connected compartment
Primary request: the next navigable room inside the same ship, a ruptured pressure-control compartment with a torn internal bulkhead and a valuable service case visible beyond the dangerous opening
Scene/backdrop: compact ship compartment connected by the same rounded rectangular bulkhead doors as the references, exposed pipes and cable trays continue naturally from adjacent rooms, buckled wall panels, one localized hull rupture sealed by a weak emergency field, loose straps and fine debris pulled toward it
Subject: the torn bulkhead and service case are the unmistakable interactable focal point; a return doorway and one onward doorway remain clearly readable
Style/medium: polished cinematic game environment art, grounded industrial science-fiction realism, coherent with both reference rooms
Composition/framing: vertical 9:16 mobile composition, first-person eye-level wide angle matching the references, strong central depth, focal hazard in the middle area, lower quarter quieter for overlaid title and controls
Lighting/mood: cold cyan emergency field around the rupture, warm amber utility light from the return route, sparse red warning indicators, tense but clearly inspectable, minimal haze
Color palette: graphite, oxidized steel, faded off-white paint, cyan, amber, tiny red warnings; absolutely no purple
Materials/textures: scratched paint, dirty steel, torn insulation, frost at pressure seams, repair welds, chipped nonverbal safety markings
Constraints: same fictional ship and same deck as both references; no exterior view dominating the image; no people; no character hands; no readable text; no numbers; no logos; no watermark; no UI; original design only
Avoid: unrelated architecture, Earth building, fantasy, glossy cyberpunk neon, purple gradients, excessive darkness, blur, bokeh, lens flare, franchise resemblance
```

### Repair module prompt

```text
Use case: stylized-concept
Asset type: mobile game environment background, ship repair module compartment
Input images: Image 1 is the starting airlock and Image 2 is the adjacent cargo room from the same abandoned orbital freighter; preserve their industrial design language, doorway proportions, floor geometry, camera height, material wear, restrained lighting, and graphite/cyan/amber palette, but create a new connected compartment
Primary request: the next navigable room inside the same ship, a compact automated hull-repair workshop whose old service station is still operational
Scene/backdrop: practical maintenance bay connected by the same rounded rectangular bulkhead doors as the references, wall-mounted articulated repair arms, hose reels, tool racks without readable labels, a central docking cradle and a rugged diagnostic console, pipes and floor tracks continue naturally from adjacent rooms
Subject: the repair station and its cyan-lit coupling socket are the unmistakable interactable focal point; a return doorway and one onward doorway remain clearly readable
Style/medium: polished cinematic game environment art, grounded industrial science-fiction realism, coherent with both reference rooms
Composition/framing: vertical 9:16 mobile composition, first-person eye-level wide angle matching the references, strong central depth, repair station in the middle area, lower quarter quieter for overlaid title and controls
Lighting/mood: stable cyan task lighting at the repair station, warm amber lamps marking the return route, tiny green operational indicators, calm mechanical refuge within a dangerous ship, clearly inspectable, minimal haze
Color palette: graphite, oxidized steel, faded off-white paint, cyan, amber, restrained green status lights; absolutely no purple
Materials/textures: scratched paint, dirty steel, hydraulic grease, worn rubber hoses, repair welds, chipped nonverbal safety markings
Constraints: same fictional ship and same deck as both references; no people; no robots shaped like characters; no character hands; no readable text; no numbers; no logos; no watermark; no UI; original design only
Avoid: unrelated laboratory, medical room, Earth garage, fantasy, glossy cyberpunk neon, purple gradients, excessive darkness, blur, bokeh, lens flare, franchise resemblance
```

### Security checkpoint prompt

```text
Use case: stylized-concept
Asset type: mobile game environment background, ship security checkpoint combat location
Input images: Image 1 is the starting airlock and Image 2 is the adjacent cargo room from the same abandoned orbital freighter; preserve their industrial design language, doorway proportions, floor geometry, camera height, material wear, restrained lighting, and graphite/cyan/amber palette, but create a new connected compartment
Primary request: the next navigable room inside the same ship, an abandoned internal security checkpoint where a compact automated guard drone has activated
Scene/backdrop: narrow checkpoint chamber connected by the same rounded rectangular bulkhead doors as the references, retractable barrier frames, damaged wall scanners, cargo inspection rails, exposed pipes and floor tracks continuing naturally from adjacent rooms
Subject: one small practical hovering security drone centered at medium distance with a single red sensor and utilitarian armored geometry, clearly readable against the room; return doorway visible behind or beside it
Style/medium: polished cinematic game environment art, grounded industrial science-fiction realism, coherent with both reference rooms
Composition/framing: vertical 9:16 mobile composition, first-person eye-level wide angle matching the references, drone centered in the upper-middle with generous dark readable space around it for combat overlays, lower quarter quieter for controls
Lighting/mood: restrained cyan checkpoint lighting, warm amber spill from the return route, focused red threat light only on the drone sensor, tense and clearly inspectable, minimal haze
Color palette: graphite, oxidized steel, faded off-white paint, cyan, amber, small red threat accents; absolutely no purple
Materials/textures: scratched paint, dirty steel, worn barriers, impact marks, repair welds, chipped nonverbal safety markings
Constraints: same fictional ship and same deck as both references; exactly one drone; no people; no character hands; no weapons firing; no readable text; no numbers; no logos; no watermark; no UI; original design only
Avoid: giant robot, humanoid robot, spaceship exterior, unrelated architecture, fantasy, glossy cyberpunk neon, purple gradients, excessive darkness, blur, bokeh, lens flare, franchise resemblance
```

## Hephaestus-9 assets

Четыре фона промышленного переработчика сгенерированы встроенным image generation tool и сохранены как `frontend/src/assets/hephaestus-*.jpg`. Они образуют единый набор приёмного сектора, плавильного цеха, охлаждения и центра управления.

### Receiving sector prompt

```text
Use case: stylized-concept
Asset type: mobile game location background for a VK sci-fi scavenging game
Primary request: interior of the receiving and sorting bay aboard an abandoned industrial recycling spaceship named Hephaestus-9
Scene/backdrop: a coherent 6x6-deck industrial ship zone, massive cargo conveyors, magnetic crane rails, battered sealed crates, jammed bulkhead doors, no people
Style/medium: cinematic photorealistic hard-surface science fiction concept art, grounded utilitarian spaceship architecture, same visual universe as a worn independent salvage ship
Composition/framing: portrait 2:3 game background, clear central depth corridor, useful lower area for title overlay, one inspectable cargo focal point near center, no UI
Lighting/mood: cold cyan work lights mixed with restrained amber hazard lamps, abandoned but readable, moderate contrast
Materials/textures: scratched steel, grease, cable trays, worn yellow safety markings, compact industrial machinery
Constraints: consistent real ship interior, no text, no letters, no logos, no watermark, no people, no fantasy elements, no visible interface, avoid overly dark image
```

### Smelting sector prompt

```text
Use case: stylized-concept
Asset type: mobile game location background for a VK sci-fi scavenging game
Primary request: abandoned smelting and thermal compaction chamber aboard the same industrial recycling spaceship Hephaestus-9
Scene/backdrop: towering furnace throat, hydraulic thermal press, piles of valuable techno-scrap fused by extreme heat into dense metallic wreckage, service catwalk and bulkhead exits
Style/medium: cinematic photorealistic hard-surface science fiction concept art, grounded utilitarian spaceship architecture
Composition/framing: portrait 2:3 game background, clear central machinery and fused debris focal point, readable floor path, useful lower area for title overlay, no UI
Lighting/mood: hot red furnace glow balanced by neutral work lights, hazardous but clearly readable, not monochrome orange
Materials/textures: scorched steel, oxidized machinery, glowing seams, blackened cable conduits, worn safety markings
Constraints: coherent with an industrial cargo spaceship, no text, no letters, no logos, no watermark, no people, no fantasy, no interface, avoid excessive darkness
```

### Cooling sector prompt

```text
Use case: stylized-concept
Asset type: mobile game location background for a VK sci-fi scavenging game
Primary request: abandoned cooling and pressure-control gallery aboard the same industrial recycling spaceship Hephaestus-9
Scene/backdrop: long machinery corridor with coolant manifolds, frost-covered pipes, leaking vapor, pressure doors, a dangerous floor vent trap and a sealed vacuum cache
Style/medium: cinematic photorealistic hard-surface science fiction concept art, grounded utilitarian spaceship architecture
Composition/framing: portrait 2:3 game background, strong corridor continuity, central pressure door, visible but not exaggerated floor hazard, useful lower area for title overlay, no UI
Lighting/mood: icy blue-white lights with a few amber warning lamps, cold mist, tense but readable
Materials/textures: frosted steel, condensation, pipe insulation, grated floor, worn safety markings
Constraints: coherent with the receiving and smelting zones of one ship, no text, no letters, no logos, no watermark, no people, no fantasy, no interface, avoid monochrome dark blue
```

### Control sector prompt

```text
Use case: stylized-concept
Asset type: mobile game location background for a VK sci-fi scavenging game
Primary request: abandoned control center and power-distribution chamber aboard the same industrial recycling spaceship Hephaestus-9
Scene/backdrop: rugged industrial command consoles, dead display walls, heavy switchgear, reactor diagnostics, encrypted archive terminal, branching bulkhead corridors
Style/medium: cinematic photorealistic hard-surface science fiction concept art, grounded utilitarian spaceship architecture
Composition/framing: portrait 2:3 game background, command terminal focal point in upper-middle, central walking path, useful lower area for title overlay, no UI graphics or readable text
Lighting/mood: muted green diagnostic glow, cold white ceiling lights, restrained amber emergency accents, abandoned yet readable
Materials/textures: scratched metal consoles, ceramic insulators, copper buses, thick cables, worn floor plates
Constraints: coherent with the same industrial ship, screens may glow but contain no symbols or text, no letters, no logos, no watermark, no people, no fantasy, no visible game interface, avoid overly dark image
```
