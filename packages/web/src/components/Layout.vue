<!-- Mirrors packages/web/src/components/Layout.tsx. useRouteMeta lives here rather than in
     each page so a new page gets a correct <title>, description and canonical for free. -->
<script setup lang="ts">
import { useRouteMeta } from '../lib/useRouteMeta';
import Footer from './Footer.vue';
import Header from './Header.vue';

useRouteMeta();
</script>

<template>
  <div class="site">
    <Header />
    <main id="main" class="main-content">
      <slot />
    </main>
    <Footer />
  </div>
</template>
