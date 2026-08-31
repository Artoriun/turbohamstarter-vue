import { reactive } from 'vue';

/**
 * Whether the visitor has navigated yet. Module scope, not component state, so it survives
 * regardless of which PageTransition/Item instance reads it — mirrors the `hasNavigated`
 * module variable in packages/web/src/components/PageTransition.tsx. See that file for why
 * the page a visitor lands on must render with zero animation on its first paint.
 */
export const navState = reactive({ hasNavigated: false });
