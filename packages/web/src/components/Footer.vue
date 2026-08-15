<!-- Mirrors packages/web/src/components/Footer.tsx. -->
<script setup lang="ts">
import { localise } from '@hamstarter/shared';
import { computed } from 'vue';
import { usePageSections } from '../composables/content';
import { useLang, useT } from '../i18n';

const t = useT();
const { lang } = useLang();
// Editable from the admin portal like any other content. The bundled section supplies the
// default, so this never renders empty even before the API answers.
const footerSection = usePageSections('footer');
const text = computed(() => {
  const section = footerSection.value[0];
  return section ? localise(section, lang.value).body : undefined;
});
</script>

<template>
  <footer class="site-footer">
    <p>{{ text ?? `© ${new Date().getFullYear()} ${t.footer.rights}` }}</p>
    <RouterLink to="/privacy">{{ t.footer.privacy }}</RouterLink>
  </footer>
</template>
