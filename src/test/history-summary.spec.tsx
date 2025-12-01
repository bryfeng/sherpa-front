import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173'

test.describe.skip('History summary export flow', () => {
  test('shows export CTA state', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.getByText(/history/i).first().waitFor({ state: 'visible' })
    const exportButton = page.getByRole('button', { name: /download latest/i })
    await expect(exportButton).toBeVisible()
  })
})
