<!--
  The wrapper, mascot placement and desk shared by HamsterCoding, HamsterWriting and
  HamsterLawyer — one consistent "TurboHam at his desk" set piece the three illustrations
  are variations on, factored out rather than repeated three times over. Mirrors
  packages/web/src/components/HamsterScene.tsx.

  The mascot itself is .hamster-scene-mascot, a real element carrying the exact same
  background-image + `hamster-idle` animation as the header's .mascot (see global.css,
  and TurboHam.vue for the header's own copy) — not pixel data re-drawn as SVG rects.
  That's what makes its animation the literal same one the header plays rather than a
  separately hand-built approximation of it. It sits outside the props SVG below
  (absolutely positioned over it, see global.css) because a sprite-sheet background-image
  has no equivalent inside SVG markup the way it does on an HTML element.
-->
<script setup lang="ts">
// No props, no state — a pure layout wrapper around whatever scene-specific props
// (screen/paper/gavel) the caller passes as its slot.
</script>

<template>
  <div class="hamster-scene" aria-hidden="true">
    <span class="hamster-scene-mascot" />
    <svg viewBox="0 0 32 20" class="hamster-scene-props" shape-rendering="crispEdges">
      <slot />
      <rect x="0" y="16" width="32" height="2" fill="#a9784f" />
      <rect x="0" y="18" width="32" height="2" fill="#7a5636" />
    </svg>
  </div>
</template>
