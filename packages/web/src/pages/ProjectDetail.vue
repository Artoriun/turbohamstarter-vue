<!--
  The "project explanation page" a carousel slide links to — mirrors
  packages/web/src/pages/ProjectDetail.tsx. One route, `:id` looked up across every
  carousel-kind section's `slides` — wherever the carousel itself lives, its slides all
  resolve here the same way. See the note on Section.slides in packages/shared.
-->
<script setup lang="ts">
import { findSlide, localise } from '@hamstarter/shared';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Item from '../components/Item.vue';
import { useContent } from '../composables/content';
import { useLang } from '../i18n';
import { optimizeUrl } from '../lib/images';
import { DEFAULT_PROJECT_IMAGES } from '../lib/projectAssets';
import NotFound from './NotFound.vue';

const route = useRoute();
const { state } = useContent();
const { lang } = useLang();

const slide = computed(() => {
  const id = route.params.id;
  return typeof id === 'string' ? findSlide(id, state.sections) : undefined;
});

// A deleted slide, or one not yet reached by a rebuild (see the ROUTES comment in
// packages/shared), reads the same as any other missing page rather than a broken one.
const localised = computed(() => (slide.value ? localise(slide.value, lang.value) : null));
// The bundled default is pixel art and wants image-rendering: pixelated so it stays crisp
// at display size; an admin-uploaded photo replacing it should scale normally.
const isDefaultImage = computed(() => !!slide.value && !slide.value.image);
const image = computed(() =>
  slide.value ? slide.value.image || DEFAULT_PROJECT_IMAGES[slide.value.id] || '' : '',
);
</script>

<template>
  <NotFound v-if="!slide" />
  <div v-else class="page">
    <Item>
      <section class="content-section">
        <img
          v-if="image"
          :class="isDefaultImage ? 'section-image pixel-img' : 'section-image'"
          :src="optimizeUrl(image, 900)"
          alt=""
          loading="eager"
          decoding="async"
        />
        <h1 class="title-accent">{{ localised?.heading }}</h1>
        <p>{{ localised?.body }}</p>
      </section>
    </Item>
  </div>
</template>
