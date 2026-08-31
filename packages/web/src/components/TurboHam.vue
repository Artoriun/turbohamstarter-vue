<!--
  Mirrors packages/web/src/components/TurboHam.tsx — the sprite-sheet mascot, all timing
  driven by CSS (see global.css) rather than an inline style, so there's nothing here for
  prerendering/hydration to disagree about either way.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{ class?: string }>(), { class: '' });
</script>

<template>
  <span :class="`mascot ${props.class}`.trim()" aria-hidden="true" />
</template>
