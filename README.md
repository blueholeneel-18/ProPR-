# ProPR — Bug Assignment & Tracking System

ProPR is a full-stack platform that lets teams **report, categorize, assign, track, and manage software bugs** through their entire lifecycle.

- **Frontend:** React 18 (Vite), React Router, Axios, Lucide icons
- **Backend:** Node.js & Express (modular MVC REST API)
- **Database:** PostgreSQL (`pg` connection pool + SQL migrations)
- **Testing:** Jest + Supertest (backend), Vitest + React Testing Library (frontend)

---

## Project Structure

```text
ProPR-/
├── client/                     # Frontend (React + Vite)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images, icons, fonts
│   │   ├── components/         # Reusable UI components (Navbar, Modal, Button, BugCard)
│   │   ├── context/            # Global state (AuthContext)
│   │   ├── hooks/              # Custom React hooks (useBugs)
│   │   ├── pages/              # Route pages (Dashboard, BugList, BugDetail, Login)
│   │   ├── services/           # API service modules (Axios client)
│   │   ├── utils/              # Formatting helpers
│   │   ├── App.jsx             # Routing component
│   │   ├── index.css           # Global design system & styles
│   │   └── main.jsx            # React root mount
│   ├── tests/                  # Frontend component tests
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/             # DB connection pool & environment config
│   │   ├── controllers/        # Request handlers (bugController, userController)
│   │   ├── middleware/         # Auth, validation & error-handling middleware
│   │   ├── models/             # Database queries + SQL migrations
│   │   ├── routes/             # Express API routes (bugs, users, health)
│   │   ├── utils/              # Logger, async wrapper
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server bootstrap & port listener
│   ├── tests/
│   │   ├── unit/               # Controller/utility unit tests
│   │   └── integration/        # Supertest API integration tests
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── package.json                # Root workspace scripts (concurrently)
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18 (tested on Node 22)
- **npm** >= 9
- **PostgreSQL** >= 13 running locally (or a connection string to a remote instance)

---

## Getting Started

### 1. Install dependencies

Install everything (root, server, and client) from the repository root:

```bash
npm run install:all
```

Or install per workspace:

```bash
npm install            # root (concurrently)
npm install --prefix server
npm install --prefix client
```

### 2. Configure environment variables

Copy the provided templates and adjust them:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

| Variable        | Description                                  | Default                  |
| --------------- | -------------------------------------------- | ------------------------ |
| `NODE_ENV`      | Runtime environment                          | `development`            |
| `PORT`          | API port                                     | `5000`                   |
| `CLIENT_ORIGIN` | Allowed CORS origin                          | `http://localhost:5173`  |
| `PGHOST`        | PostgreSQL host                              | `localhost`              |
| `PGPORT`        | PostgreSQL port                              | `5432`                   |
| `PGUSER`        | PostgreSQL user                              | `postgres`               |
| `PGPASSWORD`    | PostgreSQL password                          | `postgres`               |
| `PGDATABASE`    | Database name                                | `propr`                  |
| `DATABASE_URL`  | Optional single connection string            | —                        |

**`client/.env`**

| Variable             | Description                          | Default                 |
| -------------------- | ------------------------------------ | ----------------------- |
| `VITE_API_URL`       | Base URL for the REST API            | `http://localhost:5000/api` |
| `VITE_PROXY_TARGET`  | Vite dev-server proxy target for `/api` | `http://localhost:5000` |

### 3. Create the database

```bash
createdb propr        # or: psql -c "CREATE DATABASE propr;"
```

### 4. Run migrations

Creates the `users`, `bugs`, and `comments` tables:

```bash
npm run migrate
```

### 5. Start the app (client + server concurrently)

```bash
npm run dev
```

- API: <http://localhost:5000/api/health>
- Client: <http://localhost:5173>

---

## Available Scripts

### Root

| Script              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Run server and client concurrently               |
| `npm test`          | Run backend and frontend test suites             |
| `npm run test:server` | Run backend tests only                         |
| `npm run test:client` | Run frontend tests only                        |
| `npm run build`     | Build the client for production                  |
| `npm run migrate`   | Apply database migrations                        |
| `npm run install:all` | Install dependencies for all workspaces        |

### Server (`server/`)

| Script                  | Description                        |
| ----------------------- | ---------------------------------- |
| `npm run dev`           | Start API with nodemon (hot reload)|
| `npm start`             | Start API in production mode       |
| `npm test`              | Run Jest + Supertest tests         |
| `npm run test:coverage` | Run tests with coverage report     |
| `npm run migrate`       | Apply SQL migrations               |

### Client (`client/`)

| Script            | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the Vite dev server          |
| `npm run build`   | Build for production               |
| `npm run preview` | Preview the production build       |
| `npm test`        | Run Vitest + Testing Library tests |

---

## API Reference

Base URL: `/api`

| Method   | Endpoint                 | Description                          |
| -------- | ------------------------ | ------------------------------------ |
| `GET`    | `/health`                | Service health check                 |
| `GET`    | `/bugs`                  | List bugs (filter: `status`, `priority`, `severity`, `assigned_to`, `search`) |
| `POST`   | `/bugs`                  | Create a bug                         |
| `GET`    | `/bugs/:id`              | Get a bug with its comments          |
| `PATCH`  | `/bugs/:id`              | Update a bug                         |
| `PATCH`  | `/bugs/:id/assign`       | Assign a bug (`{ "assigned_to": 3 }`)|
| `DELETE` | `/bugs/:id`              | Delete a bug                         |
| `GET`    | `/bugs/:id/comments`     | List a bug's comments                |
| `POST`   | `/bugs/:id/comments`     | Add a comment                        |
| `GET`    | `/users`                 | List users                           |
| `POST`   | `/users`                 | Create a user                        |
| `GET`    | `/users/me`              | Current user (requires auth header)  |
| `GET`    | `/users/:id`             | Get a user                           |

Authentication is currently a lightweight placeholder: send
`Authorization: Bearer <userId>` to act as that user. Swap in real JWT
verification in `server/src/middleware/auth.js`.

---

## Database Schema

- **users** — `id, name, email, role, created_at`
- **bugs** — `id, title, description, priority, severity, status, created_by, assigned_to, created_at, updated_at`
- **comments** — `id, bug_id, user_id, message, created_at`

Migration files live in `server/src/models/migrations/` and are applied by
`server/src/models/runMigrations.js`.

---

## Testing

```bash
npm test                 # both suites
npm run test:server      # Jest + Supertest (health, bugs, users, validation)
npm run test:client      # Vitest + React Testing Library (smoke, BugList)
```

Backend tests mock the database models, so **no PostgreSQL instance is required**
to run the test suite.

---

## License

MIT
