import { metaForRoute } from '@hamstarter/shared';
import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useContent } from '../composables/content';

/**
 * Keeps document.title, the meta description and the canonical link in step with the
 * current route — mirrors packages/web/src/lib/useRouteMeta.ts, same metaForRoute helper
 * the prerender script uses, so a client-side navigation lands on exactly the title that's
 * already in the prerendered HTML. Reads live sections so admin edits show without a
 * rebuild.
 */
export function useRouteMeta() {
  const route = useRoute();
  const { state } = useContent();

  watchEffect(() => {
    // Router base is stripped from route.path already, matching what the prerenderer writes.
    const { title, description } = metaForRoute(route.path, state.sections);
    document.title = title;

    if (description) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.content = description;
    }

    // Query strings are stripped: ?lang= produces the same page in another language, and
    // pointing both at one canonical stops them competing as duplicates.
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href.split('?')[0];
  });
}
