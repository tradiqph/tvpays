# StarPago VPS relay (TvPays)

Next.js signs StarPago requests; this service forwards them from a **fixed droplet IP** StarPago allowlists.

## Env on droplet

| Variable | Example |
|----------|---------|
| `RELAY_SECRET` | Same as app `STARPAGO_RELAY_SECRET` |
| `STARPAGO_API_HOST` | `ph.api.starpago.com` |
| `PORT` | `8787` (nginx proxies to this) |

## nginx

Typical: `location /` → `proxy_pass http://127.0.0.1:8787;`

## App env

| Variable | Notes |
|----------|--------|
| `STARPAGO_RELAY_URL` | Your relay host (e.g. `https://starpago-relay.tvpays.net`) |
| `STARPAGO_RELAY_SECRET` | Bearer token matching `RELAY_SECRET` |

Allowed paths: pay-in create/query, payout create/query, and merchant balance.
