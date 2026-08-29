import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent } from '../utils/respond.js';
import { logActivity } from '../services/activityLog.service.js';
import { refreshAlertsForProduct } from '../services/alert.service.js';

const SELECT = `
  product_id, product_name, sku, unit_price, unit_of_measure, expiration_date, status, created_at,
  category:categories ( category_id, category_name ),
  supplier:suppliers ( supplier_id, supplier_name ),
  inventory ( inventory_id, current_stock, minimum_stock, reorder_point, location, last_updated )
`;

export const productSchema = z.object({
  productName: z.string().min(2),
  sku: z.string().min(2),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  unitPrice: z.coerce.number().min(0).default(0),
  unitOfMeasure: z.string().default('pc'),
  expirationDate: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  // initial inventory, created alongside the product
  currentStock: z.coerce.number().int().min(0).default(0),
  minimumStock: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  location: z.string().default('Main Warehouse'),
});

export const productUpdateSchema = productSchema.partial();

/** Adds a derived stock_status so the UI does not recompute it in three places. */
const decorate = (row) => {
  const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  let stockStatus = 'in_stock';
  if (inv) {
    if (inv.current_stock === 0) stockStatus = 'out_of_stock';
    else if (inv.current_stock <= inv.minimum_stock) stockStatus = 'low_stock';
    else if (inv.current_stock <= inv.reorder_point) stockStatus = 'reorder';
  }
  return { ...row, inventory: inv ?? null, stock_status: stockStatus };
};

/** GET /api/products */
export const listProducts = asyncHandler(async (req, res) => {
  const { search, categoryId, supplierId, status, stockStatus } = req.query;

  let q = supabaseAdmin.from('products').select(SELECT).order('product_name');
  if (categoryId) q = q.eq('category_id', categoryId);
  if (supplierId) q = q.eq('supplier_id', supplierId);
  if (status)     q = q.eq('status', status);
  if (search)     q = q.or(`product_name.ilike.%${search}%,sku.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) throw new ApiError(500, error.message);

  let rows = data.map(decorate);
  if (stockStatus) rows = rows.filter((r) => r.stock_status === stockStatus);
  ok(res, rows);
});

/** GET /api/products/:id */
export const getProduct = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products').select(SELECT).eq('product_id', req.params.id).single();
  if (error || !data) throw ApiError.notFound('Product not found');

  const { data: movements } = await supabaseAdmin
    .from('stock_movements')
    .select('movement_id, movement_type, quantity, reason, date_recorded, recorded_by:users ( full_name )')
    .eq('product_id', req.params.id)
    .order('date_recorded', { ascending: false })
    .limit(20);

  ok(res, { ...decorate(data), recentMovements: movements || [] });
});

/** POST /api/products - creates the product and its inventory row together. */
export const createProduct = asyncHandler(async (req, res) => {
  const b = req.body;

  const { data: product, error } = await supabaseAdmin.from('products').insert({
    product_name: b.productName,
    sku: b.sku,
    category_id: b.categoryId ?? null,
    supplier_id: b.supplierId ?? null,
    unit_price: b.unitPrice,
    unit_of_measure: b.unitOfMeasure,
    expiration_date: b.expirationDate || null,
    status: b.status,
  }).select().single();

  if (error) {
    if (error.code === '23505') throw ApiError.conflict(`SKU "${b.sku}" is already in use`);
    throw new ApiError(500, error.message);
  }

  const { error: invError } = await supabaseAdmin.from('inventory').insert({
    product_id: product.product_id,
    current_stock: b.currentStock,
    minimum_stock: b.minimumStock,
    reorder_point: b.reorderPoint,
    location: b.location,
    updated_by: req.user.id,
  });
  if (invError) {
    await supabaseAdmin.from('products').delete().eq('product_id', product.product_id);
    throw new ApiError(500, invError.message);
  }

  // NOTE: the opening balance is set directly on the inventory row above.
  // It is deliberately NOT written as a stock movement, because the
  // trg_apply_stock_movement trigger would then add the quantity a second time.
  // Every change after this point must go through /api/movements.

  await logActivity(req.user.id, 'create_product', 'products', product.product_id, { sku: b.sku });
  const { data: full } = await supabaseAdmin
    .from('products').select(SELECT).eq('product_id', product.product_id).single();
  created(res, decorate(full));
});

/** PATCH /api/products/:id */
export const updateProduct = asyncHandler(async (req, res) => {
  const b = req.body;
  const productPatch = {};
  if (b.productName    !== undefined) productPatch.product_name    = b.productName;
  if (b.sku            !== undefined) productPatch.sku             = b.sku;
  if (b.categoryId     !== undefined) productPatch.category_id     = b.categoryId;
  if (b.supplierId     !== undefined) productPatch.supplier_id     = b.supplierId;
  if (b.unitPrice      !== undefined) productPatch.unit_price      = b.unitPrice;
  if (b.unitOfMeasure  !== undefined) productPatch.unit_of_measure = b.unitOfMeasure;
  if (b.expirationDate !== undefined) productPatch.expiration_date = b.expirationDate || null;
  if (b.status         !== undefined) productPatch.status          = b.status;

  if (Object.keys(productPatch).length) {
    const { error } = await supabaseAdmin
      .from('products').update(productPatch).eq('product_id', req.params.id);
    if (error) {
      if (error.code === '23505') throw ApiError.conflict('That SKU is already in use');
      throw new ApiError(500, error.message);
    }
  }

  // Thresholds live on inventory. current_stock is deliberately NOT editable here -
  // stock only changes through a recorded movement, which is what makes shrinkage traceable.
  const invPatch = {};
  if (b.minimumStock !== undefined) invPatch.minimum_stock = b.minimumStock;
  if (b.reorderPoint !== undefined) invPatch.reorder_point = b.reorderPoint;
  if (b.location     !== undefined) invPatch.location      = b.location;
  if (Object.keys(invPatch).length) {
    invPatch.updated_by = req.user.id;
    invPatch.last_updated = new Date().toISOString();
    await supabaseAdmin.from('inventory').update(invPatch).eq('product_id', req.params.id);
  }

  await refreshAlertsForProduct(Number(req.params.id));
  await logActivity(req.user.id, 'update_product', 'products', req.params.id, { ...productPatch, ...invPatch });

  const { data: full } = await supabaseAdmin
    .from('products').select(SELECT).eq('product_id', req.params.id).single();
  if (!full) throw ApiError.notFound('Product not found');
  ok(res, decorate(full));
});

/** DELETE /api/products/:id */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('products').delete().eq('product_id', req.params.id);
  if (error) throw new ApiError(500, error.message);
  await logActivity(req.user.id, 'delete_product', 'products', req.params.id);
  noContent(res);
});
