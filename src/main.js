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

// Placeholder pages (will implement next)
async function renderSchedulePage() {
  const app = document.getElementById('app-content');
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Schedule</h1>
          <p class="page-subtitle">Upcoming hockey matches</p>
        </div>
        
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h2 class="empty-state-title">Coming Soon</h2>
          <p>The schedule page is under construction.</p>
        </div>
      </div>
    </div>
  `;
}

async function renderTeamsPage() {
  const app = document.getElementById('app-content');
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Teams</h1>
          <p class="page-subtitle">Browse NHL teams</p>
        </div>
        
        <div class="empty-state">
          <div class="empty-state-icon">🏒</div>
          <h2 class="empty-state-title">Coming Soon</h2>
          <p>The teams page is under construction.</p>
        </div>
      </div>
    </div>
  `;
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
