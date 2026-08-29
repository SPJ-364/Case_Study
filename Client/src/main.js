import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { setUnauthorizedHandler } from './api/client';
import './assets/main.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);

/**
 * A 401 from any request means the session is no longer valid - most often
 * because the access token expired while the tab was open. Clear it AND send
 * the user back to sign in; otherwise they are left on a page whose data can
 * never load.
 */
setUnauthorizedHandler(() => {
  const auth = useAuthStore();
  auth.clearSession();

  const current = router.currentRoute.value;
  if (!current.meta.public) {
    router.replace({ name: 'login', query: { redirect: current.fullPath } });
  }
});

app.mount('#app');
