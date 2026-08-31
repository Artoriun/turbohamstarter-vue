<!--
  The "one heading/body pair per additional language" block — identical in the React source
  between SlideEditor and AdminPanel's own section card (packages/web/src/pages/Admin.tsx),
  extracted once here rather than duplicated twice.
-->
<script setup lang="ts">
import { DEFAULT_LANG, LANGS, type Lang } from '@hamstarter/shared';
import { useT } from '../../i18n';

type Translations = Partial<Record<Lang, { heading?: string; body?: string }>>;

const props = withDefaults(
  defineProps<{
    translations?: Translations;
    defaultHeading: string;
    defaultBody: string;
    bodyRows?: number;
  }>(),
  { bodyRows: 2 },
);
const emit = defineEmits<{ edit: [translations: Translations] }>();

const t = useT();
const otherLangs = LANGS.filter((l) => l !== DEFAULT_LANG) as Lang[];

function editHeading(code: Lang, value: string) {
  emit('edit', {
    ...props.translations,
    [code]: { ...props.translations?.[code], heading: value },
  });
}
function editBody(code: Lang, value: string) {
  emit('edit', { ...props.translations, [code]: { ...props.translations?.[code], body: value } });
}
</script>

<template>
  <div v-for="code in otherLangs" :key="code" class="admin-translation">
    <span class="admin-translation-label">{{ code.toUpperCase() }}</span>
    <input
      :aria-label="`${t.admin.heading} (${code})`"
      :placeholder="defaultHeading"
      :value="translations?.[code]?.heading ?? ''"
      @input="editHeading(code, ($event.target as HTMLInputElement).value)"
    />
    <textarea
      :aria-label="`${t.admin.body} (${code})`"
      :rows="bodyRows"
      :placeholder="defaultBody"
      :value="translations?.[code]?.body ?? ''"
      @input="editBody(code, ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>
