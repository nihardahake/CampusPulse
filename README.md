# CampusPulse

## Project Name

CampusPulse — a smart campus maintenance and issue-reporting system.

## Problem Statement

Campus maintenance problems often go unnoticed or get lost in group chats with no follow-up. There's no clear way for students to know if their complaint was received, who's handling it, or when it'll be fixed. CampusPulse solves this by turning every complaint into a tracked, assigned, and time-bound ticket — visible to everyone involved.

## Who Is It For?

- **Students** — Submit issues from anywhere on campus, attach photos, track live status and confirm when a fix is done.
- **Technicians (Staff)** — View their assigned queue, start work, and log resolution notes.
- **Administrators** — Oversee all tickets, manage staff and categories, run analytics and monitor SLA health across campus.

## What It Does

CampusPulse is a full-stack MERN application built around a role-based ticketing workflow. It auto-assigns tickets to the least-loaded available technician, enforces SLA deadlines, detects duplicate reports, and sends in-app notifications at every stage — so nothing falls through the cracks.

## Features

- Secure authentication with JWT tokens and bcrypt password hashing.
- Role-based access control: students, staff and administrators each see only what they need.
- Smart duplicate detection — if a similar ticket was filed for the same location within 24 hours, the student is warned before submitting.
- Least-loaded auto-assignment ensures work is spread evenly across available technicians.
- SLA enforcement with automatic escalation and auto-closure after 72 hours of inactivity post-resolution.
- Full ticket history — every status change, comment and action is logged.
- In-app notification system with read/unread tracking.
- Analytics dashboard with charts for ticket volume, priority breakdown, staff workload and SLA compliance.
- Optional photo uploads via Cloudinary (JPEG, PNG, WebP — max 3 MB).

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Zod |
| Security | Helmet, CORS, express-rate-limit, Multer |
| Scheduled Jobs & Media | node-cron, Cloudinary |
| Frontend | React 18, Vite, React Router v7, Axios, Recharts |
| Testing | Jest, Supertest, mongodb-memory-server |

## System Architecture

```
React (Vite) ──── HTTP + JWT ────► Express API ──► Controllers ──► Services
                                        │                               ├── Assignment logic
                                        │                               ├── Notifications
                                        │                               └── Mongoose ──► MongoDB Atlas
                                        └── node-cron (SLA checks run every 10 min)
```

### Ticket Lifecycle

```
OPEN ──► ASSIGNED ──► IN_PROGRESS ──► RESOLVED
                                          │
                          student confirms │──► CLOSED
                          student disputes │──► REOPENED ──► IN_PROGRESS
```

Admins can reassign tickets at any non-closed state. Reopened tickets receive an automatic priority bump.

## Getting Started Locally

**Requirements:** Node.js 20+, npm, MongoDB (local or Atlas).

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd CampusPulse

# 2. Set up environment files
cp server/.env.example server/.env     # fill in MONGO_URI and JWT_SECRET
cp client/.env.example client/.env

# 3. Install dependencies
cd server && npm install
cd ../client && npm install

# 4. Seed the database (optional - for demo data)
cd server
npm run seed:categories   # adds issue categories
npm run seed:accounts     # adds demo admin + staff accounts

# 5. Start both servers
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev

# 6. Open http://localhost:5173
```

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port to run the API on (default: `5001`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing tokens — use a strong random string |
| `JWT_EXPIRES_IN` | Token expiry duration (default: `7d`) |
| `CLIENT_URL` | Allowed frontend origin (default: `http://localhost:5173`) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name (optional) |
| `CLOUDINARY_API_KEY` | Cloudinary API key (optional) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (optional) |
| `SLA_CRON` | Cron schedule for SLA checks (default: `*/10 * * * *`) |
| `NODE_ENV` | `development` or `production` |

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:5001/api`) |

> ⚠️ Never commit `.env` files or credentials to version control.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@campuspulse.demo` | `CampusPulseDemo!26` |
| Staff | `wifi@campuspulse.demo`, `plumbing@campuspulse.demo` | same as above |
| Student | `student1@campuspulse.demo` through `student5@campuspulse.demo` | same as above |

## API Reference

All routes are prefixed with `/api`. Responses follow `{ success, data, message }`.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` |
| Tickets | `POST /tickets` · `GET /tickets` · `GET /tickets/:id` · `PATCH /tickets/:id/status` · `PATCH /tickets/:id/assign` · `POST /tickets/:id/comments` · `GET /tickets/similar` |
| Notifications | `GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` |
| Admin | `GET/POST /admin/categories` · `GET/POST /admin/staff` · `GET /admin/analytics/*` · `POST /admin/jobs/run-sla-check` |
| Health | `GET /api/health` |

Authentication: pass `Authorization: Bearer <token>` in the request header.

## Running Tests

```bash
cd server
npm test
```

Tests cover: ticket state transitions, auto-assignment fairness, duplicate detection, role isolation, and SLA idempotency. All tests run against an in-memory MongoDB instance.

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set `VITE_API_URL` to your Render backend URL |
| Backend | Render | Set all `server/.env` variables in Render dashboard |

**Live URLs:**
- Frontend: `https://campuspulse-pi.vercel.app/`
- Backend API: `https://campuspulse-78uj.onrender.com/api`

## Project Demo Video

https://drive.google.com/file/d/1NrIcgYm_gCDX9g3VIpRxZRi_kQPzgcjS/view?usp=sharing

## Future Plans

- Email & push notifications for ticket updates.
- Real-time status updates using WebSockets.
- Student satisfaction ratings after ticket closure.
- Multilingual support for diverse student populations.
- Exportable SLA reports for department heads.
