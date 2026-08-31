<!--
  Auto-cycling, drag-swipeable, multi-item carousel of a `kind: 'carousel'` section's
  slides. Mirrors packages/web/src/components/ProjectCarousel.tsx — see that file for the
  full reasoning; the short version below.

  A row of fixed-width cards (.carousel-track) slides via a single CSS
  `transform: translateX(...)`, animated by a CSS transition rather than per-slide
  keyframes — that's what makes several cards move together smoothly instead of one
  popping in as the next takes over. No animation library: a carousel can be the very
  first thing rendered on a landing page, and an animation library writing its animated
  values as inline styles is exactly what a prerendered page's hydration can disagree
  about (see PageTransition.vue). The transform here is plain CSS driven by a Vue ref,
  computed identically on the render hydration compares against and on the client's first
  render alike, so it carries none of that risk.

  The slide array is rendered three times back to back (`extended`) so that navigating
  past either end can keep sliding in the same direction into a copy that looks pixel-
  identical to the real target, rather than jumping backwards through the whole row or
  cutting the animation short. Once that slide's transition has actually finished, a
  watcher below silently — transition disabled for one frame — snaps the track index back
  into the middle copy at the equivalent position. Both positions render identically, so
  nothing visibly moves.

  Real <RouterLink>s throughout — unlike the previous crossfade version of this file, which
  needed native <a> tags to hold a direct DOM ref for per-pointermove drag writes. The drag
  transform now lives on the track as a whole, driven by `dragPx`, so nothing here needs a
  ref to the slide link itself any more — only to the active slide's <img>, for the
  loading-state check below.
-->
<script setup lang="ts">
import { type CarouselSlide, localise } from '@hamstarter/shared';
import { computed, nextTick, onUnmounted, ref, watch, watchEffect } from 'vue';
import { useLang, useT } from '../i18n';
import { optimizeUrl } from '../lib/images';
import { DEFAULT_PROJECT_IMAGES } from '../lib/projectAssets';
import HamsterPixels from './HamsterPixels.vue';

const props = defineProps<{ slides: CarouselSlide[] }>();

const { lang } = useLang();
const t = useT();

// Long enough to clear the prerenderer's content-stability check, which watches the page
// for 3.5s after load and fails the build if the visible text changes in that window — see
// the "content stability" gate in scripts/prerender.mjs. Short enough that a visitor who
// stays on the page actually sees more than one slide.
const AUTOPLAY_MS = 6000;
// Must match the CSS transition duration on .carousel-track — this is how long the silent
// post-wrap reset (see the watcher below) waits before it's safe to assume the slide
// animation has actually finished.
const TRANSITION_MS = 420;
// Pixels a drag must travel to commit to the next/prev slide, rather than snap back. A
// flat pixel value rather than a fraction of the frame width: a real swipe travels roughly
// the same physical distance on a phone or a wide desktop pointer drag alike.
const DRAG_THRESHOLD = 50;
// Pixels of movement, more horizontal than vertical, before a pointer press counts as a
// drag rather than a tap or a vertical page scroll.
//
// Higher for touch than for a mouse, and that difference is the whole point: a finger tap
// routinely slides several pixels while a mouse click does not move at all. At the mouse
// threshold those taps were classed as drags, and a drag deliberately suppresses the click
// that follows it — so tapping a project card on a phone opened nothing. Kept in step with
// the React component of the same name.
const DRAG_INTENT_MOUSE = 8;
const DRAG_INTENT_TOUCH = 16;
// Must match .carousel-slide's width/gap in global.css — the two need to agree for a live
// drag's translateX to line up with where the track actually settles.
const ITEM_WIDTH = 380;
const ITEM_GAP = 20;
const STEP = ITEM_WIDTH + ITEM_GAP;

function reducedMotionPreferred() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function slideImageSrc(slide: CarouselSlide) {
  return slide.image || DEFAULT_PROJECT_IMAGES[slide.id] || '';
}

/** Caps how far a fast/long drag can visually pull the track, so a long swipe still reads
 *  as "dragging the row" rather than detaching from the pointer entirely. */
function damp(dx: number, viewportWidth: number) {
  const limit = viewportWidth * 0.6;
  if (Math.abs(dx) <= limit) return dx;
  const excess = Math.abs(dx) - limit;
  return Math.sign(dx) * (limit + excess * 0.35);
}

const count = computed(() => props.slides.length);
const extended = computed(() =>
  count.value > 0 ? [...props.slides, ...props.slides, ...props.slides] : [],
);

// Index into `extended`. Starts at the head of the middle copy.
const trackIndex = ref(count.value);
const paused = ref(false);
const dragPx = ref(0);
const isDragging = ref(false);
// False only for the single frame the post-wrap watcher below needs the jump to be
// invisible, and for the duration of a live drag (direct manipulation, not an animated
// transition).
const animate = ref(true);
// Starts false — never true on the render hydration compares against, since the
// prerender capture only ever runs once the image has already loaded. Flipped by the
// watcher below, which checks the real DOM state after mount; see the comment there.
const showLoading = ref(false);

const frameEl = ref<HTMLDivElement | null>(null);
const mainImgEl = ref<HTMLImageElement | null>(null);
// The wider VNodeRef type is what a template `:ref` binding actually calls this with —
// an <img> can never resolve to a component instance, but the type has to admit one.
function setMainImgEl(el: Element | { $el: Element } | null) {
  mainImgEl.value = (el && '$el' in el ? el.$el : el) as HTMLImageElement | null;
}

// Plain (non-reactive) instance state, same reasoning as the previous version of this
// file: read inside event handlers, never needs to trigger a re-render on its own.
let isDraggingFlag = false;
let dragStart: { x: number; y: number } | null = null;

const index = computed(() =>
  count.value > 0 ? ((trackIndex.value % count.value) + count.value) % count.value : 0,
);

// A slide deleted from the admin portal while this was open must not leave trackIndex
// pointing past the end of a now-shorter extended[].
watchEffect(() => {
  if (count.value > 0 && trackIndex.value >= count.value * 3) trackIndex.value = count.value;
});

// The silent post-wrap reset described in the component doc comment above.
let wrapTimer: ReturnType<typeof setTimeout> | undefined;
watch(trackIndex, () => {
  clearTimeout(wrapTimer);
  if (
    count.value === 0 ||
    (trackIndex.value >= count.value && trackIndex.value < count.value * 2)
  ) {
    return;
  }
  wrapTimer = setTimeout(() => {
    animate.value = false;
    trackIndex.value =
      trackIndex.value >= count.value * 2
        ? trackIndex.value - count.value
        : trackIndex.value + count.value;
    requestAnimationFrame(() => requestAnimationFrame(() => (animate.value = true)));
  }, TRANSITION_MS + 30);
});

function next() {
  if (count.value < 2) return;
  trackIndex.value += 1;
}
function prev() {
  if (count.value < 2) return;
  trackIndex.value -= 1;
}
function goTo(targetIndex: number) {
  trackIndex.value = count.value + targetIndex;
}

// trackIndex is read only to restart the countdown on every slide change — whether from
// this timer or a manual prev/next/dot/drag/arrow-key change — rather than racing an old
// one; see the matching note on the equivalent effect in ProjectCarousel.tsx.
let autoplayTimer: ReturnType<typeof setTimeout> | undefined;
watchEffect((onCleanup) => {
  void trackIndex.value;
  if (paused.value || isDragging.value || count.value < 2) return;
  // Vestibular disorders aside, a slideshow that keeps moving after someone has said they
  // would rather it did not is worth checking directly rather than trusting only a CSS
  // reduced-motion collapse, which reaches the transition/keyframes but not this timer.
  if (reducedMotionPreferred()) return;
  autoplayTimer = setTimeout(next, AUTOPLAY_MS);
  onCleanup(() => clearTimeout(autoplayTimer));
});

// The resting slide's own image is eager + high-priority already, which covers the common
// case; this only ever matters on a slow connection or a cold Cloudinary transform.
// nextTick so this runs after the v-for's DOM update, by which point mainImgEl actually
// points at the new active slide's <img> — checking `.complete` before that would look at
// the previous slide's image, or nothing at all.
let removeImgListeners: (() => void) | undefined;
watch(
  trackIndex,
  () => {
    removeImgListeners?.();
    nextTick(() => {
      const img = mainImgEl.value;
      if (!img) return;
      if (img.complete) {
        showLoading.value = false;
        return;
      }
      showLoading.value = true;
      const onDone = () => {
        showLoading.value = false;
      };
      img.addEventListener('load', onDone);
      // A broken image should stop blocking the view, not spin forever.
      img.addEventListener('error', onDone);
      removeImgListeners = () => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
      };
    });
  },
  { immediate: true },
);

onUnmounted(() => {
  clearTimeout(wrapTimer);
  clearTimeout(autoplayTimer);
  removeImgListeners?.();
});

function handleSlideClick(e: MouseEvent) {
  if (isDraggingFlag) e.preventDefault();
}

function onPointerDown(e: PointerEvent) {
  if (count.value < 2) return;
  if ((e.target as HTMLElement).closest('.carousel-nav-btn, .carousel-pause-btn')) return;
  dragStart = { x: e.clientX, y: e.clientY };
}

function onPointerMove(e: PointerEvent) {
  if (!dragStart || count.value < 2) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  if (!isDraggingFlag) {
    const intent = e.pointerType === 'mouse' ? DRAG_INTENT_MOUSE : DRAG_INTENT_TOUCH;
    if (Math.abs(dx) < intent || Math.abs(dx) < Math.abs(dy)) return;
    isDraggingFlag = true;
    isDragging.value = true;
    animate.value = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  e.preventDefault();
  dragPx.value = damp(dx, frameEl.value?.offsetWidth || 1);
}

function onPointerEnd(e: PointerEvent) {
  const start = dragStart;
  dragStart = null;
  if (!isDraggingFlag || !start) return;
  // Cleared shortly after release, not immediately: a pointerup that ends a drag still
  // fires a synthetic click on the underlying link a moment later, and handleSlideClick
  // reads this flag to swallow that specific click without touching ordinary taps.
  setTimeout(() => {
    isDraggingFlag = false;
  }, 100);

  const dx = e.clientX - start.x;
  isDragging.value = false;
  animate.value = true;
  dragPx.value = 0;
  if (Math.abs(dx) > DRAG_THRESHOLD) {
    trackIndex.value += dx < 0 ? 1 : -1;
  }
}
</script>

<template>
  <!--
    Focus, not just hover, pauses it — a keyboard or touch user has no hover state, and
    WCAG 2.2.2 wants a way to stop auto-advancing content regardless of input device. The
    explicit pause button below covers touch; this covers keyboard users tabbing through.
  -->
  <div
    v-if="count > 0"
    class="project-carousel"
    @pointerenter="(e) => e.pointerType === 'mouse' && (paused = true)"
    @pointerleave="(e) => e.pointerType === 'mouse' && (paused = false)"
    @focusin="paused = true"
    @focusout="(e) => { if (!($el as HTMLElement).contains(e.relatedTarget as Node)) paused = false; }"
    @keydown="(e) => {
      if (count < 2) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    }"
  >
    <p class="eyebrow">{{ t.carousel.label }}</p>
    <div
      ref="frameEl"
      class="carousel-frame"
      :class="{ 'is-dragging': isDragging }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
    >
      <div
        class="carousel-track"
        :style="{
          transform: `translateX(calc(-1 * ${trackIndex} * ${STEP}px + ${dragPx}px))`,
          transition: animate ? undefined : 'none',
        }"
      >
        <RouterLink
          v-for="(s, i) in extended"
          :key="`${s.id}-${i}`"
          :to="`/projects/${s.id}`"
          class="carousel-slide"
          draggable="false"
          :aria-hidden="i === trackIndex ? undefined : true"
          :tabindex="i === trackIndex ? undefined : -1"
          @click="handleSlideClick"
        >
          <img
            :ref="i === trackIndex ? setMainImgEl : undefined"
            :class="{ 'pixel-img': !s.image }"
            :src="optimizeUrl(slideImageSrc(s), 900)"
            alt=""
            loading="eager"
            decoding="async"
            :fetchpriority="i === trackIndex ? 'high' : undefined"
            draggable="false"
          />
          <span class="carousel-overlay">
            <span class="carousel-overlay-title">{{ localise(s, lang).heading }}</span>
            <span class="carousel-overlay-cta">{{ t.carousel.viewProject }}</span>
          </span>
        </RouterLink>
      </div>

      <div v-if="showLoading" class="carousel-loading" role="status" aria-live="polite">
        <div class="carousel-loading-wheel">
          <!-- The wheel and the mascot are one SVG, not a spinning SVG plus a
               background-image TurboHam layered on top — a background-image is a second
               network request that can still be loading when the whole point of this
               element is to stand in for something else that is slow to load, and once
               inserted after mount (see the watcher above) some browsers do not reliably
               repaint it when that second request finally does land. -->
          <svg viewBox="0 0 64 64" class="loading-wheel-svg" aria-hidden="true">
            <circle cx="32" cy="32" r="27" />
            <line x1="32" y1="5" x2="32" y2="59" />
            <line x1="5" y1="32" x2="59" y2="32" />
            <line x1="13" y1="13" x2="51" y2="51" />
            <line x1="51" y1="13" x2="13" y2="51" />
            <g transform="translate(32, 32) scale(1.8) translate(-7, -7)" shape-rendering="crispEdges">
              <HamsterPixels />
            </g>
          </svg>
        </div>
        <p class="carousel-loading-text">{{ t.carousel.loading }}</p>
      </div>

      <template v-if="count > 1">
        <button
          type="button"
          class="carousel-nav-btn carousel-nav-prev"
          :aria-label="t.carousel.prev"
          :title="t.carousel.prev"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button
          type="button"
          class="carousel-nav-btn carousel-nav-next"
          :aria-label="t.carousel.next"
          :title="t.carousel.next"
          @click="next"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <button
          type="button"
          class="carousel-pause-btn"
          :aria-label="paused ? t.carousel.play : t.carousel.pause"
          :title="paused ? t.carousel.play : t.carousel.pause"
          :aria-pressed="paused"
          @click="paused = !paused"
        >
          <svg v-if="!paused" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5l12 7-12 7Z" /></svg>
        </button>
      </template>
    </div>

    <div v-if="count > 1" class="carousel-dots">
      <button
        v-for="(s, i) in slides"
        :key="s.id"
        type="button"
        class="carousel-dot"
        :class="{ 'is-active': i === index }"
        :aria-label="`${t.carousel.goTo} ${i + 1}`"
        :aria-current="i === index"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>
