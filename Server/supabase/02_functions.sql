-- =====================================================================
-- INVENTORY MANAGEMENT SYSTEM - FUNCTIONS & TRIGGERS
-- Run AFTER 01_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: signed effect of a movement on stock
-- ---------------------------------------------------------------------
create or replace function public.movement_delta(p_type movement_type_enum, p_qty int)
returns int language sql immutable as $$
  select case p_type
    when 'stock_in'   then  p_qty
    when 'returned'   then  p_qty
    when 'stock_out'  then -p_qty
    when 'damaged'    then -p_qty
    when 'missing'    then -p_qty
    when 'adjustment' then  p_qty
  end;
$$;

-- ---------------------------------------------------------------------
-- Core: (re)evaluate every alert condition for one product
-- Creates alerts that should exist, resolves alerts that no longer apply.
-- ---------------------------------------------------------------------
create or replace function public.refresh_product_alerts(p_product_id int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_stock   int;
  v_min     int;
  v_reorder int;
  v_name    text;
  v_expiry  date;
begin
  select i.current_stock, i.minimum_stock, i.reorder_point, p.product_name, p.expiration_date
    into v_stock, v_min, v_reorder, v_name, v_expiry
  from inventory i
  join products p on p.product_id = i.product_id
  where i.product_id = p_product_id;

  if not found then return; end if;

  ----------------------------------------------------------------- OUT OF STOCK
  if v_stock = 0 then
    insert into alerts (product_id, alert_type, alert_message, priority)
    values (p_product_id, 'out_of_stock', v_name || ' is out of stock.', 'critical')
    on conflict (product_id, alert_type) where alert_status = 'active'
    do update set alert_message = excluded.alert_message,
                  priority      = excluded.priority;
  else
    update alerts set alert_status='resolved', resolved_at=now()
    where product_id=p_product_id and alert_type='out_of_stock' and alert_status='active';
  end if;

  ----------------------------------------------------------------- LOW STOCK
  if v_stock > 0 and v_stock <= v_min then
    insert into alerts (product_id, alert_type, alert_message, priority)
    values (p_product_id, 'low_stock',
            v_name || ' is low on stock (' || v_stock || ' left, minimum ' || v_min || ').', 'high')
    on conflict (product_id, alert_type) where alert_status = 'active'
    do update set alert_message = excluded.alert_message,
                  priority      = excluded.priority;
  else
    update alerts set alert_status='resolved', resolved_at=now()
    where product_id=p_product_id and alert_type='low_stock' and alert_status='active';
  end if;

  ----------------------------------------------------------------- REORDER
  if v_stock > 0 and v_stock <= v_reorder then
    insert into alerts (product_id, alert_type, alert_message, priority)
    values (p_product_id, 'reorder',
            v_name || ' reached its reorder point (' || v_stock || ' of ' || v_reorder || ').', 'medium')
    on conflict (product_id, alert_type) where alert_status = 'active'
    do update set alert_message = excluded.alert_message,
                  priority      = excluded.priority;
  else
    update alerts set alert_status='resolved', resolved_at=now()
    where product_id=p_product_id and alert_type='reorder' and alert_status='active';
  end if;

  ----------------------------------------------------------------- NEAR EXPIRY
  if v_expiry is not null and v_expiry <= current_date + interval '30 days' then
    insert into alerts (product_id, alert_type, alert_message, priority)
    values (p_product_id, 'near_expiry',
            v_name || ' expires on ' || to_char(v_expiry,'Mon DD, YYYY') || '.', 'medium')
    on conflict (product_id, alert_type) where alert_status = 'active'
    do update set alert_message = excluded.alert_message,
                  priority      = excluded.priority;
  else
    update alerts set alert_status='resolved', resolved_at=now()
    where product_id=p_product_id and alert_type='near_expiry' and alert_status='active';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Trigger: applying a stock movement updates inventory
-- ---------------------------------------------------------------------
create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_delta int;
  v_new   int;
begin
  v_delta := movement_delta(new.movement_type, new.quantity);

  select current_stock + v_delta into v_new
  from inventory where product_id = new.product_id for update;

  if v_new is null then
    raise exception 'No inventory record exists for product %', new.product_id;
  end if;

  if v_new < 0 then
    raise exception 'Insufficient stock: movement would leave % units for product %', v_new, new.product_id;
  end if;

  update inventory
     set current_stock = v_new,
         last_updated  = now(),
         updated_by    = coalesce(new.recorded_by, updated_by)
   where product_id = new.product_id;

  -- movement-specific alerts
  if new.movement_type = 'damaged' then
    insert into alerts (product_id, alert_type, alert_message, priority)
    select new.product_id, 'damaged_item',
           p.product_name || ': ' || new.quantity || ' unit(s) recorded as damaged.', 'high'
    from products p where p.product_id = new.product_id
    on conflict (product_id, alert_type) where alert_status = 'active'
    do update set alert_message = excluded.alert_message,
                  priority      = excluded.priority;
  elsif new.movement_type = 'missing' then
    insert into alerts (product_id, alert_type, alert_message, priority)
    select new.product_id, 'missing_item',
           p.product_name || ': ' || new.quantity || ' unit(s) recorded as missing.', 'critical'
    from products p where p.product_id = new.product_id
    on conflict (product_id, alert_type) where alert_status = 'active'
    do update set alert_message = excluded.alert_message,
                  priority      = excluded.priority;
  end if;

  perform refresh_product_alerts(new.product_id);
  return new;
end;
$$;

drop trigger if exists trg_apply_stock_movement on public.stock_movements;
create trigger trg_apply_stock_movement
after insert on public.stock_movements
for each row execute function public.apply_stock_movement();

-- ---------------------------------------------------------------------
-- Trigger: editing inventory thresholds re-evaluates alerts
-- ---------------------------------------------------------------------
create or replace function public.inventory_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform refresh_product_alerts(new.product_id);
  return new;
end;
$$;

drop trigger if exists trg_inventory_after_change on public.inventory;
create trigger trg_inventory_after_change
after insert or update of current_stock, minimum_stock, reorder_point on public.inventory
for each row execute function public.inventory_after_change();

-- ---------------------------------------------------------------------
-- Trigger: keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists trg_users_touch on public.users;
create trigger trg_users_touch before update on public.users
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Auth helpers used by Row Level Security
-- ---------------------------------------------------------------------
create or replace function public.current_role_code()
returns text language sql stable security definer set search_path = public as $$
  select r.role_code from users u
  join roles r on r.role_id = u.role_id
  where u.user_id = auth.uid() and u.is_active;
$$;

create or replace function public.has_permission(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from users u
    join role_permissions rp on rp.role_id = u.role_id
    join permissions p on p.permission_id = rp.permission_id
    where u.user_id = auth.uid() and u.is_active and p.permission_code = p_code
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_code() = 'super_admin';
$$;
