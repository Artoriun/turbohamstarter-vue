<script setup lang="ts">
/**
 * The mascot's name in body copy: accented, and pressable to show who is being referred to.
 * See MascotMention.tsx for why the name is matched in the text rather than marked up in the
 * content, and why the lookahead for "starter" is not optional.
 */
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { useT } from '../i18n';
import TurboHam from './TurboHam.vue';

const t = useT();
const open = ref(false);
const wrap = ref<HTMLElement | null>(null);
const popId = useId();

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') open.value = false;
};
const onDown = (e: PointerEvent) => {
  if (!wrap.value?.contains(e.target as Node)) open.value = false;
};

// Dismissal, both ways a disclosure is expected to close. Not a modal: focus stays on the
// button and there is nothing inside to tab to, so a focus trap would be wrong here rather
// than merely unnecessary.
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
  } else {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onDown);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('pointerdown', onDown);
});
</script>

<template>
  <span ref="wrap" class="mascot-mention">
    <button
      type="button"
      class="mascot-mention-btn"
      :aria-expanded="open"
      :aria-controls="popId"
      @click="open = !open"
    >TurboHam</button>
    <span v-if="open" :id="popId" class="mascot-pop" role="status">
      <TurboHam class="mascot-pop-sprite" />
      <span class="mascot-pop-label">{{ t.home.mascotHint }}</span>
    </span>
  </span>
</template>
