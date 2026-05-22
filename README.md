# SAM Assessment Application

Sustainability Readiness Intelligence Platform implementing the SAM BRD v2.0
and the SAM Sustainability Readiness Master workbook.

## Stack

| Layer    | Tech                                |
|----------|-------------------------------------|
| Frontend | React 18 + Vite + Tailwind + Recharts |
| Backend  | Node.js 20 + Express + Mongoose      |
| Database | MongoDB 7                            |
| Auth     | JWT (60 min default, 30 day "Remember Me") |
| Deploy   | Docker Compose (zip-and-run)        |

## Project structure

```
sam-assessment/
├── docker-compose.yml          # one-shot stack
├── .env.example                # copy to .env
├── backend/
│   ├── src/
│   │   ├── config/             # env, db connection
│   │   ├── models/             # Mongoose schemas
│   │   ├── middleware/         # auth, errors, file upload
│   │   ├── routes/             # REST endpoints
│   │   ├── controllers/        # request handlers
│   │   ├── services/           # orchestration
│   │   ├── engine/             # pure calculation modules
│   │   │   ├── completeness.js
│   │   │   ├── confidence.js
│   │   │   ├── annualization.js
│   │   │   ├── validation.js
│   │   │   ├── emissions.js
│   │   │   ├── scoring.js
│   │   │   ├── benchmarking.js
│   │   │   ├── certification.js
│   │   │   ├── strengthsGaps.js
│   │   │   ├── regulatory.js
│   │   │   └── actions.js
│   │   ├── data/               # master tables (frameworks, benchmarks, factors, rules)
│   │   └── utils/              # PDF, parsing, helpers
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/              # Register, Login, DataLoad, UploadSummary, Readiness
    │   ├── components/         # reusable UI components
    │   └── lib/                # api client, auth context
    ├── Dockerfile
    ├── nginx.conf
    └── package.json
```

## Quick start — Docker (recommended, fully portable)

```bash
cp .env.example .env          # optional: edit JWT_SECRET
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:5000
- MongoDB  → mongodb://localhost:27017/sam_assessment

`docker compose down -v` wipes the database.

## Quick start — Local dev (without Docker)

```bash
# 1. Start MongoDB locally (or via Docker: docker run -d -p 27017:27017 mongo:7)
# 2. Backend
cd backend
npm install
cp ../.env.example .env
MONGO_URI=mongodb://localhost:27017/sam_assessment npm run dev
# 3. Frontend (new shell)
cd frontend
npm install
npm run dev
```

## Implementation map vs. the BRD

| BRD Section | Implementation |
|---|---|
| §3 Auth | `backend/src/routes/auth.js`, `models/User.js` |
| §4 Screen 1 — Data Load | `frontend/src/pages/DataLoad.jsx`, `routes/upload.js` |
| §5 Completeness & Confidence | `engine/completeness.js`, `engine/confidence.js` |
| §6 Annualization | `engine/annualization.js` |
| §7 Validation | `engine/validation.js` |
| §8 Screen 2 — Summary | `frontend/src/pages/UploadSummary.jsx`, `routes/assessment.js` |
| §9 Emissions | `engine/emissions.js` |
| §10 Scoring | `engine/scoring.js` |
| §11 Benchmarking | `engine/benchmarking.js` |
| §12 Strengths/Gaps | `engine/strengthsGaps.js` |
| §13 Certification readiness | `engine/certification.js` |
| §14 Regulatory readiness | `engine/regulatory.js` |
| §15 Screen 3 — Readiness | `frontend/src/pages/ReadinessResults.jsx` |
| §16 Reference tables | `backend/src/data/*` |
| §17 NFRs | bcrypt cost-12, JWT 60 min, account lockout 5/15 min |

## Calculation engine — design principle

Every engine module is a **pure function** in `backend/src/engine/`. Each takes
plain JavaScript values and returns plain JavaScript values — no database
access. That lets the same modules run in unit tests, batch scripts, or
serverless handlers later. The orchestration layer (`services/assessmentService.js`)
loads data from Mongo, calls the engines, and writes results back.

## Updating the reference data

All master tables (sector codes, certification weights, benchmarks, emission
factors, validation rules, strength rules, gap rules, action library) live in
`backend/src/data/`. They are plain JS objects. Edit a file → restart the
container → updated rules are live. No code changes needed.

## Tests

```bash
cd backend
npm test
```

Tests cover the BRD worked examples (88,000 kWh / 7 months → 150,857 kWh annualized,
Scope 2 = 108.62 tCO₂e at 0.72 factor, total = 127.85 tCO₂e, etc.).

## Disclaimer

> SAM Assessment Application provides indicative sustainability and
> certification readiness intelligence. This platform does not replace official
> certification audits, regulatory reviews, accredited assessments, or legal
> compliance advice. All scores and recommendations are indicative only.
