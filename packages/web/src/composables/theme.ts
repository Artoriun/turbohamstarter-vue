import { type InjectionKey, inject, provide, reactive, watch } from 'vue';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
}

const key: InjectionKey<{ state: ThemeState; toggleTheme: () => void }> = Symbol('theme');

/**
 * Call once, from App.vue's setup — mirrors packages/web/src/context/ThemeContext.tsx,
 * but the React version's "start light, correct after mount" dance isn't reproduced here.
 * That dance exists to avoid a returning dark-mode visitor's hydration disagreeing with
 * light-themed prerendered markup — but the class this toggles lives on
 * document.documentElement, outside #app entirely, so Vue's hydration never inspects it;
 * applying it has zero hydration risk regardless of timing.
 *
 * More importantly, doing it after mount here specifically caused a real bug: mount is
 * gated behind router.isReady() (see main.ts), which — under a loaded CI runner — took
 * long enough that a reload-then-check-immediately e2e assertion sometimes ran before the
 * theme had been reapplied, seeing 'light' on a page that should have stayed dark. main.ts
 * now applies the class synchronously before the app is even created, so by the time this
 * runs the DOM already reflects the stored preference — this just mirrors that into
 * reactive state for the toggle button to read.
 */
export function provideTheme() {
  const state = reactive<ThemeState>({
    theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
  });

  watch(
    () => state.theme,
    (theme) => {
      document.documentElement.classList.toggle('dark-mode', theme === 'dark');
      localStorage.setItem('theme', theme);
    },
  );

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
  }

  provide(key, { state, toggleTheme });
}

export function useTheme(): { state: ThemeState; toggleTheme: () => void } {
  const ctx = inject(key);
  if (!ctx) throw new Error('useTheme must be used inside a component under provideTheme()');
  return ctx;
}
