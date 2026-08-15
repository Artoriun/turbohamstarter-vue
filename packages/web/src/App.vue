<!-- Mirrors packages/web/src/App.tsx: ContentProvider + Layout + PageTransition wrapping
     the routed page. -->
<script setup lang="ts">
import ErrorBoundary from './components/ErrorBoundary.vue';
import Layout from './components/Layout.vue';
import PageTransition from './components/PageTransition.vue';
import { provideContent } from './composables/content';
import { provideTheme } from './composables/theme';
import { provideLanguage } from './i18n';

provideLanguage();
provideTheme();
provideContent();
</script>

<template>
  <ErrorBoundary>
    <Layout>
      <RouterView v-slot="{ Component, route }">
        <PageTransition :path="route.fullPath">
          <component :is="Component" />
        </PageTransition>
      </RouterView>
    </Layout>
  </ErrorBoundary>
</template>
