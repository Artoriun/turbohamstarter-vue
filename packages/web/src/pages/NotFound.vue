<!-- Mirrors packages/web/src/pages/NotFound.tsx. -->
<script setup lang="ts">
import { useT } from '../i18n';

const t = useT();
</script>

<template>
  <div class="page prose">
    <h1>{{ t.notFound.title }}</h1>
    <p>{{ t.notFound.body }}</p>
    <RouterLink class="btn btn-primary" to="/">{{ t.notFound.back }}</RouterLink>
  </div>
</template>
