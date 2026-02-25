/**
 * Sports Streaming Platform
 * Main application entry point
 */

import './styles/index.css';
import './styles/components.css';
import './styles/game-cards.css';
import './styles/highlights.css';
import './styles/sens-common.css';
import './styles/sens-countdown.css';
import './styles/sens-salary-cap.css';
import './styles/sens-season-tracker.css';
import './styles/sens-team-info.css';
import { router } from './router.js';
import { createHeader } from './components/Header.js';

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
  
  // Setup routes with code splitting
  router.route('/', async (params) => {
    const { renderSchedulePage } = await import('./pages/Schedule.js');
    return renderSchedulePage(params);
  });

  router.route('/match/:id',
    async (params) => {
      const { renderMatchPage } = await import('./pages/Match.js');
      return renderMatchPage(params);
    },
    async () => {
      const { cleanupMatchPage } = await import('./pages/Match.js');
      return cleanupMatchPage();
    }
  );

  router.route('/schedule', async (params) => {
    const { renderSchedulePage } = await import('./pages/Schedule.js');
    return renderSchedulePage(params);
  });

  router.route('/teams', async (params) => {
    const { renderTeamsPage } = await import('./pages/Teams.js');
    return renderTeamsPage(params);
  });

  router.route('/standings', async (params) => {
    const { renderStandingsPage } = await import('./pages/Standings.js');
    return renderStandingsPage(params);
  });

  router.route('/settings', async (params) => {
    const { renderSettingsPage } = await import('./pages/Settings.js');
    return renderSettingsPage(params);
  });
  
  // Senators Fan Hub routes with code splitting
  router.route('/sens-hub',
    async (params) => {
      const { renderSensCountdown } = await import('./pages/SensCountdown.js');
      return renderSensCountdown(params);
    },
    async () => {
      const { cleanupSensCountdown } = await import('./pages/SensCountdown.js');
      return cleanupSensCountdown();
    }
  );

  router.route('/sens-hub/salary-cap', async (params) => {
    const { renderSensSalaryCap } = await import('./pages/SensSalaryCap.js');
    return renderSensSalaryCap(params);
  });

  router.route('/sens-hub/team',
    async (params) => {
      const { renderSensTeamInfo } = await import('./pages/SensTeamInfo.js');
      return renderSensTeamInfo(params);
    },
    async () => {
      const { cleanupSensTeamInfo } = await import('./pages/SensTeamInfo.js');
      return cleanupSensTeamInfo();
    }
  );

  router.route('/sens-hub/season', async (params) => {
    const { renderSensSeasonTracker } = await import('./pages/SensSeasonTracker.js');
    return renderSensSeasonTracker(params);
  });
  
  // Start router
  router.start();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
