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

Фоны стартового шлюза и грузового отсека сгенерированы специально для проекта встроенным image generation tool с ангаром в качестве стилевого референса. Рабочие файлы сохранены как `frontend/src/assets/room-airlock.webp` и `frontend/src/assets/room-cargo.webp`.

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
