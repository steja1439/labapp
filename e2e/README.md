# E2E tests

Playwright tests for the `/search` route guard.

## Run locally

```bash
bun run test:e2e           # starts `bun run dev` automatically
```

Against a deployed URL:

```bash
E2E_BASE_URL=https://your-app.lovable.app bun run test:e2e
```

## What's covered

- Unauthenticated visit to `/search` → redirect to `/`
- `?redirect=/search` is preserved on the login page
- Expired / invalid Supabase session → redirect to `/`
- Clearing auth storage (simulated logout / expiration) → redirect to `/`

Real Google OAuth is not exercised in CI — the tests fake a Supabase token in
`localStorage`. The server-side `getUser()` call rejects the fake token, which
is exactly the path session expiration takes in production.
