-- =====================================================================
-- INVENTORY MANAGEMENT SYSTEM - ROW LEVEL SECURITY
-- Run AFTER 02_functions.sql
--
-- NOTE: the Express backend connects with the SERVICE ROLE key, which
-- bypasses RLS. These policies are defence-in-depth so that the database
-- is still safe if anything ever talks to it with an anon/user key.
-- =====================================================================

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users            enable row level security;
alter table public.categories       enable row level security;
alter table public.suppliers        enable row level security;
alter table public.products         enable row level security;
alter table public.inventory        enable row level security;
alter table public.stock_movements  enable row level security;
alter table public.alerts           enable row level security;
alter table public.activity_logs    enable row level security;

-- ------------------------------------------------------------ ROLES
create policy roles_read on public.roles
  for select to authenticated using (true);
create policy roles_write on public.roles
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------ PERMISSIONS
create policy perms_read on public.permissions
  for select to authenticated using (true);
create policy perms_write on public.permissions
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy roleperms_read on public.role_permissions
  for select to authenticated using (true);
create policy roleperms_write on public.role_permissions
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------ USERS
-- everyone may read their own row; user managers may read all
create policy users_read_self on public.users
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.view'));

create policy users_update_self on public.users
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy users_manage on public.users
  for all to authenticated
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- ------------------------------------------------- REFERENCE TABLES
create policy categories_read on public.categories
  for select to authenticated using (true);
create policy categories_write on public.categories
  for all to authenticated
  using (public.has_permission('products.update')) with check (public.has_permission('products.update'));

create policy suppliers_read on public.suppliers
  for select to authenticated using (public.has_permission('suppliers.view'));
create policy suppliers_write on public.suppliers
  for all to authenticated
  using (public.has_permission('suppliers.manage')) with check (public.has_permission('suppliers.manage'));

-- --------------------------------------------------------- PRODUCTS
create policy products_read on public.products
  for select to authenticated using (public.has_permission('products.view'));
create policy products_insert on public.products
  for insert to authenticated with check (public.has_permission('products.create'));
create policy products_update on public.products
  for update to authenticated
  using (public.has_permission('products.update')) with check (public.has_permission('products.update'));
create policy products_delete on public.products
  for delete to authenticated using (public.has_permission('products.delete'));

-- -------------------------------------------------------- INVENTORY
create policy inventory_read on public.inventory
  for select to authenticated using (public.has_permission('inventory.view'));
create policy inventory_write on public.inventory
  for all to authenticated
  using (public.has_permission('inventory.update')) with check (public.has_permission('inventory.update'));

-- -------------------------------------------------- STOCK MOVEMENTS
create policy movements_read on public.stock_movements
  for select to authenticated using (public.has_permission('movements.view'));
create policy movements_insert on public.stock_movements
  for insert to authenticated with check (public.has_permission('movements.create'));

-- ----------------------------------------------------------- ALERTS
create policy alerts_read on public.alerts
  for select to authenticated using (public.has_permission('alerts.view'));
create policy alerts_write on public.alerts
  for all to authenticated
  using (public.has_permission('alerts.manage')) with check (public.has_permission('alerts.manage'));

-- --------------------------------------------------- ACTIVITY LOGS
create policy logs_read on public.activity_logs
  for select to authenticated using (public.has_permission('logs.view'));
create policy logs_insert on public.activity_logs
  for insert to authenticated with check (true);
