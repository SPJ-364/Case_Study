import { z } from 'zod';
import { supabaseAnon, supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { logActivity } from '../services/activityLog.service.js';

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/** POST /api/auth/login - authenticates and returns the session + role + permissions. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error || !data?.session) throw ApiError.unauthorized('Incorrect email or password');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, username, email, is_active, position, role:roles ( role_id, role_code, role_name )')
    .eq('user_id', data.user.id)
    .single();

  if (profileError || !profile) throw ApiError.forbidden('No profile is linked to this account.');
  if (!profile.is_active) throw ApiError.forbidden('This account has been deactivated.');

  const { data: perms } = await supabaseAdmin
    .from('role_permissions')
    .select('permissions ( permission_code )')
    .eq('role_id', profile.role.role_id);

  await logActivity(profile.user_id, 'login', 'auth', profile.user_id);

  ok(res, {
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
    user: {
      id: profile.user_id,
      fullName: profile.full_name,
      username: profile.username,
      email: profile.email,
      position: profile.position,
      role: profile.role,
      permissions: (perms || []).map((p) => p.permissions.permission_code),
    },
  });
});

/** GET /api/auth/me - returns the caller loaded by the authenticate middleware. */
export const me = asyncHandler(async (req, res) => ok(res, req.user));

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req, res) => {
  await logActivity(req.user.id, 'logout', 'auth', req.user.id);
  ok(res, { message: 'Signed out' });
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

/** POST /api/auth/refresh */
export const refresh = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: req.body.refreshToken,
  });
  if (error || !data?.session) throw ApiError.unauthorized('Session could not be refreshed');
  ok(res, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  });
});
