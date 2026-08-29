/**
 * Creates one demo account per role so the prototype can be logged into
 * immediately after running the SQL files.
 *
 *   npm run seed:users
 *
 * Safe to re-run: accounts that already exist are skipped.
 */
import { supabaseAdmin } from '../src/config/supabase.js';

const ACCOUNTS = [
  { roleCode: 'super_admin',     fullName: 'Jhanyz Laviña',      username: 'superadmin', email: 'superadmin@ims.local', password: 'SuperAdmin123!', position: 'System Administrator' },
  { roleCode: 'warehouse_admin', fullName: 'Mark Francis Entredicho', username: 'warehouse', email: 'warehouse@ims.local',  password: 'Warehouse123!',  position: 'Warehouse Supervisor' },
  { roleCode: 'staff_admin',     fullName: 'Seichi Paul Jimenez', username: 'staffadmin', email: 'staff@ims.local',      password: 'StaffAdmin123!', position: 'HR / Staff Officer' },
  { roleCode: 'finance_admin',   fullName: 'Eckery Vraime Delgado', username: 'finance',  email: 'finance@ims.local',    password: 'Finance123!',    position: 'Finance Officer' },
];

const run = async () => {
  const { data: roles, error } = await supabaseAdmin.from('roles').select('role_id, role_code');
  if (error) throw error;
  if (!roles?.length) {
    console.error('No roles found. Run supabase/04_seed.sql first.');
    process.exit(1);
  }
  const roleMap = Object.fromEntries(roles.map((r) => [r.role_code, r.role_id]));

  for (const acct of ACCOUNTS) {
    const roleId = roleMap[acct.roleCode];
    if (!roleId) { console.warn(`  skip ${acct.email} - role ${acct.roleCode} missing`); continue; }

    const { data: existing } = await supabaseAdmin
      .from('users').select('user_id').eq('email', acct.email).maybeSingle();
    if (existing) { console.log(`  exists  ${acct.email}`); continue; }

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: acct.email, password: acct.password, email_confirm: true,
      user_metadata: { full_name: acct.fullName, username: acct.username },
    });
    if (authErr) { console.error(`  FAILED  ${acct.email}: ${authErr.message}`); continue; }

    const { error: profErr } = await supabaseAdmin.from('users').insert({
      user_id: authUser.user.id,
      full_name: acct.fullName,
      username: acct.username,
      email: acct.email,
      role_id: roleId,
      position: acct.position,
    });
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error(`  FAILED  ${acct.email}: ${profErr.message}`);
      continue;
    }
    console.log(`  created ${acct.email.padEnd(24)} ${acct.password}`);
  }

  console.log('\nDone. Sign in at the frontend with any account above.\n');
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
