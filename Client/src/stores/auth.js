import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api';

const TOKEN_KEY = 'ims_access_token';
const USER_KEY  = 'ims_user';

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'));
  const token   = ref(localStorage.getItem(TOKEN_KEY) || null);
  const loading = ref(false);
  const error   = ref(null);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const roleCode = computed(() => user.value?.role?.role_code ?? null);
  const roleName = computed(() => user.value?.role?.role_name ?? '');
  const permissions = computed(() => user.value?.permissions ?? []);

  /** True when the signed-in role holds every listed permission. */
  const can = (...codes) => codes.every((c) => permissions.value.includes(c));
  /** True when the signed-in role holds at least one listed permission. */
  const canAny = (...codes) => codes.some((c) => permissions.value.includes(c));

  const persist = (nextUser, nextToken) => {
    user.value = nextUser;
    token.value = nextToken;
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_KEY);
  };

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await authApi.login(email, password);
      persist(result.user, result.session.accessToken);
      return result.user;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try { if (token.value) await authApi.logout(); } catch { /* ignore */ }
    persist(null, null);
  };

  /** Re-reads the profile so permission changes take effect without re-login. */
  const refreshProfile = async () => {
    if (!token.value) return null;
    try {
      const me = await authApi.me();
      persist({ ...me, id: me.id }, token.value);
      return me;
    } catch {
      persist(null, null);
      return null;
    }
  };

  /** Drops the session locally. Called on sign-out and on any 401. */
  const clearSession = () => persist(null, null);

  return {
    user, token, loading, error,
    isAuthenticated, roleCode, roleName, permissions,
    can, canAny, login, logout, refreshProfile, clearSession,
  };
});
