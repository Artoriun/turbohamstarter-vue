import { SECTIONS, type Section } from '@hamstarter/shared';
import { type ComputedRef, computed, type InjectionKey, inject, provide, reactive } from 'vue';
import { apiGetContent, HAS_API } from '../lib/api';
import { IS_PRERENDERED } from '../lib/prerendered';

/**
 * Content, seeded from the bundle and refreshed from the API — mirrors
 * packages/web/src/context/ContentContext.tsx. Seeding from `SECTIONS` rather than an
 * empty array is the same load-bearing choice as there: hydration must see the same tree
 * the prerendered markup has, and a sleeping free-tier API must not blank the page.
 */
declare global {
  interface Window {
    __CONTENT__?: Section[];
  }
}

const SEED: Section[] =
  (typeof window !== 'undefined' && window.__CONTENT__) || SECTIONS.filter((s) => !s.deleted);

interface ContentState {
  sections: Section[];
  loading: boolean;
}

const key: InjectionKey<{ state: ContentState; refresh: () => Promise<void> }> = Symbol('content');

/** Call once, from App.vue's setup. */
export function provideContent() {
  const state = reactive<ContentState>({ sections: SEED, loading: !IS_PRERENDERED });

  async function refresh() {
    if (!HAS_API) return;
    try {
      state.sections = await apiGetContent();
    } catch (err) {
      // Keep whatever we have. A failed refresh must not blank the page — but say why, or
      // the page silently shows stale content and nothing explains it.
      console.warn('[content] refresh failed, keeping the content already shown:', err);
    }
  }

  if (HAS_API) {
    apiGetContent()
      .then((fresh) => {
        state.sections = fresh;
      })
      .catch((err) => {
        console.warn('[content] falling back to the bundled content:', err);
      })
      .finally(() => {
        state.loading = false;
      });
  } else {
    // Static-only deployment: the bundled content is all there is, and it is already shown.
    state.loading = false;
  }

  provide(key, { state, refresh });
}

export function useContent(): { state: ContentState; refresh: () => Promise<void> } {
  const ctx = inject(key);
  if (!ctx) throw new Error('useContent must be used inside a component under provideContent()');
  return ctx;
}

/** Live sections for one page, in display order. Reactive: re-derives whenever the
 *  underlying sections change (e.g. once the API refresh above resolves). */
export function usePageSections(page: Section['page']): ComputedRef<Section[]> {
  const { state } = useContent();
  return computed(() =>
    state.sections
      .filter((s) => s.page === page && !s.deleted)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );
}
