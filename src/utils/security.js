import { logger } from './logger.js';

/**
 * Security Utility
 * Provides protection mechanisms like redirect blocking for the application
 */

let redirectBlockingEnabled = false;

/**
 * Prevents the page from being navigated away by external redirects (common in ad-heavy sites)
 * Primarily used on pages with embedded video players
 */
export function setupRedirectBlocking() {
  if (redirectBlockingEnabled) return;
  
  logger.log('🛡️ Setting up redirect blocking...');
  
  // 1. Block window.open (pop-ups)
  const originalOpen = window.open;
  window.open = function(...args) {
    logger.log('🛡️ Blocked window.open:', args[0]);
    return null;
  };
  
  // 2. Block external links (but allow internal navigation)
  const clickHandler = (e) => {
    let target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A' && target.href) {
        // Allow internal navigation links (with data-link attribute)
        if (target.hasAttribute('data-link')) {
          return; // Let the router handle it
        }
        // Block external links
        if (!target.href.startsWith(window.location.origin)) {
          logger.log('🛡️ Blocked external link:', target.href);
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      target = target.parentElement;
    }
  };

  document.addEventListener('click', clickHandler, true);
  
  redirectBlockingEnabled = true;
  logger.log('✅ Redirect blocking enabled');
  
  // Return cleanup function
  return () => {
    window.open = originalOpen;
    document.removeEventListener('click', clickHandler, true);
    redirectBlockingEnabled = false;
  };
}
