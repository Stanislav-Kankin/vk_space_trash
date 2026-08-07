import { expect, test } from '@playwright/test'
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

    await page.getByRole('button', { name: /Начать вылазку/i }).click()
    await expect(page.getByRole('heading', { name: 'Стыковочный шлюз' })).toBeVisible()
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

test('hazard and repair rooms remain part of one deck route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /Начать вылазку/i }).click()

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
  await page.getByRole('button', { name: /Начать вылазку/i }).click()
  await expect(page.getByRole('heading', { name: 'Стыковочный шлюз' })).toBeVisible()
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
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/visual/combat.png' })

  await page.getByRole('button', { name: /Атака/i }).click()
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
