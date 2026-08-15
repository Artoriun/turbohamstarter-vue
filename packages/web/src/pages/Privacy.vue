<!-- Mirrors packages/web/src/pages/Privacy.tsx. -->
<script setup lang="ts">
import HamsterLawyer from '../components/HamsterLawyer.vue';
import { useT } from '../i18n';

const t = useT();
</script>

<template>
  <div class="page prose">
    <h1 class="title-accent">{{ t.privacy.title }}</h1>
    <p>{{ t.privacy.body }}</p>
    <HamsterLawyer />
  </div>
</template>
