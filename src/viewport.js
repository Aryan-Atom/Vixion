export function getViewportHeight() {
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

export function getViewportWidth() {
  return Math.round(window.visualViewport?.width ?? window.innerWidth);
}

export function syncViewportVars() {
  document.documentElement.style.setProperty('--app-height', `${getViewportHeight()}px`);
  document.documentElement.style.setProperty('--app-width', `${getViewportWidth()}px`);
}

export function setupViewportSync() {
  syncViewportVars();

  window.visualViewport?.addEventListener('resize', syncViewportVars);
  window.visualViewport?.addEventListener('scroll', syncViewportVars);
  window.addEventListener('resize', syncViewportVars);
  window.addEventListener('orientationchange', syncViewportVars);
}
