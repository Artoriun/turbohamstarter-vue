<script setup lang="ts">
// Mirrors packages/web/src/components/PageTransition.tsx's `Item`. Unlike there, this has
// no JS branch at all: both the landing stagger and the post-navigation stagger are pure
// CSS, keyed off `.page-landing .page > *` and `.route-enter-active .page > *` respectively
// (see global.css) matching this element positionally, so a plain wrapper is all it needs
// to be — Motion's per-item variant in the React version has no Vue equivalent to write.
</script>

<template>
  <div><slot /></div>
</template>
