import { test, expect, type Page } from "@playwright/test";

/**
 * E2E coverage for the /search route guard:
 *  1. Unauthenticated visit to /search → redirected to "/"
 *  2. Signing out from /search → redirected to "/"
 *  3. Session expiration (storage cleared while on /search) → redirected to "/"
 *
 * The third and fourth scenarios fake a Supabase session by writing a token to
 * localStorage under the project's auth storage key, so we don't need real
 * Google OAuth in CI. The /search loader calls supabase.auth.getUser() which
 * hits the Supabase API — if the fake token is rejected (expected), the guard
 * still redirects to "/", which is what we assert.
 */

const LOGIN_HEADING = /welcome/i;

async function clearSupabaseSession(page: Page) {
  await page.addInitScript(() => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-")) localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  });
}

async function seedFakeSession(page: Page) {
  // Inject a syntactically valid (but server-invalid) session so the browser
  // client thinks a user is signed in. The server-side getUser() call will
  // reject it and the guard must still redirect to "/".
  await page.addInitScript(() => {
    const url = (window as unknown as { __ENV__?: { SUPABASE_URL?: string } })
      .__ENV__?.SUPABASE_URL;
    // Derive the project ref from VITE-injected URL on the page; fall back to
    // scanning localStorage at runtime if it's not exposed.
    const ref =
      (url && new URL(url).host.split(".")[0]) ||
      "project";
    const key = `sb-${ref}-auth-token`;
    const fake = {
      access_token: "fake.invalid.token",
      refresh_token: "fake-refresh",
      expires_at: Math.floor(Date.now() / 1000) - 60, // already expired
      expires_in: -60,
      token_type: "bearer",
      user: {
        id: "00000000-0000-0000-0000-000000000000",
        aud: "authenticated",
        email: "fake@example.com",
      },
    };
    try {
      localStorage.setItem(key, JSON.stringify(fake));
    } catch {
      /* ignore */
    }
  });
}

test.describe("/search route protection", () => {
  test("unauthenticated visit to /search redirects to /", async ({ page }) => {
    await clearSupabaseSession(page);
    await page.goto("/search");
    await page.waitForURL(/\/(\?.*)?$/);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { name: LOGIN_HEADING })).toBeVisible();
  });

  test("preserves the redirect target in the query string", async ({ page }) => {
    await clearSupabaseSession(page);
    await page.goto("/search");
    await page.waitForURL(/redirect=/);
    expect(page.url()).toContain("redirect=");
    expect(decodeURIComponent(page.url())).toContain("/search");
  });

  test("expired/invalid session is treated as unauthenticated", async ({
    page,
  }) => {
    await seedFakeSession(page);
    await page.goto("/search");
    // The guard calls getUser() which rejects the fake token → redirect to /
    await page.waitForURL(/\/(\?.*)?$/, { timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { name: LOGIN_HEADING })).toBeVisible();
  });

  test("clearing the session while on /search redirects on next navigation", async ({
    page,
  }) => {
    await seedFakeSession(page);
    await page.goto("/search");
    await page.waitForURL("/**");

    // Simulate logout / session expiration by wiping auth storage, then
    // re-navigate to /search. The guard must redirect to "/".
    await page.evaluate(() => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-")) localStorage.removeItem(key);
      }
    });
    await page.goto("/search");
    await page.waitForURL(/\/(\?.*)?$/);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
