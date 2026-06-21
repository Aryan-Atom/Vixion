import gsap from 'gsap';

const ENTER_DURATION = 1.15;
const ENTER_STAGGER = 0.09;
const EXIT_DURATION = 0.45;
const SCROLL_SNAP_DURATION = 2.8;

const SECTION_ENTER_DELAY = {
  3: SCROLL_SNAP_DURATION * 0.72,
  4: SCROLL_SNAP_DURATION * 0.88,
};

export function setupContentAnimations({ deferInitial = false } = {}) {
  const panels = [...document.querySelectorAll('.content-panel')];
  let activeContentIndex = 0;
  let isAnimating = false;

  panels.forEach((panel) => {
    gsap.set(panel.querySelectorAll('[data-animate]'), {
      opacity: 0,
      y: 32,
      filter: 'blur(6px)',
    });
  });

  function setActivePanel(index) {
    panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === index);
    });
  }

  function hideAllPanels() {
    panels.forEach((panel) => {
      panel.classList.remove('is-active');
    });
  }

  function animateIn(panel) {
    const items = panel.querySelectorAll('[data-animate]');

    return gsap.fromTo(
      items,
      {
        opacity: 0,
        y: 32,
        filter: 'blur(6px)',
      },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: ENTER_DURATION,
        stagger: ENTER_STAGGER,
        ease: 'power3.out',
      }
    );
  }

  function animateOut(panel) {
    const items = panel.querySelectorAll('[data-animate]');

    return gsap.to(items, {
      opacity: 0,
      y: -18,
      filter: 'blur(4px)',
      duration: EXIT_DURATION,
      stagger: 0.04,
      ease: 'power2.in',
    });
  }

  function goToSection(scrollIndex, { immediate = false } = {}) {
    const nextContentIndex = scrollIndex < panels.length ? scrollIndex : -1;

    if (nextContentIndex === activeContentIndex && !immediate) return;

    const previousPanel =
      activeContentIndex >= 0 ? panels[activeContentIndex] : null;
    const nextPanel = nextContentIndex >= 0 ? panels[nextContentIndex] : null;
    const allItems = panels.flatMap((panel) => [...panel.querySelectorAll('[data-animate]')]);

    gsap.killTweensOf(allItems);

    activeContentIndex = nextContentIndex;

    if (immediate) {
      panels.forEach((panel, i) => {
        const items = panel.querySelectorAll('[data-animate]');
        const isActive = i === nextContentIndex;

        panel.classList.toggle('is-active', isActive);

        if (isActive) {
          gsap.set(items, { opacity: 1, y: 0, filter: 'blur(0px)' });
        } else {
          gsap.set(items, { opacity: 0, y: 32, filter: 'blur(6px)' });
        }
      });
      isAnimating = false;
      return;
    }

    isAnimating = true;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
      },
    });

    if (previousPanel) {
      tl.add(animateOut(previousPanel));
    }

    if (nextPanel) {
      const enterDelay = SECTION_ENTER_DELAY[nextContentIndex] ?? 0;

      if (enterDelay > 0) {
        tl.call(() => setActivePanel(nextContentIndex), null, enterDelay);
        tl.add(animateIn(nextPanel), enterDelay);
      } else {
        setActivePanel(nextContentIndex);
        tl.add(animateIn(nextPanel), previousPanel ? '-=0.15' : 0);
      }
    } else {
      hideAllPanels();
    }
  }

  function playInitial() {
    return animateIn(panels[0]);
  }

  if (!deferInitial) {
    requestAnimationFrame(() => {
      playInitial();
    });
  }

  return {
    goToSection,
    playInitial,
    getActiveIndex: () => activeContentIndex,
  };
}
