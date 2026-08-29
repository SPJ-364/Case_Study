-- =====================================================================
-- INVENTORY MANAGEMENT SYSTEM - SCHEMA
-- Course: CCS112 Applications Development and Emerging Technologies
-- Target: Supabase (PostgreSQL)
-- Run this file FIRST in the Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMERATED TYPES
-- ---------------------------------------------------------------------
create type movement_type_enum as enum ('stock_in','stock_out','damaged','missing','returned','adjustment');
create type alert_type_enum    as enum ('low_stock','out_of_stock','reorder','missing_item','damaged_item','near_expiry');
create type alert_status_enum  as enum ('active','acknowledged','resolved');
create type priority_enum      as enum ('low','medium','high','critical');
create type product_status_enum as enum ('active','inactive','discontinued');

-- ---------------------------------------------------------------------
-- 1. ROLES  (fixes the prelim gap: role was a plain text column)
-- ---------------------------------------------------------------------
create table public.roles (
  role_id     serial primary key,
  role_code   text not null unique,          -- super_admin | warehouse_admin | staff_admin | finance_admin
  role_name   text not null,
  description text,
  is_system   boolean not null default true, -- system roles cannot be deleted
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. PERMISSIONS + ROLE_PERMISSIONS
--    Super Admin can "manage roles and permissions" -> needs real rows.
-- ---------------------------------------------------------------------
create table public.permissions (
  permission_id   serial primary key,
  permission_code text not null unique,      -- e.g. inventory.create
  module          text not null,             -- inventory | staff | finance | system
  description     text
);

create table public.role_permissions (
  role_id       int not null references public.roles(role_id) on delete cascade,
  permission_id int not null references public.permissions(permission_id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------
-- 3. USERS  (profile row mirroring auth.users)
-- ---------------------------------------------------------------------
create table public.users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  username    text not null unique,
  email       text not null unique,
  role_id     int  not null references public.roles(role_id),
  contact_number text,
  position    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_users_role on public.users(role_id);

-- ---------------------------------------------------------------------
-- 4. CATEGORIES
-- ---------------------------------------------------------------------
create table public.categories (
  category_id   serial primary key,
  category_name text not null unique,
  description   text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. SUPPLIERS
-- ---------------------------------------------------------------------
create table public.suppliers (
  supplier_id    serial primary key,
  supplier_name  text not null,
  contact_person text,
  contact_number text,
  email          text,
  address        text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. PRODUCTS
-- ---------------------------------------------------------------------
create table public.products (
  product_id      serial primary key,
  product_name    text not null,
  sku             text not null unique,
  category_id     int references public.categories(category_id) on delete set null,
  supplier_id     int references public.suppliers(supplier_id)  on delete set null,
  unit_price      numeric(12,2) not null default 0 check (unit_price >= 0),
  unit_of_measure text default 'pc',
  expiration_date date,
  status          product_status_enum not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_products_category on public.products(category_id);
create index idx_products_supplier on public.products(supplier_id);
create index idx_products_sku      on public.products(sku);

-- ---------------------------------------------------------------------
-- 7. INVENTORY  (one-to-one with products)
-- ---------------------------------------------------------------------
create table public.inventory (
  inventory_id   serial primary key,
  product_id     int not null unique references public.products(product_id) on delete cascade,
  current_stock  int not null default 0 check (current_stock >= 0),
  minimum_stock  int not null default 0 check (minimum_stock >= 0),
  reorder_point  int not null default 0 check (reorder_point >= 0),
  location       text default 'Main Warehouse',
  last_updated   timestamptz not null default now(),
  updated_by     uuid references public.users(user_id) on delete set null
);

-- ---------------------------------------------------------------------
-- 8. STOCK_MOVEMENTS  (the shrinkage ledger)
-- ---------------------------------------------------------------------
create table public.stock_movements (
  movement_id   serial primary key,
  product_id    int not null references public.products(product_id) on delete cascade,
  movement_type movement_type_enum not null,
  quantity      int not null,
  reason        text,
  reference_no  text,
  date_recorded timestamptz not null default now(),
  recorded_by   uuid references public.users(user_id) on delete set null,
  -- adjustments may be negative (stock correction); every other type is positive
  constraint chk_movement_qty check (
    (movement_type = 'adjustment' and quantity <> 0)
    or (movement_type <> 'adjustment' and quantity > 0)
  )
);
create index idx_movements_product on public.stock_movements(product_id);
create index idx_movements_date    on public.stock_movements(date_recorded desc);

-- ---------------------------------------------------------------------
-- 9. ALERTS
-- ---------------------------------------------------------------------
create table public.alerts (
  alert_id      serial primary key,
  product_id    int not null references public.products(product_id) on delete cascade,
  alert_type    alert_type_enum not null,
  alert_message text not null,
  alert_status  alert_status_enum not null default 'active',
  priority      priority_enum not null default 'medium',
  date_created  timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.users(user_id) on delete set null
);
create index idx_alerts_product on public.alerts(product_id);
create index idx_alerts_status  on public.alerts(alert_status);
-- only one ACTIVE alert of a given type per product
create unique index uq_alert_active on public.alerts(product_id, alert_type)
  where alert_status = 'active';

-- ---------------------------------------------------------------------
-- 10. ACTIVITY_LOGS  (Super Admin: "monitor overall system activities")
-- ---------------------------------------------------------------------
create table public.activity_logs (
  log_id      bigserial primary key,
  user_id     uuid references public.users(user_id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index idx_logs_created on public.activity_logs(created_at desc);
create index idx_logs_user    on public.activity_logs(user_id);
