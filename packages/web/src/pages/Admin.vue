<!--
  The whole admin portal: sign in, edit content, reorder, upload an image — mirrors
  packages/web/src/pages/Admin.tsx. Lazy-loaded via router.ts so none of this ships in the
  bundle a visitor downloads, and excluded from the prerender so the portal is never part of
  the static HTML.

  Provides its own scoped language instance, pinned to DEFAULT_LANG: whoever is editing
  content might have arrived via /admin or /ja/admin depending on whatever page they were
  last looking at, and the portal's own UI (Save, Sections, the field labels) should read
  the same either way rather than depending on that accident of navigation. Scoped so the
  language toggle in the shared Header — a sibling of this component, not a descendant, so
  it's unaffected and keeps reading the site-wide instance — still works normally and
  doesn't get pulled into this override.
-->
<script setup lang="ts">
import { DEFAULT_LANG } from '@hamstarter/shared';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import AdminPanel from '../components/admin/AdminPanel.vue';
import SignIn from '../components/admin/SignIn.vue';
import { provideLanguage } from '../i18n';
import { apiRefreshToken, clearToken, getToken, SESSION_EXPIRED_EVENT } from '../lib/api';

provideLanguage({ scoped: true, defaultLang: DEFAULT_LANG });

const signedIn = ref(!!getToken());
const expired = ref(false);

/**
 * How often the open portal considers renewing its token. Well under the three days of
 * headroom `apiRefreshToken` waits for, so a tab left open overnight is still covered, and
 * the call is a no-op on all but the last few days of a session.
 */
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

// A 401, or a token that ran out while this tab sat open. Either way the sign-in form comes
// back with a reason, rather than the next action simply failing.
function onExpired() {
  signedIn.value = false;
  expired.value = true;
}

onMounted(() => {
  window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
});

onUnmounted(() => {
  window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  if (refreshTimer) clearInterval(refreshTimer);
});

watch(
  signedIn,
  (isIn) => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (!isIn) return;
    void apiRefreshToken();
    refreshTimer = setInterval(() => void apiRefreshToken(), REFRESH_INTERVAL_MS);
  },
  { immediate: true },
);

function onSuccess() {
  expired.value = false;
  signedIn.value = true;
}

function onSignOut() {
  clearToken();
  signedIn.value = false;
}
</script>

<template>
  <SignIn v-if="!signedIn" :expired="expired" @success="onSuccess" />
  <AdminPanel v-else @sign-out="onSignOut" />
</template>
