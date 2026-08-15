<!-- Mirrors packages/web/src/pages/About.tsx. -->
<script setup lang="ts">
import { localise } from '@hamstarter/shared';
import { computed } from 'vue';
import HamsterCoding from '../components/HamsterCoding.vue';
import Item from '../components/Item.vue';
import ProjectCarousel from '../components/ProjectCarousel.vue';
import { usePageSections } from '../composables/content';
import { useLang } from '../i18n';
import { optimizeUrl } from '../lib/images';

const sections = usePageSections('about');
const { lang } = useLang();
// The h1 goes to the first *text* section — a carousel section can sort ahead of it
// without displacing which one gets it. See the matching note in Home.vue.
const heroSection = computed(() => sections.value.find((s) => s.kind !== 'carousel'));
const numbered = computed(() => sections.value.filter((s) => s.kind !== 'carousel'));
</script>

<template>
  <div class="page">
    <HamsterCoding />
    <template v-for="section in sections" :key="section.id">
      <Item v-if="section.kind === 'carousel'">
        <ProjectCarousel :slides="section.slides ?? []" />
      </Item>
      <Item v-else>
        <section class="content-section">
          <p class="eyebrow">{{ String(numbered.indexOf(section) + 1).padStart(2, '0') }}</p>
          <img
            v-if="section.image"
            class="section-image"
            :src="optimizeUrl(section.image, 800)"
            alt=""
            :loading="section === heroSection ? 'eager' : 'lazy'"
            decoding="async"
          />
          <!-- The first text section carries the page's h1; the rest are subsections. -->
          <h1 v-if="section === heroSection">{{ localise(section, lang).heading }}</h1>
          <h2 v-else>{{ localise(section, lang).heading }}</h2>
          <p>{{ localise(section, lang).body }}</p>
        </section>
      </Item>
    </template>
  </div>
</template>
