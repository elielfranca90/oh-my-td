/**
 * Helper to detect mobile device (touch/coarse pointer) and set CSS classes.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasCoarsePointer = typeof window.matchMedia === 'function' ? (window.matchMedia('(pointer: coarse)')?.matches || false) : false;
  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const isTouchUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  return hasCoarsePointer || isTouchUA;
}

export function initMobileDetection(): boolean {
  const isMobile = isMobileDevice();
  if (typeof document !== 'undefined' && document.body) {
    if (isMobile) {
      document.body.classList.add('is-mobile');
    } else {
      document.body.classList.remove('is-mobile');
    }
  }
  return isMobile;
}
