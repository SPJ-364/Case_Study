# Inventory Management System — Backend API

REST API for the CCS112 Inventory Management System case study.
**Node.js + Express + Supabase (PostgreSQL).**

Paired with the `ims-frontend` repository (Vue 3).

---

## What this service does

- Authenticates users against Supabase Auth and returns their role **and their
  flattened permission list** in one payload.
- Enforces authorization on every route with a `requirePermission()` guard.
- Owns the stock ledger: stock can only change through a recorded movement, so
  every unit is attributable to a person.
- Writes an activity log for the Super Admin's "monitor overall system activities"
  responsibility.

> **Design note.** The API connects to Supabase with the **service role key**, which
> bypasses Row Level Security. Authorization is therefore enforced in Express, not in
> the database. RLS policies are still applied (`03_rls.sql`) as defence-in-depth so the
> database stays safe if anything ever connects with a user-level key.

---

## Requirements

- Node.js 18 or newer
- A Supabase project (free tier is enough)

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the database

In the Supabase dashboard open **SQL Editor** and run these files **in order**:

| Order | File | What it creates |
|---|---|---|
| 1 | `supabase/01_schema.sql` | 10 tables, enums, indexes, constraints |
| 2 | `supabase/02_functions.sql` | Stock + alert triggers, RLS helper functions |
| 3 | `supabase/03_rls.sql` | Row Level Security policies |
| 4 | `supabase/04_seed.sql` | 4 roles, 26 permissions, role matrix, sample data |

Running all four is safe and repeatable on a clean project.

### 3. Configure

```bash
cp .env.example .env
```

Fill in from **Project Settings → API**:

```
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CORS_ORIGIN=http://localhost:5173
```

> The service role key must never reach the browser. It stays in this repo's `.env`,
> which is git-ignored.

### 4. Create the demo accounts

```bash
npm run seed:users
```

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@ims.local` | `SuperAdmin123!` |
| Warehouse Admin | `warehouse@ims.local` | `Warehouse123!` |
| Staff Admin | `staff@ims.local` | `StaffAdmin123!` |
| Finance Admin | `finance@ims.local` | `Finance123!` |

Change these before any public demo.

### 5. Run

```bash
npm run dev     # auto-restart on change
npm start       # plain start
```

Health check: <http://localhost:4000/api/health>

---

## Project structure

```
src/
├── config/       env validation, Supabase clients
├── middleware/   authenticate, authorize, validate, errorHandler
├── controllers/  request handling per resource
├── routes/       route tables with permission guards
├── services/     alert refresh, activity logging
├── utils/        ApiError, asyncHandler, response helpers
├── app.js        Express assembly
└── server.js     entry point
supabase/         the four SQL migration files
scripts/          demo user seeding
```

---

## API reference

All routes are prefixed `/api`. Every route except `/auth/login`, `/auth/refresh`
and `/health` requires `Authorization: Bearer <access_token>`.

### Auth
| Method | Path | Permission |
|---|---|---|
| POST | `/auth/login` | public (rate limited: 20 / 15 min) |
| POST | `/auth/refresh` | public |
| GET | `/auth/me` | authenticated |
| POST | `/auth/logout` | authenticated |

### Inventory & products
| Method | Path | Permission |
|---|---|---|
| GET | `/inventory` | `inventory.view` |
| GET | `/inventory/summary` | `inventory.view` |
| PATCH | `/inventory/:productId` | `inventory.update` |
| POST | `/inventory/recheck-alerts` | `alerts.manage` |
| GET | `/products` | `products.view` |
| GET | `/products/:id` | `products.view` |
| POST | `/products` | `products.create` |
| PATCH | `/products/:id` | `products.update` |
| DELETE | `/products/:id` | `products.delete` |

### Stock movements
| Method | Path | Permission |
|---|---|---|
| GET | `/movements` | `movements.view` |
| GET | `/movements/summary` | `movements.view` |
| POST | `/movements` | `movements.create` |

### Alerts
| Method | Path | Permission |
|---|---|---|
| GET | `/alerts` | `alerts.view` |
| GET | `/alerts/summary` | `alerts.view` |
| PATCH | `/alerts/:id` | `alerts.manage` |

### Suppliers & categories
| Method | Path | Permission |
|---|---|---|
| GET | `/suppliers` · `/suppliers/:id` | `suppliers.view` |
| POST · PATCH · DELETE | `/suppliers` | `suppliers.manage` |
| GET | `/categories` | `products.view` |
| POST · PATCH · DELETE | `/categories` | `products.update` |

### System administration
| Method | Path | Permission |
|---|---|---|
| GET | `/users` · `/users/:id` | `users.view` |
| POST · PATCH · DELETE | `/users` | `users.manage` |
| POST | `/users/:id/password` | `users.manage` |
| GET | `/roles` | authenticated |
| GET | `/roles/permissions` | `roles.manage` |
| POST `/roles` · PUT `/roles/:id/permissions` · DELETE | | `roles.manage` |
| GET | `/logs` | `logs.view` |
| GET | `/dashboard` | authenticated (payload varies by permission) |

### Response shape

Success:
```json
{ "success": true, "data": { }, "meta": { "total": 8 } }
```

Error:
```json
{ "success": false,
  "error": { "message": "Validation failed",
             "details": [{ "field": "sku", "message": "Required" }] } }
```

---

## How stock and alerts work

Stock is **never** written directly. `POST /api/movements` inserts a row into
`stock_movements`, and a database trigger does the rest:

1. computes the signed delta (`stock_in` and `returned` add; `stock_out`, `damaged`
   and `missing` subtract; `adjustment` may be either),
2. rejects the movement if it would push stock below zero,
3. updates `inventory.current_stock`,
4. re-evaluates every alert rule for that product.

Because the rules live in `refresh_product_alerts()` in SQL, alerts stay correct even
if a row is changed outside this API.

| Alert | Condition | Priority |
|---|---|---|
| Out of stock | `current_stock = 0` | critical |
| Low stock | `0 < current_stock ≤ minimum_stock` | high |
| Reorder | `0 < current_stock ≤ reorder_point` | medium |
| Near expiry | `expiration_date ≤ today + 30 days` | medium |
| Damaged item | a `damaged` movement was recorded | high |
| Missing item | a `missing` movement was recorded | critical |

A partial unique index guarantees **at most one active alert of each type per product**,
and an alert auto-resolves as soon as its condition stops being true.

---

## Roles and permissions

| Role | Permissions | Covers |
|---|---|---|
| Super Admin | 26 (all) | Full access, manages roles and permissions, monitors activity |
| Warehouse Admin | 16 | Inventory, products, suppliers, movements, alerts, reports |
| Staff Admin | 6 | Staff records, security and access management, user accounts |
| Finance Admin | 6 | Financial records, reports, read-only inventory |

The matrix is **data, not code** — a Super Admin can change what any role can do at
runtime through `PUT /api/roles/:id/permissions`, and both the API guards and the
frontend menu follow immediately.

---

## Safety rules built in

- The last active Super Admin cannot be demoted or deactivated.
- Super Admin permissions cannot be reduced.
- System roles cannot be deleted; roles still assigned to users cannot be deleted.
- A user cannot delete their own account.
- Creating a user rolls back the auth account if the profile insert fails, so no
  orphan accounts are left behind.
- Login is rate limited to 20 attempts per 15 minutes.
