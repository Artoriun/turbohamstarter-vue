<!-- Mirrors the SignIn function in packages/web/src/pages/Admin.tsx. -->
<script setup lang="ts">
import { ref } from 'vue';
import { useT } from '../../i18n';
import { apiLogin, setToken } from '../../lib/api';

const emit = defineEmits<{ success: [] }>();

const props = defineProps<{ expired?: boolean }>();
const t = useT();
const password = ref('');
// Seeded from the gate: a session that ran out says so, instead of presenting a bare form
// where an action was a moment ago.
const error = ref(props.expired ? t.value.admin.sessionExpired : '');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    setToken(await apiLogin(password.value));
    emit('success');
  } catch {
    // Deliberately one message for both a wrong password and an unreachable API: the
    // distinction is useful to an attacker enumerating whether the portal is live.
    error.value = t.value.admin.wrongPassword;
  } finally {
    busy.value = false;
    password.value = '';
  }
}
</script>

<template>
  <div class="page prose admin-signin">
    <h1>{{ t.admin.title }}</h1>
    <form class="contact-form" @submit.prevent="submit">
      <label for="password">{{ t.admin.password }}</label>
      <input id="password" v-model="password" type="password" autocomplete="current-password" />
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-sm btn-primary" :disabled="busy">{{ t.admin.signIn }}</button>
    </form>
  </div>
</template>
