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

const launchExpedition = async (page: Page) => {
  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await expect(page.getByRole('heading', { name: 'Карта сектора' })).toBeVisible()
  await page.getByRole('button', { name: 'Стыковаться' }).click()
  await expect(page.getByRole('heading', { name: 'Стыковочный шлюз' })).toBeVisible()
}

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
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/ship-complete-result.png' })
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
  await expect(battery.getByText('УР. 1/3')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Включить звук' })).toBeVisible()
  await page.getByRole('button', { name: 'Улучшения корабля' }).click()
  await expect(page.getByRole('article').filter({ hasText: 'Резервная батарея' }).getByText('УР. 1/3')).toBeVisible()
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
  await expect(page.getByRole('grid', { name: 'Карта заброшенного корабля' })).toBeVisible()
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
  await expect(page.getByRole('button', { name: /Вскрыть контейнер/i })).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/storage-event.png' })
  await page.getByRole('button', { name: /Вскрыть контейнер/i }).click()

  await page.locator('[data-destination-id="3:1"]').click()
  await page.locator('[data-destination-id="2:1"]').click()
  await page.getByRole('button', { name: 'Осмотреть контейнер' }).click()
  await page.getByRole('button', { name: 'Оставить как есть' }).click()
  await page.locator('[data-destination-id="1:1"]').click()
  await expect(page.getByText('Охранный дрон', { exact: true })).toBeVisible()
  await expect(page.getByAltText('Охранный дрон в контрольном коридоре')).toBeVisible()
  await expect(page.getByText('Импульсный удар · 2–3')).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/combat.png' })

  await page.getByRole('button', { name: /Атака/i }).click()
  await expect(page.getByText(/Корпус получил [23] урона/)).toBeVisible()
  await expect(page.getByText('Импульсный удар · 3–4')).toBeVisible()
  await page.getByRole('button', { name: /Атака/i }).click()
  await page.getByRole('button', { name: /Атака/i }).click()
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
