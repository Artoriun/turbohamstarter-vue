<!-- Mirrors packages/web/src/components/LanguageToggle.tsx. -->
<script setup lang="ts">
import { LANGS, type Lang } from '@hamstarter/shared';
import { LOCALES, useLang } from '../i18n';

const { lang, setLang } = useLang();
</script>

<template>
  <nav v-if="LANGS.length >= 2" class="lang-toggle" :aria-label="LOCALES[lang].language.label">
    <button
      v-for="code in LANGS as unknown as Lang[]"
      :key="code"
      type="button"
      class="lang-btn"
      :class="{ 'is-active': code === lang }"
      :aria-pressed="code === lang"
      @click="setLang(code)"
    >
      {{ code.toUpperCase() }}
      <span class="visually-hidden">{{ ` — ${LOCALES[code].label}` }}</span>
    </button>
  </nav>
</template>
