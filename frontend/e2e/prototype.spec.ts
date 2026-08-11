import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const

test.beforeAll(async () => {
  await mkdir('test-results/visual', { recursive: true })
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cosmic-scavenger-onboarding-v1', 'true')
    if (!localStorage.getItem('cosmic-scavenger-progress')) {
      localStorage.setItem('cosmic-scavenger-progress', JSON.stringify({
        version: 4,
        state: { totalMoves: 0, movesUntilRandomEvent: 999, randomEventBag: [] },
      }))
    }
  })
})

const launchExpedition = async (page: Page) => {
  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await expect(page.getByRole('heading', { name: 'Карта сектора' })).toBeVisible()
  await page.getByRole('button', { name: 'Стыковаться' }).click()
  await expect(page.getByRole('heading', { name: 'Стыковочный шлюз' })).toBeVisible()
}

test('first launch briefing explains the expedition and can be reopened', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/?tutorial=1')

  const briefing = page.getByRole('dialog', { name: /Соберите лом и вернитесь/i })
  await expect(briefing).toBeVisible()
  await expect(page.getByText('ИНСТРУКТАЖ · 1/5')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: 'test-results/visual/onboarding-320x568.png' })

  await page.getByRole('button', { name: 'Дальше' }).click()
  await expect(page.getByRole('heading', { name: 'Каждый переход стоит энергии' })).toBeVisible()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await expect(page.getByRole('heading', { name: 'Инструмент решает, что можно забрать' })).toBeVisible()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await expect(page.getByRole('heading', { name: 'Дрон отвечает после вашего хода' })).toBeVisible()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await expect(page.getByRole('heading', { name: 'Сохранение проходит только через шлюз' })).toBeVisible()
  await page.getByRole('button', { name: 'В ангар' }).click()
  await expect(page.getByRole('button', { name: /Начать вылазку/i })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: 'Настройки' }).click()
  await page.getByRole('button', { name: 'Повторить инструктаж' }).click()
  await expect(page.getByRole('heading', { name: 'Соберите лом и вернитесь' })).toBeVisible()
})

for (const viewport of viewports) {
  test(`hangar fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Начать вылазку/i })).toBeVisible()
    await page.waitForTimeout(450)

    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      rootWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.rootWidth).toBeLessThanOrEqual(layout.viewportWidth)

    await page.screenshot({ path: `test-results/visual/hangar-${viewport.width}x${viewport.height}.png` })

    await launchExpedition(page)
    await page.waitForTimeout(450)
    const explorationWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(explorationWidth).toBeLessThanOrEqual(viewport.width)
    await page.screenshot({ path: `test-results/visual/airlock-${viewport.width}x${viewport.height}.png` })
  })
}

test('workshop remains readable on the smallest viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Улучшения корабля' }).click()
  await expect(page.getByRole('heading', { name: 'Модули корабля' })).toBeVisible()
  await page.waitForTimeout(450)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: 'test-results/visual/upgrades-320x568.png' })
})

test('sector map pans horizontally and keeps the first ship selectable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await expect(page.getByRole('heading', { name: 'Карта сектора' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Исследовать транспорт 7-Альфа/i })).toBeVisible()
  await expect(page.getByText('1 ИЗ 19 ОТСЕКОВ')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Стыковаться' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  const viewport = page.locator('.star-map-viewport')
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(0)
  await page.getByRole('button', { name: 'Сдвинуть карту вправо' }).click()
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/visual/star-map-mobile.png' })
})

const randomEventCases = [
  { kind: 'digital-lock', heading: /Соберите .*кнопок|микросхем|шестерёнок|камней/, selector: '.match-board' },
  { kind: 'crew-tablet', heading: 'Планшет члена экипажа', selector: '.tablet-device' },
  { kind: 'radiation', heading: 'Калибровка защиты', selector: '.radiation-rings' },
  { kind: 'power-grid', heading: 'Замкните силовой контур', selector: '.power-grid' },
  { kind: 'cargo-crane', heading: 'Магнитный захват', selector: '.crane-stage' },
  { kind: 'star-chart', heading: 'Звёздное совмещение', selector: '.star-scope' },
] as const

for (const eventCase of randomEventCases) {
  test(`random event ${eventCase.kind} renders on mobile`, async ({ page }) => {
    const viewport = eventCase.kind === 'digital-lock' ? { width: 320, height: 568 } : { width: 390, height: 844 }
    await page.setViewportSize(viewport)
    await page.goto('/?vk_platform=mobile_android&vk_app_id=54711325')
    await page.evaluate((kind) => {
      const saved = JSON.parse(localStorage.getItem('cosmic-scavenger-progress')!)
      saved.version = 4
      saved.state.totalMoves = 6
      saved.state.movesUntilRandomEvent = 1
      saved.state.randomEventBag = [kind]
      localStorage.setItem('cosmic-scavenger-progress', JSON.stringify(saved))
    }, eventCase.kind)
    await page.reload()
    await launchExpedition(page)
    await page.locator('[data-destination-id="4:1"]').click()

    await expect(page.getByRole('heading', { name: eventCase.heading })).toBeVisible()
    await expect(page.locator(eventCase.selector)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    const eventHeader = page.locator(eventCase.kind === 'digital-lock' ? '.match-three-header' : '.random-event-header')
    expect(await eventHeader.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingRight))).toBeGreaterThanOrEqual(88)

    if (eventCase.kind === 'power-grid') {
      const requiredSegments = page.locator('.power-grid button.required')
      for (let index = 0; index < await requiredSegments.count(); index += 1) await requiredSegments.nth(index).click()
      await expect(page.locator('.power-event.solved')).toBeVisible()
      await expect(page.locator('.power-reward')).toBeVisible()
    }

    if (eventCase.kind === 'star-chart') {
      const layers = page.locator('.star-controls button')
      for (let index = 0; index < await layers.count(); index += 1) await layers.nth(index).click()
      await expect(page.locator('.star-event.solved')).toBeVisible()
    }

    await page.waitForTimeout(350)
    await page.screenshot({ path: `test-results/visual/random-${eventCase.kind}.png` })
  })
}

test('sorting matrix opens as a 7 by 7 five-move puzzle on the first ship', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await launchExpedition(page)
  await page.locator('[data-destination-id="4:3"]').click()
  await page.locator('[data-destination-id="3:3"]').click()
  await page.locator('[data-destination-id="3:4"]').click()
  await page.getByRole('button', { name: 'Запустить сортировочную матрицу' }).click()

  const matrix = page.getByRole('grid', { name: 'Сортировочная матрица семь на семь' })
  await expect(matrix.getByRole('gridcell')).toHaveCount(49)
  await expect(page.getByText('0/15', { exact: true })).toBeVisible()
  await expect(page.getByText('5', { exact: true })).toBeVisible()
  await page.waitForTimeout(350)
  const tile = await matrix.getByRole('gridcell').first().boundingBox()
  expect(tile?.width).toBeGreaterThanOrEqual(44)
  expect(tile?.height).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: 'test-results/visual/match-three-320x568.png' })

  const cells = await matrix.getByRole('gridcell').evaluateAll((elements) => elements.map((element) => ({
    row: Number((element as HTMLElement).dataset.row),
    column: Number((element as HTMLElement).dataset.column),
    tile: (element as HTMLElement).dataset.tile!,
  })))
  const board = Array.from({ length: 7 }, () => Array<string>(7))
  cells.forEach((cell) => { board[cell.row][cell.column] = cell.tile })
  const hasMatch = (candidate: string[][]) => {
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        if (column <= 4 && candidate[row][column] === candidate[row][column + 1] && candidate[row][column] === candidate[row][column + 2]) return true
        if (row <= 4 && candidate[row][column] === candidate[row + 1][column] && candidate[row][column] === candidate[row + 2][column]) return true
      }
    }
    return false
  }
  let validSwap: [{ row: number; column: number }, { row: number; column: number }] | null = null
  for (let row = 0; row < 7 && !validSwap; row += 1) {
    for (let column = 0; column < 7 && !validSwap; column += 1) {
      for (const neighbour of [{ row, column: column + 1 }, { row: row + 1, column }]) {
        if (neighbour.row >= 7 || neighbour.column >= 7) continue
        const candidate = board.map((candidateRow) => [...candidateRow])
        ;[candidate[row][column], candidate[neighbour.row][neighbour.column]] = [candidate[neighbour.row][neighbour.column], candidate[row][column]]
        if (hasMatch(candidate)) validSwap = [{ row, column }, neighbour]
      }
    }
  }
  expect(validSwap).not.toBeNull()
  const [first, second] = validSwap!
  await matrix.locator(`[data-row="${first.row}"][data-column="${first.column}"]`).click()
  await matrix.locator(`[data-row="${second.row}"][data-column="${second.column}"]`).click()
  await expect(matrix).toHaveClass(/animating/)
  await expect(page.locator('.match-tile.clearing').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/visual/match-three-clearing.png' })
  await expect(page.locator('.match-tile.clearing')).toHaveCount(0)
  await expect.poll(() => matrix.getByRole('gridcell').evaluateAll((elements) => elements.some((element) => {
    const transform = getComputedStyle(element).transform
    return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)'
  }))).toBe(true)
  await page.screenshot({ path: 'test-results/visual/match-three-falling.png' })
  await expect(matrix).not.toHaveClass(/animating/, { timeout: 15_000 })
  await expect(page.getByText('4', { exact: true })).toBeVisible()
})

test('evacuated survey progress is restored on the same ship', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await launchExpedition(page)

  await page.locator('[data-destination-id="4:1"]').click()
  await page.getByRole('button', { name: 'Осмотреть контейнер' }).click()
  await page.getByRole('button', { name: 'Оставить как есть' }).click()
  await page.locator('[data-destination-id="4:2"]').click()
  await page.getByRole('button', { name: /Эвакуироваться/i }).click()
  await page.getByRole('button', { name: 'Вернуться в ангар' }).click()
  await page.getByRole('button', { name: /Начать вылазку/i }).click()

  await expect(page.getByText('2 ИЗ 19 ОТСЕКОВ')).toBeVisible()
  await page.getByRole('button', { name: 'Стыковаться' }).click()
  await page.getByRole('button', { name: 'Открыть схему палубы' }).click()
  await expect(page.locator('[data-room-id="4:1"]')).toHaveClass(/visited/)
})

test('finishing the last room unlocks the next route after evacuation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const surveyedRooms = [
      '0:1', '0:2', '1:0', '1:1', '1:2', '1:3', '2:0', '2:1', '2:2',
      '2:3', '2:4', '3:0', '3:1', '3:2', '3:3', '3:4', '4:1', '4:2',
    ]
    localStorage.setItem('cosmic-scavenger-progress', JSON.stringify({
      version: 2,
      state: {
        bankedScrap: 32,
        upgrades: { hull: 0, battery: 0, scanner: 0 },
        shipProgress: {
          'transport-7-alpha': {
            visitedRoomIds: surveyedRooms,
            resolvedRoomIds: surveyedRooms,
            completed: false,
          },
        },
      },
    }))
  })
  await page.goto('/')
  await launchExpedition(page)

  await page.locator('[data-destination-id="4:3"]').click()
  await expect(page.getByText(/КАРТА ОБЪЕКТА ЗАВЕРШЕНА/)).toBeVisible()
  await page.locator('[data-destination-id="4:2"]').click()
  await page.getByRole('button', { name: /Эвакуироваться/i }).click()

  await expect(page.getByRole('heading', { name: 'Транспорт 7-Альфа изучен' })).toBeVisible()
  await expect(page.getByText('Обнаружен маршрут к следующему объекту')).toBeVisible()
  await expect(page.getByText('+50 лома')).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/ship-complete-result.png' })
  await page.getByRole('button', { name: 'Вернуться в ангар' }).click()
  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await expect(page.getByRole('button', { name: 'Исследовать промышленный переработчик Гефест-9' })).toBeEnabled()
})

test('equips two tools and opens the 6 by 6 Hephaestus deck', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    localStorage.setItem('cosmic-scavenger-progress', JSON.stringify({
      version: 4,
      state: {
        totalMoves: 0,
        movesUntilRandomEvent: 999,
        randomEventBag: [],
        bankedScrap: 200,
        upgrades: {
          hull: 0,
          battery: 0,
          scanner: 0,
          trapSense: 0,
          salvageBonus: 0,
          toolDurability: 0,
          emergencyCapacitor: 0,
          cargoStabilizer: 0,
          shieldAmplifier: 0,
        },
        tools: {
          mechanic: { owned: true, durability: 12 },
          laser: { owned: false, durability: 0 },
          grapple: { owned: false, durability: 0 },
          diagnostic: { owned: false, durability: 0 },
          decoder: { owned: false, durability: 0 },
          sealant: { owned: false, durability: 0 },
        },
        loadout: ['mechanic'],
        claimedCompletionRewards: ['transport-7-alpha'],
        shipProgress: {
          'transport-7-alpha': { visitedRoomIds: ['4:2'], resolvedRoomIds: ['4:2'], completed: true },
          'hephaestus-9': { visitedRoomIds: ['5:3'], resolvedRoomIds: ['5:3'], completed: false },
        },
      },
    }))
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Улучшения корабля' }).click()
  await page.getByRole('button', { name: 'Инструменты' }).click()

  const laser = page.getByRole('article').filter({ hasText: 'Лазерный резак' })
  await laser.getByRole('button', { name: /Купить/ }).click()
  await laser.getByRole('button', { name: 'В комплект' }).click()
  await expect(page.getByText('2/2')).toBeVisible()
  await page.screenshot({ path: 'test-results/visual/tool-workshop.png' })

  await page.getByRole('button', { name: 'Вернуться в ангар' }).click()
  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await page.getByRole('button', { name: 'Исследовать промышленный переработчик Гефест-9' }).click()
  await expect(page.getByRole('heading', { name: 'Промышленный переработчик' })).toBeVisible()
  await page.getByRole('button', { name: 'Стыковаться' }).click()
  await expect(page.getByRole('heading', { name: 'Промышленный переработчик' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Стыковочный шлюз' })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/hephaestus-airlock.png' })

  await page.getByRole('button', { name: 'Открыть схему палубы' }).click()
  const map = page.getByRole('grid', { name: 'Карта корабля Гефест-9' })
  await expect(map).toBeVisible()
  await expect(map.getByRole('gridcell')).toHaveCount(36)
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/hephaestus-map.png' })
  await page.getByRole('button', { name: 'Закрыть схему' }).click()

  await page.locator('[data-destination-id="5:4"]').click()
  await page.getByRole('button', { name: 'Осмотреть контейнер' }).click()
  await page.getByRole('button', { name: /Вскрыть контейнер Инструмент механика/ }).click()
  await expect(page.getByText(/Инструмент механика: −1 прочности/)).toBeVisible()
  await page.locator('[data-destination-id="5:5"]').click()
  await expect(page.getByText(/d20 \d+ \+ чутьё 0 = \d+ против 22/)).toBeVisible()
  const trapSequence = page.locator('.trap-sequence')
  await expect(trapSequence).toBeVisible()
  expect(await page.locator('.trap-timer i').evaluate((element) => getComputedStyle(element).animationDuration)).toBe('5s')
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/hephaestus-trap.png' })
})

test('VK mobile controls leave room for the platform close button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?vk_platform=mobile_android&vk_app_id=54711325')

  const hangarRightPadding = await page.locator('.top-bar').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingRight))
  expect(hangarRightPadding).toBeGreaterThanOrEqual(88)

  await launchExpedition(page)
  const expeditionRightPadding = await page.locator('.expedition-header').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingRight))
  expect(expeditionRightPadding).toBeGreaterThanOrEqual(88)
})

test('desktop VK iframe uses a wide layout without page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 700 })
  await page.goto('/?vk_platform=desktop_web&vk_app_id=54711325')

  const hangar = await page.locator('.hangar-screen').boundingBox()
  const visual = await page.locator('.hangar-visual').boundingBox()
  const consolePanel = await page.locator('.hangar-console').boundingBox()
  const upgradesButton = await page.getByRole('button', { name: 'Улучшения корабля' }).boundingBox()
  expect(hangar?.width).toBeGreaterThan(900)
  expect(visual?.x).toBeLessThan(consolePanel?.x ?? 0)
  expect(upgradesButton?.y ?? 701).toBeGreaterThanOrEqual(0)
  expect((upgradesButton?.y ?? 701) + (upgradesButton?.height ?? 0)).toBeLessThanOrEqual(700)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(700)
  await page.screenshot({ path: 'test-results/visual/desktop-vk-hangar.png' })

  await page.getByRole('button', { name: 'Улучшения корабля' }).click()
  await expect(page.getByRole('heading', { name: 'Модули корабля' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(700)
  await page.screenshot({ path: 'test-results/visual/desktop-vk-workshop.png' })
  await page.getByRole('button', { name: 'Вернуться в ангар' }).click()

  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await expect(page.getByRole('heading', { name: 'Карта сектора' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(700)
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/desktop-vk-star-map.png' })
  await page.getByRole('button', { name: 'Стыковаться' }).click()
  await expect(page.getByRole('heading', { name: 'Стыковочный шлюз' })).toBeVisible()
  const stage = await page.locator('.location-stage').boundingBox()
  const navigation = await page.locator('.room-navigation').boundingBox()
  expect(stage?.x).toBeLessThan(navigation?.x ?? 0)

  const layout = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height + 1)
  await page.screenshot({ path: 'test-results/visual/desktop-vk-expedition.png' })
})

test('alpha progress and preferences survive reload and can be reset', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?vk_platform=mobile_android&vk_app_id=101')
  await expect(page.getByRole('button', { name: /Начать вылазку/i })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.vkPlatform)).toBe('mobile_android')
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => entry.name.includes('room-')).length)).toBeGreaterThanOrEqual(5)

  await page.getByRole('button', { name: 'Выключить звук' }).click()
  await page.getByRole('button', { name: 'Улучшения корабля' }).click()
  const battery = page.getByRole('article').filter({ hasText: 'Резервная батарея' })
  await battery.getByRole('button').click()
  await expect(battery.getByText('УР. 1/10')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Включить звук' })).toBeVisible()
  await page.getByRole('button', { name: 'Улучшения корабля' }).click()
  await expect(page.getByRole('article').filter({ hasText: 'Резервная батарея' }).getByText('УР. 1/10')).toBeVisible()
  await page.getByRole('button', { name: 'Вернуться в ангар' }).click()
  await page.getByRole('button', { name: 'Настройки' }).click()
  await expect(page.getByText(/СБОРКА /)).toBeVisible()
  await page.getByRole('button', { name: 'Сбросить альфа-прогресс' }).click()
  await page.getByRole('button', { name: 'Подтвердить сброс' }).click()
  await expect(page.getByText('32', { exact: true })).toBeVisible()
})

test('hazard and repair rooms remain part of one deck route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await launchExpedition(page)

  await page.getByRole('button', { name: 'Выключить звук' }).click()
  await expect(page.getByRole('button', { name: 'Включить звук' })).toBeVisible()
  await page.getByRole('button', { name: 'Включить звук' }).click()

  await page.locator('[data-destination-id="3:2"]').click()
  const transit = page.getByRole('status', { name: 'Переход в сектор 4-3' })
  await expect(transit).toBeVisible()
  await page.waitForTimeout(280)
  await page.screenshot({ path: 'test-results/visual/transit-bulkhead.png' })
  await expect(transit).toBeHidden()
  await expect(page.getByRole('button', { name: 'Проверить пробоину' })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/hazard-location.png' })
  await page.getByRole('button', { name: 'Проверить пробоину' }).click()
  await page.getByRole('button', { name: 'Обойти переборку' }).click()

  await page.locator('[data-destination-id="3:1"]').click()
  await page.locator('[data-destination-id="3:0"]').click()
  await expect(page.getByRole('button', { name: 'Подключиться к модулю' })).toBeVisible()
  await expect(page.getByText('СЕКТОР 4-2 → СЕКТОР 4-1')).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/repair-location.png' })
})

test('completes a risky expedition and extracts at the starting airlock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await launchExpedition(page)
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/airlock-location.png' })

  await page.getByRole('button', { name: 'Открыть схему палубы' }).click()
  await expect(page.getByRole('grid', { name: /Карта корабля/ })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/expedition-map.png' })
  await page.getByRole('button', { name: 'Закрыть схему' }).click()

  await page.locator('[data-destination-id="4:1"]').click()
  await expect(page.getByRole('button', { name: 'Осмотреть контейнер' })).toBeVisible()
  await expect(page.getByText('СЕКТОР 5-3 → СЕКТОР 5-2')).toBeVisible()
  await expect(page.getByRole('button', { name: /Правый борт, сектор 5-3.*обратный путь/i })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/cargo-location.png' })
  await page.getByRole('button', { name: 'Осмотреть контейнер' }).click()
  await expect(page.getByRole('button', { name: /Вскрыть контейнер Инструмент механика/i })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/storage-event.png' })
  await page.getByRole('button', { name: /Вскрыть контейнер Инструмент механика/i }).click()

  await page.locator('[data-destination-id="3:1"]').click()
  await page.locator('[data-destination-id="2:1"]').click()
  await page.getByRole('button', { name: 'Осмотреть контейнер' }).click()
  await page.getByRole('button', { name: 'Оставить как есть' }).click()
  await page.locator('[data-destination-id="1:1"]').click()
  await expect(page.getByText('Охранный дрон', { exact: true })).toBeVisible()
  await expect(page.getByAltText('Охранный дрон в контрольном коридоре')).toBeVisible()
  await expect(page.getByText('Импульсный удар · 1–3')).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/combat.png' })

  const attack = page.getByRole('button', { name: /Атака/i })
  await attack.click()
  await expect(page.getByText('ХОД ПРОТИВНИКА')).toBeVisible()
  await expect(attack).toBeDisabled()
  await expect(page.getByText(/корпус получил [123] урона/i)).toBeVisible({ timeout: 2500 })
  await expect(attack).toBeEnabled()
  await attack.click()
  await expect(attack).toBeEnabled({ timeout: 2500 })
  await attack.click()
  await expect(page.getByText(/Дрон обезврежен/i)).toBeVisible()

  await page.locator('[data-destination-id="2:1"]').click()
  await page.locator('[data-destination-id="3:1"]').click()
  await page.locator('[data-destination-id="4:1"]').click()
  await page.locator('[data-destination-id="4:2"]').click()
  await page.getByRole('button', { name: /Эвакуироваться/i }).click()
  await expect(page.getByRole('heading', { name: 'Добыча доставлена' })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/result.png' })
})
