import { DEFAULT_LANG } from '@hamstarter/shared';
import { createApp, createSSRApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { resolveLang } from './i18n';
import { loadAnalytics } from './lib/analytics';
import { installGlobalErrorReporting } from './lib/reportError';
import { routes } from './router';
import './styles/global.css';

// Installed before anything renders, so an error thrown during startup is still reported.
installGlobalErrorReporting();
loadAnalytics();

/**
 * Applied synchronously, before the app is even created — see composables/theme.ts for why
 * this moved out of a post-mount effect: document.documentElement is outside #app, so Vue
 * never hydrates it, and doing it here means a returning dark-mode visitor's preference is
 * already correct before first paint rather than racing the app's mount.
 */
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark-mode');
}

/**
 * Same language-prefix-as-basename scheme as the React package's main.tsx: the prefix
 * lives in the router's base path rather than a route segment, so every route definition
 * stays language-agnostic and no link can forget to carry the prefix.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const lang = resolveLang(window.location.pathname);
const basename = `${base}${lang === DEFAULT_LANG ? '' : `/${lang}`}` || '/';

const router = createRouter({
  history: createWebHistory(basename),
  routes,
  // A client-side navigation doesn't touch scroll position the way a real page load does
  // — without this, clicking a link from partway down a page landed on the new page at
  // the same y-offset, clamped to whatever that page's shorter height allowed. Vue
  // Router's own option for this, rather than the manual post-transition reset the React
  // package needs (see PageTransition.tsx there) — Vue Router owns the navigation
  // lifecycle end to end, so it can resolve this itself instead of a component having to
  // hook the transition's completion.
  scrollBehavior() {
    return { top: 0 };
  },
});

// Prerendered routes are hydrated rather than re-rendered — createApp over existing markup
// discards it and remounts, the same problem the React package's createRoot has (see its
// main.tsx). createSSRApp adopts the existing DOM instead, so the prerendered content
// stays eligible as the Largest Contentful Paint candidate.
const isPrerendered = document.documentElement.hasAttribute('data-prerendered');

/**
 * Hydrating a DOM-captured snapshot (rather than real markup from a Vue SSR runtime, which
 * this project deliberately doesn't run — see scripts/prerender.mjs) always logs this exact
 * message, independent of whether anything is actually wrong: the snapshot structurally
 * lacks the comment-node fragment markers Vue's hydration expects for v-for/v-if/multi-root
 * constructs. Confirmed empirically that Vue patches the affected nodes in place and the
 * page's visible text never changes because of it — see prerender.mjs's own hydration-gate
 * comment for the full investigation. Filtering only this one exact string, only on the
 * hydration path where it can occur: a real new mismatch would log its own distinct text
 * and still come through.
 */
if (isPrerendered) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Hydration completed but contains mismatches')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

const app = isPrerendered ? createSSRApp(App) : createApp(App);

app.use(router);

// router.isReady() resolves once the router's initial navigation — matching whatever URL
// the page loaded with — has actually run. This is not just about RouterLink's
// active-class state: RouterView renders nothing at all for its current route until that
// initial navigation resolves, so mounting before this genuinely blanks the page — briefly
// in a live browser, but long enough for the prerender hydration gate to catch it as
// content rewriting itself after load. Confirmed by removing this line: every route's
// visible text went empty. Wrapped in an IIFE rather than a top-level await: Vite's default
// build target predates top-level-await support in some of the browsers it still lists.
(async () => {
  await router.isReady();
  app.mount('#app');
})();
