<!-- Mirrors packages/web/src/components/Header.tsx. -->
<script setup lang="ts">
import { ref } from 'vue';
import { useT } from '../i18n';
import LanguageToggle from './LanguageToggle.vue';
import ThemeToggle from './ThemeToggle.vue';
import TurboHam from './TurboHam.vue';

const t = useT();
const open = ref(false);
</script>

<template>
  <header class="site-header">
    <!-- First focusable element on the page, so a keyboard user can jump the nav. -->
    <a class="skip-link" href="#main">{{ t.nav.skipToContent }}</a>

    <div class="header-inner">
      <RouterLink to="/" class="brand" @click="open = false">
        <TurboHam class="brand-mascot" />
        <span class="brand-word">
          <span class="brand-turbo">Turbo</span>
          <span class="brand-ham">Hamstarter</span>
        </span>
      </RouterLink>

      <button
        type="button"
        class="nav-toggle"
        :aria-expanded="open"
        aria-controls="site-nav"
        :aria-label="t.nav.menu"
        @click="open = !open"
      >
        <span class="nav-toggle-bar" />
        <span class="nav-toggle-bar" />
        <span class="nav-toggle-bar" />
      </button>

      <nav id="site-nav" class="site-nav" :class="{ 'is-open': open }">
        <RouterLink to="/" class="nav-link" active-class="is-active" @click="open = false">
          {{ t.nav.home }}
        </RouterLink>
        <RouterLink to="/about" class="nav-link" active-class="is-active" @click="open = false">
          {{ t.nav.about }}
        </RouterLink>
        <RouterLink to="/contact" class="nav-link" active-class="is-active" @click="open = false">
          {{ t.nav.contact }}
        </RouterLink>
        <div class="header-controls">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </nav>
    </div>
  </header>
</template>
