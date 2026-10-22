# Realtime Chat v2 — Frontend (development)

Angular + TypeScript frontend for the [Realtime Chat backend](https://github.com/pedrobicas/java-realtime-chat).

**Version:** `2.0.0-dev.1` — development preview; not production-ready.

## Run locally

Requirements: Node.js 22+, npm, and the corresponding Spring Boot backend running on `http://localhost:8081`.

```sh
npm ci
npm start
```

Open `http://localhost:4200`. `proxy.conf.json` forwards `/api` and `/ws` to the backend on port `8081`. The UI expects both endpoints on the same browser origin via that proxy.

## Checks

```sh
npm run build
npm test -- --watch=false
```

## v2 changes

- Public-message persistence is implemented **on the backend**; the frontend displays restored history.
- Development version indicator and reconnect notice.
- HTML is displayed as literal message text rather than injected as markup.
- Legacy private-chat UI and endpoints are disabled until proper authentication/authorization exists.

## Deployment and security

Do not expose this preview publicly. It lacks accounts, authentication, abuse controls and production hardening. GitHub stores the source code; GitHub Pages can host **static Angular output only**, not the Java WebSocket service or database. A public hosted version requires an HTTPS reverse proxy, a persistently running backend and DB, CORS/origin policy, rate limits, authentication/authorization and secure WS (WSS).

For the single-machine Docker Compose demonstration, download the **combined workspace ZIP** from the ChatGPT conversation: its root `compose.yaml` expects sibling `frontend/` and `backend/` directories.

## Project state

This repository retains its original history. The v2 preview should be developed on a dedicated `develop/v2` branch and validated before being merged into `master`.
