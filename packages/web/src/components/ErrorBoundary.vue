<!--
  Catches render errors below it and shows something readable instead of an empty page —
  mirrors packages/web/src/components/ErrorBoundary.tsx. Vue's equivalent of React's
  componentDidCatch/getDerivedStateFromError is the onErrorCaptured hook: it catches errors
  thrown during a descendant's render, setup, lifecycle hooks or watchers, same scope as a
  React error boundary (its own errors are not caught, only children's).

  Deliberately renders no wrapper element around the slot in the non-error case (just the
  slot itself), so it cannot disturb hydration of the prerendered markup.
-->
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { reportError } from '../lib/reportError';
import AppErrorFallback from './AppErrorFallback.vue';

const error = ref<Error | null>(null);

onErrorCaptured((err, instance, info) => {
  const asError = err instanceof Error ? err : new Error(String(err));
  const component = instance?.$options.name ?? instance?.$.type.__name ?? info;
  console.error('[ErrorBoundary]', asError, component);
  // Also sent to the API, which logs it server-side. The console alone is only ever read
  // by whoever happens to have devtools open, which is nobody.
  reportError(asError, component);
  error.value = asError;
  // Stops the error propagating further (to a parent boundary or the global handler) —
  // this boundary has already handled it.
  return false;
});

function retry() {
  error.value = null;
}
</script>

<template>
  <AppErrorFallback v-if="error" :retry="retry" />
  <slot v-else />
</template>
