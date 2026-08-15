import type { RouteRecordRaw } from 'vue-router';
import About from './pages/About.vue';
import Contact from './pages/Contact.vue';
import Home from './pages/Home.vue';
import NotFound from './pages/NotFound.vue';
import Privacy from './pages/Privacy.vue';
import ProjectDetail from './pages/ProjectDetail.vue';

/**
 * Mirrors the route table in packages/web/src/App.tsx, but only Admin is lazy — the other
 * six are eager, imported directly rather than via dynamic import().
 *
 * That's a deliberate change from an earlier version of this file, where every route was
 * lazy. main.ts can't mount until router.isReady() resolves (required — see the comment
 * there), and isReady() doesn't resolve until the matched route's component has finished
 * loading. With every route lazy, that meant every single page load — not just
 * navigation — waited on a chunk fetch before Vue attached any event listeners, which was
 * fast enough locally to go unnoticed but, under a loaded CI runner, was slow enough that
 * an e2e test clicking the mobile nav toggle immediately after page load sometimes clicked
 * before the handler existed. Eager imports put these six pages in the same chunk as
 * main.ts, so isReady() resolves as fast as the app itself boots. Admin stays lazy: it's
 * the one route genuinely worth keeping out of a visitor's first-load bundle (see
 * check-budgets.mjs), and a visit that actually lands there already pays a real network
 * cost signing in, so its own chunk fetch isn't adding a new class of problem.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/about', name: 'about', component: About },
  { path: '/contact', name: 'contact', component: Contact },
  { path: '/privacy', name: 'privacy', component: Privacy },
  { path: '/projects/:id', name: 'project-detail', component: ProjectDetail },
  { path: '/admin', name: 'admin', component: () => import('./pages/Admin.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
];
