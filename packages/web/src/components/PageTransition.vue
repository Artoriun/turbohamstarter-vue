<script setup lang="ts">
import { watch } from 'vue';
import { navState } from '../lib/navState';

/**
 * Route transitions — mirrors packages/web/src/components/PageTransition.tsx. `path` is
 * passed by the caller (RouterView's `v-slot="{ route }"`) rather than read from useRoute()
 * here, for the same reason as the React version reads it from a prop: it must stay pinned
 * to whichever page this instance was rendered for.
 */
const props = defineProps<{ path: string }>();
const landedOn = props.path;

watch(
  () => props.path,
  (path) => {
    if (path !== landedOn) navState.hasNavigated = true;
  },
);
</script>

<template>
  <!--
    The page a visitor lands on renders with no transition wrapper at all — see
    navState.ts and the .page-landing/.page-rise CSS in global.css, which is what actually
    staggers each section in. Adding a keyed Transition here too would mean the very first
    paint carries an inline style Vue writes for the transition, and while Vue's hydration
    is more forgiving of a mismatch than React's, there is no reason to risk the Largest
    Contentful Paint candidate over it when the CSS-only path already exists.
  -->
  <div v-if="!navState.hasNavigated" class="page-landing" style="width: 100%">
    <slot />
  </div>
  <!--
    appear matters here specifically: this <Transition> doesn't exist in the DOM until the
    v-if above first flips (see navState.ts) — Vue mounting a <Transition> for the first
    time doesn't animate its initial child without `appear`, and that "initial child" is
    the very first post-navigation page. Every navigation after this one re-uses the same
    already-mounted <Transition> and animates normally either way.
  -->
  <Transition v-else name="route" mode="out-in" appear>
    <div :key="path" style="width: 100%">
      <slot />
    </div>
  </Transition>
</template>
