import { expect, test, type Browser, type Page } from "@playwright/test"

const API = "http://localhost:4050/api"
const ORIGIN = "http://localhost:3050"

const accounts = {
  author: { email: "caffeinatedduck@example.com", password: "password1" },
  other: { email: "deepduckthoughts@example.com", password: "password2" },
  admin: { email: "admin@example.com", password: "adminpassword" },
}

// A page whose browser context is already signed in as the given account.
async function signedInPage(browser: Browser, account: keyof typeof accounts): Promise<Page> {
  const context = await browser.newContext()
  const response = await context.request.post(`${API}/auth/sign-in/email`, {
    data: accounts[account],
    headers: { Origin: ORIGIN },
  })
  expect(response.ok()).toBeTruthy()
  return context.newPage()
}

async function postQuack(page: Page, text: string): Promise<string> {
  const response = await page.context().request.post(`${API}/quacks`, {
    data: { text },
    headers: { Origin: ORIGIN },
  })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

const quackCard = (page: Page, text: string) => page.locator("article", { hasText: text })

test.describe("deleting quacks", () => {
  let text: string
  let quackId: string
  let author: Page

  test.beforeEach(async ({ browser }) => {
    text = `e2e quack ${Date.now()}`
    author = await signedInPage(browser, "author")
    quackId = await postQuack(author, text)
  })

  test.afterEach(async () => {
    // Clean up when the test did not delete it (the author may always delete their own).
    await author
      .context()
      .request.delete(`${API}/quacks/${quackId}`, { headers: { Origin: ORIGIN } })
    await author.context().close()
  })

  test("the author deletes their own quack after confirming", async () => {
    await author.goto("/quacks")
    const card = quackCard(author, text)
    await card.getByRole("button", { name: "Delete" }).click()
    await expect(author.getByText("Delete this quack?")).toBeVisible()
    await author.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
    await expect(card).toHaveCount(0)
  })

  test("another user gets no Delete button and the API answers 403", async ({ browser }) => {
    const other = await signedInPage(browser, "other")
    await other.goto("/quacks")
    await expect(quackCard(other, text)).toBeVisible()
    await expect(quackCard(other, text).getByRole("button", { name: "Delete" })).toHaveCount(0)

    const response = await other
      .context()
      .request.delete(`${API}/quacks/${quackId}`, { headers: { Origin: ORIGIN } })
    expect(response.status()).toBe(403)

    await other.reload()
    await expect(quackCard(other, text)).toBeVisible()
    await other.context().close()
  })

  test("the admin deletes someone else's quack", async ({ browser }) => {
    const admin = await signedInPage(browser, "admin")
    await admin.goto("/quacks")
    const card = quackCard(admin, text)
    await expect(card).toBeVisible()
    // the admin sees Delete on every quack in the feed, not only this one
    const articles = admin.locator("article")
    await expect(articles.getByRole("button", { name: "Delete" })).toHaveCount(
      await articles.count(),
    )
    await card.getByRole("button", { name: "Delete" }).click()
    await expect(admin.getByRole("dialog").getByText(/posted by someone else/i)).toBeVisible()
    await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
    await expect(card).toHaveCount(0)

    // gone for everyone, not just hidden for the admin
    await author.goto("/quacks")
    await expect(quackCard(author, text)).toHaveCount(0)
    await admin.context().close()
  })
})
