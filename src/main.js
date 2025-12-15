/**
 * Sports Streaming Platform
 * Main application entry point
 */

import './styles/index.css';
import './styles/components.css';
import { router } from './router.js';
import { createHeader } from './components/Header.js';
import { renderHomePage } from './pages/Home.js';
import { renderMatchPage } from './pages/Match.js';
import { renderSettingsPage } from './pages/Settings.js';
import { renderTeamsPage } from './pages/Teams.js';
import { renderSchedulePage } from './pages/Schedule.js';

// Initialize app
function initApp() {
  const app = document.getElementById('app');
  
  // Create app structure
  app.innerHTML = `
    <div id="app-header"></div>
    <div id="app-content"></div>
  `;
  
  // Render header
  const headerContainer = document.getElementById('app-header');
  headerContainer.appendChild(createHeader());
  
  // Setup routes
  router.route('/', renderHomePage);
  router.route('/match/:id', renderMatchPage);
  router.route('/schedule', renderSchedulePage);
  router.route('/teams', renderTeamsPage);
  router.route('/settings', renderSettingsPage);
  
  // Start router
  router.start();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
