-- =====================================================================
-- INVENTORY MANAGEMENT SYSTEM - SEED DATA
-- Run AFTER 03_rls.sql
-- Creates the four roles from the client's administrative hierarchy,
-- the permission catalogue, the role-permission matrix, and sample
-- inventory data for the prototype demo.
-- =====================================================================

-- ------------------------------------------------------------- ROLES
insert into public.roles (role_code, role_name, description) values
  ('super_admin',    'Super Admin',     'Main administrator. Oversees the three specialised administrative areas and manages roles and permissions.'),
  ('warehouse_admin','Warehouse Admin', 'Responsible for warehouse and inventory operations, suppliers, stock monitoring and inventory alerts.'),
  ('staff_admin',    'Staff Admin',     'Responsible for staff management, staff information and security/access management.'),
  ('finance_admin',  'Finance Admin',   'Responsible for sales and transaction management, financial records and financial reports.')
on conflict (role_code) do nothing;

-- ------------------------------------------------------- PERMISSIONS
insert into public.permissions (permission_code, module, description) values
  ('inventory.view',    'inventory','View inventory records and stock levels'),
  ('inventory.create',  'inventory','Create inventory records'),
  ('inventory.update',  'inventory','Update stock levels, minimum stock and reorder points'),
  ('inventory.delete',  'inventory','Delete inventory records'),
  ('products.view',     'inventory','View products'),
  ('products.create',   'inventory','Add products'),
  ('products.update',   'inventory','Edit products and categories'),
  ('products.delete',   'inventory','Delete products'),
  ('suppliers.view',    'inventory','View suppliers'),
  ('suppliers.manage',  'inventory','Add, edit and deactivate suppliers'),
  ('movements.view',    'inventory','View stock movement history'),
  ('movements.create',  'inventory','Record stock in, stock out, damaged, missing and returned items'),
  ('alerts.view',       'inventory','View inventory alerts'),
  ('alerts.manage',     'inventory','Acknowledge and resolve alerts'),
  ('staff.view',        'staff',    'View staff records'),
  ('staff.manage',      'staff',    'Add, edit and deactivate staff records'),
  ('security.manage',   'staff',    'Manage security and access settings'),
  ('finance.view',      'finance',  'View sales, transactions and financial records'),
  ('finance.manage',    'finance',  'Record and edit financial transactions'),
  ('reports.view',      'reports',  'View reports and dashboards'),
  ('reports.generate',  'reports',  'Generate and export reports'),
  ('users.view',        'system',   'View system user accounts'),
  ('users.manage',      'system',   'Create, edit and deactivate system user accounts'),
  ('roles.manage',      'system',   'Manage roles and role permissions'),
  ('logs.view',         'system',   'View system activity logs'),
  ('settings.manage',   'system',   'Manage system settings')
on conflict (permission_code) do nothing;

-- --------------------------------------------- ROLE-PERMISSION MATRIX
-- Super Admin: everything ("Access all administrative areas")
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r cross join public.permissions p
where r.role_code = 'super_admin'
on conflict do nothing;

-- Warehouse Admin: inventory, suppliers, stock monitoring, alerts
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r join public.permissions p on p.permission_code in (
  'inventory.view','inventory.create','inventory.update','inventory.delete',
  'products.view','products.create','products.update','products.delete',
  'suppliers.view','suppliers.manage',
  'movements.view','movements.create',
  'alerts.view','alerts.manage',
  'reports.view','reports.generate'
)
where r.role_code = 'warehouse_admin'
on conflict do nothing;

-- Staff Admin: staff management, security and access management
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r join public.permissions p on p.permission_code in (
  'staff.view','staff.manage','security.manage',
  'users.view','users.manage',
  'reports.view'
)
where r.role_code = 'staff_admin'
on conflict do nothing;

-- Finance Admin: sales/transactions, financial records and reports
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r join public.permissions p on p.permission_code in (
  'finance.view','finance.manage',
  'reports.view','reports.generate',
  'products.view','inventory.view'
)
where r.role_code = 'finance_admin'
on conflict do nothing;

-- -------------------------------------------------------- CATEGORIES
insert into public.categories (category_name, description) values
  ('Electronics',  'Electronic devices and components'),
  ('Accessories',  'Peripheral and add-on items'),
  ('Cables',       'Cables and connectors'),
  ('Consumables',  'Items consumed through normal use'),
  ('Raw Materials','Materials used in production')
on conflict (category_name) do nothing;

-- --------------------------------------------------------- SUPPLIERS
insert into public.suppliers (supplier_name, contact_person, contact_number, email, address) values
  ('TechSource Inc.',    'Maria Santos',  '+63 917 555 0101', 'sales@techsource.example',  'Makati City, Metro Manila'),
  ('CablePro Ltd.',      'Jun Reyes',     '+63 918 555 0102', 'orders@cablepro.example',   'Cabuyao, Laguna'),
  ('ErgoGear Co.',       'Ana Villanueva','+63 919 555 0103', 'hello@ergogear.example',    'Quezon City, Metro Manila'),
  ('KeyTech Solutions',  'Paolo Cruz',    '+63 920 555 0104', 'support@keytech.example',   'Sta. Rosa, Laguna'),
  ('VisionPro Ltd.',     'Grace Lim',     '+63 921 555 0105', 'contact@visionpro.example', 'Pasig City, Metro Manila')
on conflict do nothing;

-- ---------------------------------------------------------- PRODUCTS
insert into public.products (product_name, sku, category_id, supplier_id, unit_price, expiration_date) values
  ('Wireless Mouse',    'SKU-1001', 1, 1, 749.00,  null),
  ('Keyboard',          'SKU-5002', 1, 4, 1250.00, null),
  ('USB-C Cable',       'SKU-2040', 3, 2, 299.00,  null),
  ('Laptop Stand',      'SKU-3015', 2, 3, 1599.00, null),
  ('Monitor 24"',       'SKU-6021', 1, 5, 8499.00, null),
  ('Wireless Headset',  'SKU-7003', 1, 1, 2199.00, null),
  ('HDMI Adapter',      'SKU-8004', 2, 2, 549.00,  null),
  ('Cleaning Solution', 'SKU-9005', 4, 3, 189.00,  current_date + interval '20 days')
on conflict (sku) do nothing;

-- --------------------------------------------------------- INVENTORY
-- Values chosen so the demo shows every alert state at once.
insert into public.inventory (product_id, current_stock, minimum_stock, reorder_point, location)
select p.product_id, v.stock, v.minimum, v.reorder, 'Main Warehouse'
from public.products p
join (values
  ('SKU-1001',  8, 10, 20),   -- low stock + reorder
  ('SKU-5002',  6,  8, 15),   -- low stock + reorder
  ('SKU-2040',  5,  8, 15),   -- low stock + reorder
  ('SKU-3015',  7,  5, 10),   -- reorder only
  ('SKU-6021',  4,  5, 10),   -- low stock + reorder
  ('SKU-7003',  0,  5,  8),   -- out of stock
  ('SKU-8004', 18,  6, 20),   -- reorder only
  ('SKU-9005', 40, 10, 20)    -- healthy, but near expiry
) as v(sku, stock, minimum, reorder) on v.sku = p.sku
on conflict (product_id) do nothing;

-- Alerts are generated automatically by the trigger on inventory insert.
