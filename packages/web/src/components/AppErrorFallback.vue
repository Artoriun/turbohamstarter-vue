<!-- What ErrorBoundary.vue shows in place of a crashed tree — mirrors
     packages/web/src/components/AppErrorFallback.tsx. -->
<script setup lang="ts">
import { useT } from '../i18n';

defineProps<{ retry: () => void }>();
const t = useT();
</script>

<template>
  <div class="page error-page" role="alert">
    <h1>{{ t.error.title }}</h1>
    <p>{{ t.error.body }}</p>
    <div class="error-actions">
      <button type="button" class="btn btn-primary" @click="retry">{{ t.error.reload }}</button>
      <RouterLink class="btn" to="/">{{ t.error.home }}</RouterLink>
    </div>
  </div>
</template>
