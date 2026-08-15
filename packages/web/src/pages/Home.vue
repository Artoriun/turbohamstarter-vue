<!-- Mirrors packages/web/src/pages/Home.tsx. -->
<script setup lang="ts">
import { localise, splitOnMascot } from '@hamstarter/shared';
import { computed } from 'vue';
import Item from '../components/Item.vue';
import MascotMention from '../components/MascotMention.vue';
import ProjectCarousel from '../components/ProjectCarousel.vue';
import { usePageSections } from '../composables/content';
import { useLang, useT } from '../i18n';
import { optimizeUrl } from '../lib/images';

/**
 * Wraps the part of a heading that carries the accent.
 *
 * Two shapes, checked in this order:
 *
 * 1. **A leading label** — `Name: the rest of it`. The label is accented and the remainder
 *    is plain, so the heading reads as a name being declared.
 * 2. **A trailing clause** — everything after the first sentence break, which is the older
 *    device and still what a two-sentence heading gets.
 *
 * Both are derived from punctuation rather than from any particular words, so an
 * admin-written heading in either shape gets the treatment without the code knowing what it
 * says. The label case is length-capped: without that, a colon deep inside a long sentence
 * would accent most of the heading.
 *
 * See splitHeading in Home.tsx for the full reasoning.
 *
 * Matches the Japanese colon and full stop alongside the Latin ones. A split on ". " alone
 * silently skipped every Japanese heading — 。 is not followed by a space — so the accent
 * device that defines the hero simply did not appear on half the site.
 */
function splitHeading(heading: string): { lead: string; rest: string; accentLead: boolean } | null {
  const label = heading.match(/^([^\s:：][^:：]{0,28}[:：])\s*(.+)$/s);
  if (label) {
    const [, name, rest] = label;
    // The full-width colon carries its own trailing space, so adding one doubles the gap.
    // Keyed on the punctuation rather than on the label's script: this label is
    // "TurboHamstarter：" — Latin letters and a Japanese colon — so a test for Japanese
    // characters in the label finds none and wrongly adds the space.
    const wideColon = name.endsWith('：');
    return { lead: name, rest: wideColon ? rest : ` ${rest}`, accentLead: true };
  }

  const match = heading.match(/^(.*?[.。…])\s*(.+)$/s);
  if (!match) return null;
  const [, first, rest] = match;
  const isJapanese = /[぀-ヿ一-鿿]/.test(first);
  return { lead: isJapanese ? first : `${first} `, rest, accentLead: false };
}

const sections = usePageSections('home');
const t = useT();
const { lang } = useLang();

const hero = computed(() => sections.value.find((s) => s.kind !== 'carousel'));
const numbered = computed(() =>
  sections.value.filter((s) => s.kind !== 'carousel' && s !== hero.value),
);
const heroBodyParts = computed(() =>
  hero.value ? splitOnMascot(localise(hero.value, lang.value).body) : [],
);
const heroHeading = computed(() =>
  hero.value ? splitHeading(localise(hero.value, lang.value).heading) : null,
);
</script>

<template>
  <div class="page">
    <template v-for="section in sections" :key="section.id">
      <Item v-if="section.kind === 'carousel'">
        <ProjectCarousel :slides="section.slides ?? []" />
      </Item>

      <Item v-else-if="section === hero">
        <section class="hero">
          <p class="eyebrow">{{ t.home.eyebrow }}</p>
          <!-- A heading of the form "Something. So we built it." renders its second
               sentence italic and in the accent colour, the source's signature device.
               Headings without a second sentence are unaffected. -->
          <h1 v-if="heroHeading && heroHeading.accentLead">
            <em>{{ heroHeading.lead }}</em>{{ heroHeading.rest }}
          </h1>
          <h1 v-else-if="heroHeading">{{ heroHeading.lead }}<em>{{ heroHeading.rest }}</em></h1>
          <h1 v-else>{{ localise(hero, lang).heading }}</h1>
          <p class="lead"><template v-for="(part, i) in heroBodyParts" :key="i"><MascotMention v-if="i > 0" />{{ part }}</template></p>
          <div class="hero-actions">
            <RouterLink class="btn btn-primary" to="/contact">{{ t.home.ctaContact }}</RouterLink>
            <RouterLink class="btn" to="/about">{{ t.home.ctaAbout }}</RouterLink>
          </div>
        </section>
      </Item>

      <Item v-else>
        <section class="content-section">
          <p class="eyebrow">{{ String(numbered.indexOf(section) + 1).padStart(2, '0') }}</p>
          <img
            v-if="section.image"
            class="section-image"
            :src="optimizeUrl(section.image, 800)"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <h2>{{ localise(section, lang).heading }}</h2>
          <p>{{ localise(section, lang).body }}</p>
        </section>
      </Item>
    </template>
  </div>
</template>
