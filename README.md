# Inventory Management System — Frontend

Client application for the CCS112 Inventory Management System case study.
**Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router.**

Talks to the `ims-backend` repository (Node + Express + Supabase).

---

## Requirements

- Node.js 18 or newer
- The backend running (default `http://localhost:4000`)

---

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>.

`.env`:

```
VITE_API_BASE_URL=http://localhost:4000/api
```

> Only the backend URL lives here. No Supabase keys ever reach the browser — the
> frontend never talks to Supabase directly.

### Demo accounts

The login screen has one-click buttons for each role. Run `npm run seed:users` in the
backend repo first.

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@ims.local` | `SuperAdmin123!` |
| Warehouse Admin | `warehouse@ims.local` | `Warehouse123!` |
| Staff Admin | `staff@ims.local` | `StaffAdmin123!` |
| Finance Admin | `finance@ims.local` | `Finance123!` |

---

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

Routes are code-split, so each page loads only when visited.

---

## Project structure

```
src/
├── api/          axios client + one module per resource
├── assets/       Tailwind entry and component classes
├── components/
│   ├── layout/   AppLayout, AppSidebar, AppTopbar
│   └── ui/       StatCard, StatusBadge, DataTable, ModalDialog, ToastHost
├── router/       routes + permission guards
├── stores/       Pinia: auth, toast
└── views/
    ├── auth/     LoginView
    ├── inventory/ Inventory, ProductDetail, Movements, Alerts, Suppliers
    └── admin/    Users, Roles, ActivityLog
```

---

## How access control works on the client

Three layers, all reading the same permission list the API returned at login:

1. **Router guard** — each route declares `meta.permission`; entering without it
   redirects to `/forbidden`.
2. **Sidebar** — navigation items are filtered by permission, so a Staff Admin never
   sees warehouse pages at all.
3. **Buttons** — action buttons are wrapped in `v-if="auth.can('...')"`, so a viewer
   with read-only access sees data but no edit controls.

```js
const auth = useAuthStore();
auth.can('products.create')                  // all listed permissions
auth.canAny('finance.view', 'reports.view')  // at least one
```

This is **convenience, not security** — the API enforces the same rules independently.
Hiding a button stops an accidental click; the backend stops a crafted request.

Because permissions are data, a Super Admin changing a role under
**Roles & Permissions** changes what every account with that role can see. The
signed-in user's own menu updates immediately; others pick it up on their next load.

---

## Pages

| Route | Page | Required permission |
|---|---|---|
| `/login` | Sign in | public |
| `/dashboard` | Role-aware dashboard | authenticated |
| `/inventory` | Inventory list, product CRUD, record movements | `inventory.view` |
| `/inventory/:id` | Product detail and movement history | `products.view` |
| `/movements` | Stock movement ledger + shrinkage totals | `movements.view` |
| `/alerts` | Alerts and reorder management | `alerts.view` |
| `/suppliers` | Supplier management | `suppliers.view` |
| `/reports` | Reports, category valuation, CSV export | `reports.view` |
| `/staff` | Staff admin area | `staff.view` |
| `/finance` | Financial records area | `finance.view` |
| `/users` | User account management | `users.view` |
| `/roles` | Role and permission editor | `roles.manage` |
| `/activity` | System activity log | `logs.view` |

The dashboard renders whichever cards the signed-in role has permission to see, so
each of the four admin areas gets a different view from the same component.

---

## Notes on scope

The Staff and Finance pages state plainly which parts are built and which are
scheduled for the finals phase, rather than showing placeholder numbers. Full staff
records and sales/transaction management need tables the prelim data architecture did
not define yet.

Stock quantity is deliberately **not** editable on the product form. Changing stock
requires recording a movement with a type and reason, which is what makes the
shrinkage figures on the reports page meaningful.
