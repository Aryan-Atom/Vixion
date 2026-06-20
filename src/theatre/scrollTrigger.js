import gsap from 'gsap';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import projectState from '../Vixion.theatre-project-state-v2.json';

const SNAP_DURATION = 2.8;
const SNAP_EASE = 'power1.inOut';
const snapEasing = gsap.parseEase(SNAP_EASE);

function getKeyframePositions(state) {
  const positions = new Set();
  const sequence = state.sheetsById?.Main?.sequence;
  if (!sequence) return [0];

  for (const objectTracks of Object.values(sequence.tracksByObject ?? {})) {
    for (const track of Object.values(objectTracks.trackData ?? {})) {
      for (const keyframe of track.keyframes ?? []) {
        positions.add(keyframe.position);
      }
    }
  }

  return [...positions].sort((a, b) => a - b);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export async function setupScrollTrigger(sheet, project) {
  await project.ready;

  const keyframePositions = getKeyframePositions(projectState);
  const scrollSpacer = document.querySelector('.scroll-spacer');
  const sectionHeight = window.innerHeight;
  const totalHeight = sectionHeight * keyframePositions.length;

  if (scrollSpacer) {
    scrollSpacer.style.height = `${totalHeight}px`;
  }

  const sequence = sheet.sequence;
  sequence.position = keyframePositions[0];

  let currentIndex = 0;
  let isSnapping = false;
  let sequenceTween = null;

  const lenis = new Lenis({
    duration: SNAP_DURATION,
    smoothWheel: false,
    syncTouch: false,
    autoRaf: false,
  });

  function snapToIndex(nextIndex) {
    nextIndex = clamp(nextIndex, 0, keyframePositions.length - 1);
    if (nextIndex === currentIndex || isSnapping) return;

    isSnapping = true;
    currentIndex = nextIndex;

    const targetScroll = currentIndex * sectionHeight;
    const targetPosition = keyframePositions[currentIndex];

    sequenceTween?.kill();
    sequenceTween = gsap.to(sequence, {
      position: targetPosition,
      duration: SNAP_DURATION,
      ease: SNAP_EASE,
      onComplete: () => {
        isSnapping = false;
      },
    });

    lenis.scrollTo(targetScroll, {
      duration: SNAP_DURATION,
      easing: snapEasing,
      lock: true,
    });
  }

  window.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (isSnapping) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      snapToIndex(currentIndex + direction);
    },
    { passive: false }
  );

  let touchStartY = 0;

  window.addEventListener(
    'touchstart',
    (event) => {
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    'touchend',
    (event) => {
      if (isSnapping) return;

      const deltaY = touchStartY - event.changedTouches[0].clientY;
      if (Math.abs(deltaY) < 40) return;

      const direction = deltaY > 0 ? 1 : -1;
      snapToIndex(currentIndex + direction);
    },
    { passive: true }
  );

  window.addEventListener('keydown', (event) => {
    if (isSnapping) return;

    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      snapToIndex(currentIndex + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      snapToIndex(currentIndex - 1);
    }
  });

  window.addEventListener('resize', () => {
    const nextSectionHeight = window.innerHeight;
    const nextTotalHeight = nextSectionHeight * keyframePositions.length;

    if (scrollSpacer) {
      scrollSpacer.style.height = `${nextTotalHeight}px`;
    }

    lenis.scrollTo(currentIndex * nextSectionHeight, { immediate: true });
  });

  return lenis;
}
