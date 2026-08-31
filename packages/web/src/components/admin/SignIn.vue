<!-- Mirrors the SignIn function in packages/web/src/pages/Admin.tsx. -->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useT } from '../../i18n';
import { apiLogin, setToken, TooManyAttemptsError } from '../../lib/api';

/**
 * m:ss for a countdown. The thirty-second lockout would read fine as plain seconds, but the
 * fifteen-minute limit behind it would not — "try again in 873s" is a number nobody converts.
 */
const countdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const emit = defineEmits<{ success: [] }>();

const props = defineProps<{ expired?: boolean }>();
const t = useT();
const password = ref('');
// Seeded from the gate: a session that ran out says so, instead of presenting a bare form
// where an action was a moment ago.
const error = ref(props.expired ? t.value.admin.sessionExpired : '');
const busy = ref(false);
/** Seconds left on the three-strikes lockout; 0 when the form is usable. */
const lockedFor = ref(0);
const lockMessage = computed(() =>
  lockedFor.value ? t.value.admin.lockedOut.replace('{time}', countdown(lockedFor.value)) : '',
);

// A timeout that reschedules itself rather than an interval. Over thirty seconds the drift
// is invisible, and this needs no separate path for the moment it reaches zero.
let tick: ReturnType<typeof setTimeout> | null = null;
watch(lockedFor, (left) => {
  if (tick) clearTimeout(tick);
  tick = left ? setTimeout(() => (lockedFor.value = left - 1), 1000) : null;
});
onUnmounted(() => {
  if (tick) clearTimeout(tick);
});

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    setToken(await apiLogin(password.value));
    emit('success');
  } catch (err) {
    if (err instanceof TooManyAttemptsError) {
      // The one exception to the rule below: a lockout shown as "incorrect password" is a
      // support call from someone typing a password they know is right. The person seeing
      // this is the one who caused it, so it tells an attacker nothing new.
      lockedFor.value = err.retryAfter ?? 0;
      if (!err.retryAfter) error.value = t.value.admin.tooManyAttempts;
    } else {
      // Deliberately one message for both a wrong password and an unreachable API: the
      // distinction is useful to an attacker enumerating whether the portal is live.
      error.value = t.value.admin.wrongPassword;
    }
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
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        :disabled="lockedFor > 0"
      />
      <p v-if="lockMessage || error" class="form-error" role="alert">{{ lockMessage || error }}</p>
      <button type="submit" class="btn btn-sm btn-primary" :disabled="busy || lockedFor > 0">{{ t.admin.signIn }}</button>
    </form>
  </div>
</template>
