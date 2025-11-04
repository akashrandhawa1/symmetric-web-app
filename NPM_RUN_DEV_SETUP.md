# Coach Milo Intake — Local Dev Setup

The dev server now proxies Netlify-style functions automatically, so you can run the whole intake flow with a single command.

---

## 1. Start Vite

```bash
npm run dev
```

The server listens on port `3000` by default. If you prefer another port (for example 3001), pass `-- --port 3001` and the proxy still works.

## 2. Provide a Gemini key

Create `.env.local` in the project root (or export the variable in your shell):

```bash
GEMINI_API_KEY=AIzaSy...your-key
```

Only the server-side handler reads this key—the browser never touches it.

---

## Optional: Scripted fallback mode

If you do not have a Gemini key handy, enable the deterministic question tree:

```bash
VITE_MOCK_COACH_INTAKE=1 npm run dev
```

With the flag set, the client skips the network call and uses the shared scripted flow. Disable it once you are ready to exercise the real API.

---

## What happens under the hood

- Requests to `/.netlify/functions/coach-intake-next` are served by the Netlify handler directly inside Vite (see `vite.config.ts`).
- The handler manages Gemini retries, throttling backoff, response caching, and scripted fallback.
- Responses always use the `{ action: "turn" | "wrap" | "negotiation" }` envelope expected by the React component.

You can disable the dev proxy entirely by setting `VITE_DISABLE_FUNCTIONS_PROXY=1` before running Vite—useful if you want to point at a remote environment instead.

