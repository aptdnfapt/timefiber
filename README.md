# TimeFiber

Personal time tracker with a diary-style table. Daybook / Midnight / Nature / Cyberpunk themes.

## Quick Start

### 1. Install deps

```bash
npm run setup
```

Installs for both `server/` and `client/`.

### 2. Set up environment

Copy the example env file to the project root:

```bash
cp .env.example .env
```

Edit `.env` in the project root:

| Variable | What it does | How to set it |
|---|---|---|
| `APP_PASSWORD` | The login password for the app | Pick any string you want |
| `JWT_SECRET` | Signing key for auth tokens | Generate with `openssl rand -hex 32` or any random string |
| `PORT` | Server port (default `5478`) | Optional — defaults to `5478` |
| `NODE_ENV` | `development` or `production` | Use `development` for dev |

Example `.env`:

```
APP_PASSWORD=my-secret-login
JWT_SECRET=a1b2c3d4e5f6...
PORT=5478
NODE_ENV=development
```

### 3. Build the client

```bash
npm run build
```

Outputs to `client/dist/`.

### 4. Start production server

```bash
npm start
```

Server runs on `http://0.0.0.0:5478` (or whatever `PORT` you set). Serve and log in with your `APP_PASSWORD`.

---

## Development

Run both server and client in watch mode:

```bash
npm run dev
```

- Client dev server → `http://localhost:5173`
- API server → `http://localhost:5478`

Client proxies `/api` requests to the server automatically.

---

## Project Structure

```
├── server/          Express + SQLite + JWT auth
│   ├── server.ts
│   ├── database.ts
│   ├── database.sqlite   ← auto-created at first run (not committed)
│   ├── auth.ts
│   └── routes/
├── client/          React + Tailwind CSS + Vite
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── index.css
│   └── dist/        (built output)
├── .env             (create from .env.example)
└── package.json
```
