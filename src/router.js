/**
 * Simple SPA Router
 * Handles client-side routing for the application
 */

import { updateActiveNav } from './components/Header.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.currentCleanup = null; // Store cleanup function for current route
    
    // Listen for navigation events
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Intercept link clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        this.navigateTo(e.target.href);
      }
    });
  }

  /**
   * Register a route
   * @param {string} path - Route path (supports :param syntax)
   * @param {Function} handler - Route handler function
   * @param {Function} cleanup - Optional cleanup function to call when leaving route
   */
  route(path, handler, cleanup = null) {
    this.routes[path] = { handler, cleanup };
  }

  /**
   * Navigate to a path
   * @param {string} path - Path to navigate to
   */
  navigateTo(path) {
    history.pushState(null, null, path);
    this.handleRoute();
  }

  /**
   * Handle current route
   */
  async handleRoute() {
    // Run cleanup for previous route
    if (this.currentCleanup) {
      try {
        this.currentCleanup();
      } catch (error) {
        console.error('Error during route cleanup:', error);
      }
      this.currentCleanup = null;
    }
    
    const path = window.location.pathname;
    const { handler, cleanup, params } = this.matchRoute(path);
    
    if (handler) {
      this.currentRoute = path;
      this.currentCleanup = cleanup;
      await handler(params);
      // Update nav active state after route changes
      updateActiveNav();
    } else {
      // 404 - redirect to home
      this.navigateTo('/');
    }
  }

  /**
   * Match current path to registered routes
   * @param {string} path - Current path
   * @returns {Object} { handler, cleanup, params }
   */
  matchRoute(path) {
    // Try exact match first
    if (this.routes[path]) {
      const route = this.routes[path];
      return { 
        handler: route.handler, 
        cleanup: route.cleanup,
        params: {} 
      };
    }
    
    // Try parameterized routes
    for (const [routePath, route] of Object.entries(this.routes)) {
      const params = this.extractParams(routePath, path);
      if (params) {
        return { 
          handler: route.handler, 
          cleanup: route.cleanup,
          params 
        };
      }
    }
    
    return { handler: null, cleanup: null, params: {} };
  }

  /**
   * Extract parameters from path
   * @param {string} route - Route pattern
   * @param {string} path - Actual path
   * @returns {Object|null} Parameters or null if no match
   */
  extractParams(route, path) {
    const routeParts = route.split('/');
    const pathParts = path.split('/');
    
    if (routeParts.length !== pathParts.length) {
      return null;
    }
    
    const params = {};
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        return null;
      }
    }
    
    return params;
  }

  /**
   * Start the router
   */
  start() {
    this.handleRoute();
  }
}

// Export singleton instance
export const router = new Router();

// Expose on window for global access (used by team modals)
window.router = router;

/**
 * Create a navigation link element
 * @param {string} href - Link destination
 * @param {string} text - Link text
 * @param {string} className - CSS class (optional)
 * @returns {HTMLAnchorElement} Link element
 */
export function createLink(href, text, className = '') {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  link.className = className;
  link.dataset.link = '';
  return link;
}
