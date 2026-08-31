<!--
  One slide's fields within a carousel card — mirrors the SlideEditor function in
  packages/web/src/pages/Admin.tsx. Same shape as a section's own heading/body/
  translations/image editor, one level deeper. Mutations flow back through emits rather
  than an id lookup, since a slide only exists inside its section's `slides` array.
-->
<script setup lang="ts">
import type { CarouselSlide } from '@hamstarter/shared';
import { useT } from '../../i18n';
import { optimizeUrl } from '../../lib/images';
import TranslationFields from './TranslationFields.vue';

const props = defineProps<{ slide: CarouselSlide; offendingWords: string[] }>();
const emit = defineEmits<{
  edit: [patch: Partial<CarouselSlide>];
  remove: [];
  uploadImage: [file: File];
}>();

const t = useT();

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emit('uploadImage', file);
}
</script>

<template>
  <li class="admin-slide">
    <label :for="`slide-heading-${slide.id}`">{{ t.admin.heading }}</label>
    <input
      :id="`slide-heading-${slide.id}`"
      :value="slide.heading"
      @input="emit('edit', { heading: ($event.target as HTMLInputElement).value })"
    />

    <label :for="`slide-body-${slide.id}`">{{ t.admin.body }}</label>
    <textarea
      :id="`slide-body-${slide.id}`"
      rows="3"
      :value="slide.body"
      @input="emit('edit', { body: ($event.target as HTMLTextAreaElement).value })"
    />

    <TranslationFields
      :translations="slide.translations"
      :default-heading="slide.heading"
      :default-body="slide.body"
      @edit="(translations) => emit('edit', { translations })"
    />

    <label :for="`slide-image-${slide.id}`">{{ t.admin.image }}</label>
    <input :id="`slide-image-${slide.id}`" type="file" accept="image/*" @change="onFileChange" />
    <img v-if="slide.image" class="admin-thumb" :src="optimizeUrl(slide.image, 240)" alt="" width="120" />

    <p v-if="offendingWords.length > 0" class="admin-warning" role="status">
      {{ t.admin.blockedWarning }} {{ offendingWords.join(', ') }}
    </p>

    <button type="button" class="btn btn-sm btn-danger" @click="emit('remove')">{{ t.admin.deleteSlide }}</button>
  </li>
</template>
