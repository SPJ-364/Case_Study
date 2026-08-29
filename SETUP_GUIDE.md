# Inventory Management System — Full Setup Guide

Everything needed to get both repositories running and pushed to GitHub.
Follow the steps in order; the whole thing takes about 20 minutes.

**Contents**
1. Create the Supabase project
2. Run the database migration
3. Set up the backend
4. Set up the frontend
5. Push both repos to GitHub
6. Verify it works
7. Troubleshooting
8. What changed from the prelim blueprint

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> and sign up (free tier is enough).
2. **New Project**. Give it a name (e.g. `ims-ccs112`).
3. Set a **database password** and save it somewhere — you will not be shown it again.
4. Pick the region closest to you (Singapore is nearest to the Philippines).
5. Wait about 2 minutes for provisioning.

### Get your keys

Go to **Project Settings → API** and copy three values:

| Value | Where it goes | Notes |
|---|---|---|
| **Project URL** | `SUPABASE_URL` | looks like `https://abcdefgh.supabase.co` |
| **anon public** key | `SUPABASE_ANON_KEY` | safe to expose |
| **service_role** key | `SUPABASE_SERVICE_ROLE_KEY` | **secret** — backend only, never in the frontend |

> The service role key bypasses all database security. It stays in the backend `.env`,
> which is git-ignored. If it ever leaks, rotate it in the dashboard immediately.

---

## 2. Run the database migration

In the Supabase dashboard open **SQL Editor → New query**. Run these four files
**in order**, one at a time, from `ims-backend/supabase/`:

| Order | File | Creates |
|---|---|---|
| 1 | `01_schema.sql` | 10 tables, 5 enums, indexes, constraints |
| 2 | `02_functions.sql` | 8 functions, 4 triggers |
| 3 | `03_rls.sql` | 25 Row Level Security policies |
| 4 | `04_seed.sql` | 4 roles, 26 permissions, 54 role links, sample data |

For each: paste the whole file, press **Run**, wait for "Success".

### Confirm it worked

Run this in the SQL editor:

```sql
select 'roles' as object, count(*) from roles
union all select 'permissions', count(*) from permissions
union all select 'products', count(*) from products
union all select 'active alerts', count(*) from alerts where alert_status='active';
```

Expected: **4 roles, 26 permissions, 8 products, 12 active alerts.**

Those 12 alerts were generated automatically by the trigger the moment the inventory
rows were inserted — nothing seeded them directly. That is the alert system working.

---

## 3. Set up the backend

```bash
cd ims-backend
npm install
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=paste-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=paste-service-role-key-here
CORS_ORIGIN=http://localhost:5173
```

Create the four demo accounts:

```bash
npm run seed:users
```

You should see four `created` lines. Then start it:

```bash
npm run dev
```

Check <http://localhost:4000/api/health> — it should return
`{"success":true,"data":{"status":"ok", ...}}`.

**Leave this terminal running.**

---

## 4. Set up the frontend

In a **second terminal**:

```bash
cd ims-frontend
npm install
cp .env.example .env
npm run dev
```

`.env` needs only:

```
VITE_API_BASE_URL=http://localhost:4000/api
```

Open <http://localhost:5173>.

### Sign in

The login page has one-click buttons for each demo account:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@ims.local` | `SuperAdmin123!` |
| Warehouse Admin | `warehouse@ims.local` | `Warehouse123!` |
| Staff Admin | `staff@ims.local` | `StaffAdmin123!` |
| Finance Admin | `finance@ims.local` | `Finance123!` |

Sign in as each one and notice the sidebar changes — that is the role-based access
control working end to end.

---

## 5. Push both repos to GitHub

Two separate repositories, as required.

### Create them on GitHub

Go to <https://github.com/new> twice and create:

- `ims-backend`
- `ims-frontend`

**Do not** tick "Add a README" — both repos already have one.

### Push the backend

```bash
cd ims-backend
git init
git add .
git commit -m "Initial commit: IMS backend (Express + Supabase)"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ims-backend.git
git push -u origin main
```

### Push the frontend

```bash
cd ../ims-frontend
git init
git add .
git commit -m "Initial commit: IMS frontend (Vue 3 + Vite + Tailwind)"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ims-frontend.git
git push -u origin main
```

### Before you push — check your secrets are safe

```bash
git status --short | grep -i env
```

This should show **nothing**, or only `.env.example`. Both repos `.gitignore` `.env`,
but confirm it. If `.env` was ever committed, rotate your Supabase keys.

### Daily workflow afterwards

```bash
git add .
git commit -m "Add supplier filtering"
git push
```

For the team's GitHub Project Board flow (Backlog → To Do → In Progress → QA Testing →
Done), work on a branch and open a pull request:

```bash
git checkout -b feature/supplier-filter
# ...make changes...
git add . && git commit -m "Add supplier filtering"
git push -u origin feature/supplier-filter
```

Then open the PR on GitHub and link it to its issue with `Closes #12` in the description.

---

## 6. Verify it works

Sign in as **Warehouse Admin** and walk this path — it exercises the whole stack:

1. **Inventory** → find `Wireless Headset (SKU-7003)`, showing **Out of Stock**.
2. Click **Stock** → type `Stock In`, quantity `20`, reason "Delivery received" → Record.
3. Stock becomes 20 and the status flips to **In Stock**.
4. Go to **Alerts** → the out-of-stock alert for that item is gone. It auto-resolved.
5. Back on **Inventory**, click **Stock** on any item → type `Damaged`, quantity `3`.
6. **Alerts** now shows a *Damaged Item* alert; **Movements** shows shrinkage value.
7. **Reports** → shrinkage summary reflects it. Click **Export CSV**.

Then sign in as **Super Admin**:

8. **Roles & Permissions** → edit *Finance Admin* → untick `reports.view` → Save.
9. Sign in as Finance Admin — the Reports menu item is gone, and visiting `/reports`
   directly shows Access Denied.
10. **System Activity** shows every action above, attributed to who did it.

That last pair is the thing worth demonstrating to your panel: permissions are data,
and both the menu and the API follow them at runtime.

---

## 7. Troubleshooting

**"Cannot reach the API. Is the backend running?"**
The backend terminal is not running, or `VITE_API_BASE_URL` is wrong. It must end in
`/api`.

**"Missing environment variables" on backend start**
`.env` does not exist or a key is blank. Copy `.env.example` again and refill.

**CORS error in the browser console**
`CORS_ORIGIN` in the backend `.env` must exactly match the frontend URL, including port
and no trailing slash. Restart the backend after changing it.

**"No profile is linked to this account"**
The auth account exists but the `users` row does not. Run `npm run seed:users`, or
create the user through the Super Admin's Users page rather than the Supabase dashboard.

**`npm run seed:users` says "No roles found"**
`04_seed.sql` has not been run. Go back to step 2.

**Login says "Incorrect email or password"**
Passwords are case sensitive and include the `!`. If unsure, reset it from the Supabase
dashboard under **Authentication → Users**.

**"Insufficient stock" when recording a movement**
Working as designed — the movement would push stock below zero. Use a smaller quantity,
or `adjustment` if you are correcting a count.

**Port already in use**
Change `PORT` in the backend `.env` (and `VITE_API_BASE_URL` to match), or the frontend
port in `vite.config.js`.

---

## 8. What changed from the prelim blueprint

Your prelim document was written before the client asked for the four-role hierarchy.
These are the deliberate differences, so you can defend them:

| Prelim said | Built as | Why |
|---|---|---|
| `users.role` as a plain text column | `roles` + `permissions` + `role_permissions` tables | A single text column cannot express "Super Admin manages roles and permissions". Permissions must be editable data. |
| No activity log | `activity_logs` table | Super Admin's stated duty is to "monitor overall system activities" — that needs a log. |
| React frontend | Vue 3 | Chosen for this build. Update the prelim's technology stack section. |
| Backend / Database `[Insert]` | Node + Express / Supabase (PostgreSQL) | Fills the two blanks in the prelim. |
| 6 alert types | All 6 implemented | Including missing, damaged and near-expiry, which the midterm feature list had dropped. |
| Purchase Orders in the nav | Not built | It appeared in wireframes but had no entity. Deferred to finals rather than faked. |
| Finance: sales & transactions | Not built; page states this | Needs `transactions` / `sales` tables the prelim never defined. The page says so instead of showing invented figures. |
| Staff: full staff records | Partial — access management only | Needs a `staff` table separate from system users. Page states the boundary. |
| `Product → Supplier` one-to-many | Kept as many-products-to-one-supplier | Matches the prelim's written description. If a product needs several suppliers, that needs a junction table in finals. |

Two additions worth mentioning in your defence:

- **Stock cannot be edited directly.** Every change goes through a recorded movement
  with a type, reason and user. This is what makes the shrinkage figures real rather
  than decorative — and shrinkage was the case study's core problem.
- **Alert rules live in the database**, not in application code, so they cannot be
  bypassed and stay correct no matter what writes to the tables.
