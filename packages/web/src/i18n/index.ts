import { DEFAULT_LANG, LANGS, type Lang } from '@hamstarter/shared';
import {
  type ComputedRef,
  computed,
  type InjectionKey,
  inject,
  provide,
  reactive,
  watch,
} from 'vue';
import { type Dictionary, en } from './en';
import { ja } from './ja';

/**
 * Translations without an i18n dependency — mirrors packages/web/src/i18n/index.tsx (see
 * that file for how to add a language; LANGS/LOCALES stay the source of truth there too,
 * this just re-derives the same shape for Vue's provide/inject instead of React context).
 */
export const LOCALES = { en, ja } satisfies Record<Lang, Dictionary>;

/** Same pathname regex as the React package's resolveLang, so the two frontends agree on
 *  which language a URL belongs to. See that file for why the language lives in the path
 *  rather than a query string or navigator.language. */
export function resolveLang(pathname = ''): Lang {
  const match = pathname.match(new RegExp(`(?:^|/)(${LANGS.join('|')})(?=/|$)`));
  return (match?.[1] as Lang) ?? DEFAULT_LANG;
}

interface LanguageState {
  lang: Lang;
}

const key: InjectionKey<{ state: LanguageState; setLang: (lang: Lang) => void }> =
  Symbol('language');

/** Call once, from App.vue's setup. `scoped` mirrors the React provider's prop: the admin
 *  portal switches its own `lang` state without rewriting the address bar. */
export function provideLanguage(options: { defaultLang?: Lang; scoped?: boolean } = {}) {
  const state = reactive<LanguageState>({
    lang:
      options.defaultLang ??
      resolveLang(typeof window === 'undefined' ? '' : window.location.pathname),
  });

  /**
   * Switching language is a full navigation, not a state change — each language has its
   * own prerendered HTML, and swapping the strings client-side would leave the markup,
   * <title> and meta description in the previous language. See the React provider's
   * setLang for the full reasoning; this is the same logic.
   */
  function setLang(next: Lang) {
    if (options.scoped || typeof window === 'undefined') {
      state.lang = next;
      return;
    }
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const rest = window.location.pathname
      .replace(base, '')
      .replace(new RegExp(`^/(${LANGS.join('|')})(?=/|$)`), '');
    const prefix = next === DEFAULT_LANG ? '' : `/${next}`;
    window.location.assign(`${base}${prefix}${rest || '/'}`);
  }

  // Keeps <html lang> in step, same reason as the React provider: screen readers and
  // search engines both read it to pick pronunciation/indexing.
  //
  // Skipped when scoped: a scoped instance only controls its own subtree's strings (the
  // admin portal's own UI), not the document's actual language — the surrounding chrome
  // (Header, Footer) still reads the unscoped, site-wide instance and is genuinely in
  // whatever language the URL says. Letting a nested scoped instance overwrite <html lang>
  // would make it disagree with content that's still visibly on screen in the other one.
  watch(
    () => state.lang,
    (lang) => {
      if (options.scoped || typeof document === 'undefined') return;
      document.documentElement.lang = lang;
    },
    { immediate: true },
  );

  provide(key, { state, setLang });
}

function useLanguageContext() {
  const ctx = inject(key);
  if (!ctx) throw new Error('useT/useLang must be used inside a component under provideLanguage()');
  return ctx;
}

/** The strings for the active language. */
export function useT(): ComputedRef<Dictionary> {
  const { state } = useLanguageContext();
  return computed(() => LOCALES[state.lang]);
}

/** The active language and a setter, for the switcher. */
export function useLang(): { lang: ComputedRef<Lang>; setLang: (lang: Lang) => void } {
  const { state, setLang } = useLanguageContext();
  return { lang: computed(() => state.lang), setLang };
}
