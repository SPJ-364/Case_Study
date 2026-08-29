import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/respond.js';
import { logActivity } from '../services/activityLog.service.js';

/** GET /api/roles - roles with their permission codes and user counts. */
export const listRoles = asyncHandler(async (_req, res) => {
  const { data: roles, error } = await supabaseAdmin
    .from('roles')
    .select('role_id, role_code, role_name, description, is_system, role_permissions ( permissions ( permission_id, permission_code, module, description ) )')
    .order('role_id');
  if (error) throw new ApiError(500, error.message);

  const { data: users } = await supabaseAdmin.from('users').select('role_id, is_active');

  ok(res, roles.map((r) => ({
    roleId: r.role_id,
    roleCode: r.role_code,
    roleName: r.role_name,
    description: r.description,
    isSystem: r.is_system,
    userCount: (users || []).filter((u) => u.role_id === r.role_id && u.is_active).length,
    permissions: (r.role_permissions || []).map((rp) => rp.permissions).filter(Boolean),
  })));
});

/** GET /api/roles/permissions - the full permission catalogue, grouped by module. */
export const listPermissions = asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('permissions')
    .select('permission_id, permission_code, module, description')
    .order('module').order('permission_code');
  if (error) throw new ApiError(500, error.message);

  const grouped = data.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});
  ok(res, { permissions: data, grouped });
});

export const createRoleSchema = z.object({
  roleCode: z.string().min(3).regex(/^[a-z_]+$/, 'Lowercase letters and underscores only'),
  roleName: z.string().min(3),
  description: z.string().optional().nullable(),
  permissionIds: z.array(z.coerce.number().int().positive()).default([]),
});

/** POST /api/roles */
export const createRole = asyncHandler(async (req, res) => {
  const { roleCode, roleName, description, permissionIds } = req.body;

  const { data: role, error } = await supabaseAdmin
    .from('roles')
    .insert({ role_code: roleCode, role_name: roleName, description, is_system: false })
    .select().single();
  if (error) {
    if (error.code === '23505') throw ApiError.conflict('A role with that code already exists');
    throw new ApiError(500, error.message);
  }

  if (permissionIds.length) {
    await supabaseAdmin.from('role_permissions')
      .insert(permissionIds.map((id) => ({ role_id: role.role_id, permission_id: id })));
  }

  await logActivity(req.user.id, 'create_role', 'roles', role.role_id, { roleCode });
  created(res, role);
});

export const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.coerce.number().int().positive()),
});

/** PUT /api/roles/:id/permissions - replaces the role's permission set. */
export const updateRolePermissions = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id);
  const { permissionIds } = req.body;

  const { data: role } = await supabaseAdmin
    .from('roles').select('role_id, role_code').eq('role_id', roleId).single();
  if (!role) throw ApiError.notFound('Role not found');
  if (role.role_code === 'super_admin') {
    throw ApiError.forbidden('Super Admin permissions cannot be reduced.');
  }

  await supabaseAdmin.from('role_permissions').delete().eq('role_id', roleId);
  if (permissionIds.length) {
    const { error } = await supabaseAdmin.from('role_permissions')
      .insert(permissionIds.map((id) => ({ role_id: roleId, permission_id: id })));
    if (error) throw new ApiError(500, error.message);
  }

  await logActivity(req.user.id, 'update_role_permissions', 'roles', roleId, { count: permissionIds.length });
  ok(res, { roleId, permissionIds });
});

/** DELETE /api/roles/:id */
export const deleteRole = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id);
  const { data: role } = await supabaseAdmin
    .from('roles').select('is_system, role_code').eq('role_id', roleId).single();
  if (!role) throw ApiError.notFound('Role not found');
  if (role.is_system) throw ApiError.forbidden('System roles cannot be deleted');

  const { count } = await supabaseAdmin
    .from('users').select('user_id', { count: 'exact', head: true }).eq('role_id', roleId);
  if (count) throw ApiError.conflict(`${count} user(s) still use this role. Reassign them first.`);

  await supabaseAdmin.from('roles').delete().eq('role_id', roleId);
  await logActivity(req.user.id, 'delete_role', 'roles', roleId);
  ok(res, { message: 'Role deleted' });
});
