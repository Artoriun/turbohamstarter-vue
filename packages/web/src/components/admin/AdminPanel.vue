<!-- Mirrors the AdminPanel function in packages/web/src/pages/Admin.tsx. -->
<script setup lang="ts">
import { type CarouselSlide, findProfanity, type Section, type Settings } from '@hamstarter/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useContent } from '../../composables/content';
import { useT } from '../../i18n';
import {
  apiCreateSection,
  apiGetSettings,
  apiUpdateSection,
  apiUpdateSettings,
  apiUploadImage,
} from '../../lib/api';
import { optimizeUrl } from '../../lib/images';
import SlideEditor from './SlideEditor.vue';
import TranslationFields from './TranslationFields.vue';

/**
 * Set to true to expose the profanity filter's controls in the portal.
 *
 * Hidden by default and deliberately a code change rather than a setting: the filter is on
 * out of the box, and the person it protects is usually not the person who should be able
 * to switch it off from the browser. Whoever wants it off is already editing this
 * repository. The rule itself is enforced by the API either way — hiding the control does
 * not disable anything.
 */
const SHOW_PROFANITY_SETTING = false;

/** The categories the filter bar offers. 'footer' is chrome, not a category — it stays
 *  pinned and visible under every filter instead of getting its own tab. */
const FILTERABLE_PAGES: Array<Exclude<Section['page'], 'footer'>> = ['home', 'about'];
type Filter = 'all' | (typeof FILTERABLE_PAGES)[number];

const emit = defineEmits<{ signOut: [] }>();

const t = useT();
const { state: content, refresh } = useContent();

const items = ref<Section[]>([...content.sections]);
const status = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
const settings = ref<Settings | null>(null);
const blocked = ref<string[]>([]);
const filter = ref<Filter>('all');

onMounted(() => {
  apiGetSettings()
    .then((s) => {
      settings.value = s;
    })
    // Unreachable settings must not lock the portal: the API enforces the rule anyway, so
    // the worst case is losing the as-you-type warning.
    .catch(() => {
      settings.value = { profanityFilter: false };
    });
});

// The context refreshes independently; mirror it into local state so edits stay responsive
// without a round trip per keystroke.
watch(
  () => content.sections,
  (sections) => {
    items.value = [...sections];
  },
);

/** Live check, so the writer sees it before pressing save rather than after. */
function offending(section: Section): string[] {
  if (!settings.value?.profanityFilter) return [];
  return [
    ...new Set(
      [section.heading, section.body].flatMap((s) =>
        findProfanity(s, settings.value?.blocklist).map((m) => m.word),
      ),
    ),
  ];
}

/** Same check, for one slide of a carousel section — its heading/body are what actually
 *  renders on the site, unlike the carousel section's own (see Section.slides). */
function offendingSlide(slide: CarouselSlide): string[] {
  if (!settings.value?.profanityFilter) return [];
  return [
    ...new Set(
      [slide.heading, slide.body].flatMap((s) =>
        findProfanity(s, settings.value?.blocklist).map((m) => m.word),
      ),
    ),
  ];
}

async function toggleFilter(on: boolean) {
  const next: Settings = { ...(settings.value ?? {}), profanityFilter: on };
  settings.value = next;
  try {
    settings.value = await apiUpdateSettings(next);
  } catch {
    status.value = 'error';
  }
}

function edit(id: string, patch: Partial<Section>) {
  items.value = items.value.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

async function save(section: Section) {
  status.value = 'saving';
  blocked.value = [];
  try {
    await apiUpdateSection(section.id, {
      page: section.page,
      kind: section.kind,
      heading: section.heading,
      body: section.body,
      image: section.image,
      translations: section.translations,
      slides: section.slides,
    });
    await refresh();
    status.value = 'saved';
    setTimeout(() => {
      status.value = 'idle';
    }, 1500);
  } catch (err) {
    const words = (err as Error & { words?: string[] }).words;
    if (words) {
      blocked.value = words;
      status.value = 'idle';
      return;
    }
    status.value = 'error';
  }
}

async function add() {
  try {
    // Lands in whichever category is currently filtered to, so it shows up immediately
    // rather than appearing under Home while you're looking at About. 'all' has no single
    // category to land in, so it falls back to the same default as before.
    await apiCreateSection(filter.value === 'all' ? 'home' : filter.value);
    await refresh();
  } catch {
    status.value = 'error';
  }
}

async function addCarousel() {
  try {
    await apiCreateSection(filter.value === 'all' ? 'home' : filter.value, 'carousel');
    await refresh();
  } catch {
    status.value = 'error';
  }
}

async function remove(id: string) {
  if (!window.confirm(t.value.admin.confirmDelete)) return;
  try {
    // Soft delete: the section stops rendering but the record survives, so a mistake is
    // recoverable. DELETE /api/content/:id removes it outright if you want that.
    await apiUpdateSection(id, { deleted: true });
    await refresh();
  } catch {
    status.value = 'error';
  }
}

/**
 * The footer is site chrome rather than page content: it is pinned to the bottom of the
 * list, has no move controls, and cannot be reordered into the middle of the pages. It is
 * modelled as a page so it reuses the same editing and translation machinery, but that is
 * an implementation detail and the portal should not present it as somewhere to put a
 * section.
 */
const isChrome = (s: Section) => s.page === 'footer';

// Sorted the same way the public site sorts (see sectionsForPage/usePageSections): by
// `order` ascending, chrome pinned last regardless of its own order value. The admin list
// and the rendered page have to agree on this, or a section can sit at the top here and the
// bottom there.
const ordered = computed(() =>
  [...items.value].sort((a, b) => {
    const chrome = Number(isChrome(a)) - Number(isChrome(b));
    return chrome !== 0 ? chrome : (a.order ?? 0) - (b.order ?? 0);
  }),
);
const movable = computed(() => ordered.value.filter((s) => !isChrome(s)));
// What the filter bar is currently showing — move() reorders within this, not the full
// cross-category list, so the arrows swap with the neighbour actually on screen rather than
// with whatever the next item happens to be in an unrelated category.
const categorized = computed(() =>
  filter.value === 'all' ? movable.value : movable.value.filter((s) => s.page === filter.value),
);
const displayed = computed(() => [...categorized.value, ...ordered.value.filter(isChrome)]);

/**
 * Swaps the `order` field between two adjacent-in-this-filter sections and persists both —
 * not their array position. `order` is what the public site actually sorts by
 * (sectionsForPage), so this is the only form of "move" that has any effect there.
 */
async function move(id: string, delta: number) {
  const from = categorized.value.findIndex((s) => s.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= categorized.value.length) return;
  const a = categorized.value[from];
  const b = categorized.value[to];
  const [aOrder, bOrder] = [b.order ?? 0, a.order ?? 0];
  edit(a.id, { order: aOrder });
  edit(b.id, { order: bOrder });
  try {
    await Promise.all([
      apiUpdateSection(a.id, { order: aOrder }),
      apiUpdateSection(b.id, { order: bOrder }),
    ]);
    await refresh();
  } catch {
    status.value = 'error';
  }
}

async function upload(section: Section, file: File) {
  status.value = 'saving';
  try {
    const url = await apiUploadImage(section.id, file);
    edit(section.id, { image: url });
    await apiUpdateSection(section.id, { image: url });
    await refresh();
    status.value = 'saved';
  } catch {
    status.value = 'error';
  }
}

// Slides live only inside their carousel section's own `slides` array — there is no
// separate slide entity server-side — so adding, editing and removing one is just an array
// patch through the same edit() used for heading/body. Nothing round-trips to the API until
// the card's own Save button is pressed, same as any other field; only the image upload
// below persists immediately, matching upload().
function editSlide(section: Section, slideId: string, patch: Partial<CarouselSlide>) {
  edit(section.id, {
    slides: (section.slides ?? []).map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
  });
}

function addSlide(section: Section) {
  const newSlide: CarouselSlide = {
    id: `slide-${Date.now()}`,
    heading: 'New slide',
    body: 'Write something here.',
  };
  edit(section.id, { slides: [...(section.slides ?? []), newSlide] });
}

function removeSlide(section: Section, slideId: string) {
  if (!window.confirm(t.value.admin.confirmDeleteSlide)) return;
  edit(section.id, { slides: (section.slides ?? []).filter((s) => s.id !== slideId) });
}

async function uploadSlideImage(section: Section, slideId: string, file: File) {
  status.value = 'saving';
  try {
    const url = await apiUploadImage(`${section.id}-${slideId}`, file);
    const slides = (section.slides ?? []).map((s) => (s.id === slideId ? { ...s, image: url } : s));
    edit(section.id, { slides });
    await apiUpdateSection(section.id, { slides });
    await refresh();
    status.value = 'saved';
  } catch {
    status.value = 'error';
  }
}

function onSectionImageChange(section: Section, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) upload(section, file);
}

function onBlocklistInput(e: Event) {
  if (!settings.value) return;
  settings.value.blocklist = (e.target as HTMLInputElement).value.split(',').map((w) => w.trim());
}

function onBlocklistBlur() {
  if (!settings.value) return;
  apiUpdateSettings({
    ...settings.value,
    blocklist: (settings.value.blocklist ?? []).filter(Boolean),
  })
    .then((s) => {
      settings.value = s;
    })
    .catch(() => {
      status.value = 'error';
    });
}
</script>

<template>
  <div class="page admin">
    <div class="admin-head">
      <h1>{{ t.admin.title }}</h1>
      <div class="admin-head-actions">
        <span class="admin-status" role="status">
          {{ status === 'saving' ? t.admin.saving : status === 'saved' ? t.admin.saved : status === 'error' ? t.admin.saveFailed : '' }}
        </span>
        <button type="button" class="btn btn-sm" @click="emit('signOut')">{{ t.admin.signOut }}</button>
      </div>
    </div>

    <section v-if="SHOW_PROFANITY_SETTING" class="admin-settings">
      <div class="admin-settings-row">
        <label for="profanity-filter"><strong>{{ t.admin.filterTitle }}</strong></label>
        <input
          id="profanity-filter"
          type="checkbox"
          :checked="!!settings?.profanityFilter"
          :disabled="!settings"
          @change="toggleFilter(($event.target as HTMLInputElement).checked)"
        />
        <span class="admin-settings-state">{{ settings?.profanityFilter ? t.admin.filterOn : t.admin.filterOff }}</span>
      </div>
      <p class="admin-hint">{{ t.admin.filterHint }}</p>

      <template v-if="settings?.profanityFilter">
        <label for="blocklist">{{ t.admin.blocklist }}</label>
        <input
          id="blocklist"
          :value="(settings.blocklist ?? []).join(', ')"
          :placeholder="t.admin.blocklistHint"
          @input="onBlocklistInput"
          @blur="onBlocklistBlur"
        />
        <p class="admin-hint">{{ t.admin.blocklistHint }}</p>
      </template>
    </section>

    <p v-if="blocked.length > 0" class="form-error" role="alert">
      {{ t.admin.blockedSave }} {{ blocked.join(', ') }}
    </p>

    <div class="admin-filters">
      <button
        type="button"
        class="btn btn-sm"
        :class="{ 'btn-primary': filter === 'all' }"
        :aria-pressed="filter === 'all'"
        @click="filter = 'all'"
      >
        {{ t.admin.filterAll }}
      </button>
      <button
        v-for="page in FILTERABLE_PAGES"
        :key="page"
        type="button"
        class="btn btn-sm"
        :class="{ 'btn-primary': filter === page }"
        :aria-pressed="filter === page"
        @click="filter = page"
      >
        {{ page }}
      </button>
    </div>

    <div class="admin-toolbar">
      <h2>{{ t.admin.sections }}</h2>
      <div class="admin-toolbar-actions">
        <button type="button" class="btn btn-sm btn-primary" @click="add">{{ t.admin.addSection }}</button>
        <button type="button" class="btn btn-sm btn-primary" @click="addCarousel">{{ t.admin.addCarousel }}</button>
      </div>
    </div>

    <ul class="admin-list">
      <li v-for="section in displayed" :key="section.id" class="admin-card">
        <div class="admin-card-row">
          <span class="admin-card-fixed">{{ t.admin.page }}: {{ section.page }}</span>

          <div v-if="!isChrome(section)" class="admin-card-move">
            <button
              type="button"
              class="btn btn-sm btn-icon"
              :aria-label="t.admin.moveUp"
              :disabled="categorized[0]?.id === section.id"
              @click="move(section.id, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="btn btn-sm btn-icon"
              :aria-label="t.admin.moveDown"
              :disabled="categorized[categorized.length - 1]?.id === section.id"
              @click="move(section.id, 1)"
            >
              ↓
            </button>
          </div>
        </div>

        <template v-if="section.kind === 'carousel'">
          <label :for="`heading-${section.id}`">{{ t.admin.heading }}</label>
          <input
            :id="`heading-${section.id}`"
            :value="section.heading"
            @input="edit(section.id, { heading: ($event.target as HTMLInputElement).value })"
          />

          <div class="admin-slides-toolbar">
            <span class="admin-card-fixed">{{ t.admin.slides }}</span>
            <button type="button" class="btn btn-sm" @click="addSlide(section)">{{ t.admin.addSlide }}</button>
          </div>
          <ul class="admin-slides">
            <SlideEditor
              v-for="slide in section.slides ?? []"
              :key="slide.id"
              :slide="slide"
              :offending-words="offendingSlide(slide)"
              @edit="(patch) => editSlide(section, slide.id, patch)"
              @remove="removeSlide(section, slide.id)"
              @upload-image="(file) => uploadSlideImage(section, slide.id, file)"
            />
          </ul>
        </template>

        <template v-else>
          <label :for="`heading-${section.id}`">{{ t.admin.heading }}</label>
          <input
            :id="`heading-${section.id}`"
            :value="section.heading"
            @input="edit(section.id, { heading: ($event.target as HTMLInputElement).value })"
          />

          <label :for="`body-${section.id}`">{{ t.admin.body }}</label>
          <textarea
            :id="`body-${section.id}`"
            rows="4"
            :value="section.body"
            @input="edit(section.id, { body: ($event.target as HTMLTextAreaElement).value })"
          />

          <!-- One pair per additional language. The default language uses the fields
               above; anything left empty here falls back to them, so a half-translated
               site shows the default rather than a gap. -->
          <TranslationFields
            :translations="section.translations"
            :default-heading="section.heading"
            :default-body="section.body"
            :body-rows="3"
            @edit="(translations) => edit(section.id, { translations })"
          />

          <label :for="`image-${section.id}`">{{ t.admin.image }}</label>
          <input
            :id="`image-${section.id}`"
            type="file"
            accept="image/*"
            @change="onSectionImageChange(section, $event)"
          />
          <img v-if="section.image" class="admin-thumb" :src="optimizeUrl(section.image, 240)" alt="" width="120" />

          <p v-if="offending(section).length > 0" class="admin-warning" role="status">
            {{ t.admin.blockedWarning }} {{ offending(section).join(', ') }}
          </p>
        </template>

        <div class="admin-card-actions">
          <button type="button" class="btn btn-sm btn-primary" @click="save(section)">{{ t.admin.save }}</button>
          <!-- The footer is not one of the filterable categories, so a deleted one could not
               be recreated from the portal (add() only ever targets FILTERABLE_PAGES). It is
               editable, not removable. -->
          <button
            v-if="!isChrome(section)"
            type="button"
            class="btn btn-sm btn-danger"
            @click="remove(section.id)"
          >
            {{ t.admin.delete }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
