/**
 * Header Component
 * Site header with navigation - supports Sens mode transformation
 */

import { createLink } from '../router.js';

export function createHeader() {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.id = 'site-header';
  
  renderHeaderContent(header);
  
  // Add active class to current page
  updateActiveNav();
  
  return header;
}

function renderHeaderContent(header) {
  const currentPath = window.location.pathname;
  const isSensMode = currentPath.startsWith('/sens-hub');
  
  if (isSensMode) {
    // Sens Fan Hub Mode
    header.innerHTML = `
      <div class="container">
        <div class="header-content">
          <div style="display: flex; align-items: center; gap: var(--spacing-lg);">
            <div class="logo">
              <a href="/sens-hub" data-link>
                <img src="/sens-logo.svg" alt="Ottawa Senators" style="width: 40px; height: 40px;" />
                <span class="logo-text sens-hub-title">Senators Fan Hub</span>
              </a>
            </div>
          </div>
          <nav class="nav">
            <a href="/sens-hub" data-link class="nav-link">Countdown</a>
            <a href="/sens-hub/salary-cap" data-link class="nav-link">Salary Cap</a>
            <a href="/sens-hub/team" data-link class="nav-link">Team Info</a>
            <a href="/sens-hub/season" data-link class="nav-link">Season</a>
          </nav>
          <a href="/schedule" data-link class="back-to-streampuck-button">
            Back to StreamPuck
          </a>
        </div>
      </div>
    `;
  } else {
    // Normal StreamPuck Mode
    header.innerHTML = `
      <div class="container">
        <div class="header-content">
          <div style="display: flex; align-items: center; gap: var(--spacing-lg);">
            <a href="/settings" data-link class="settings-icon-button" title="Settings">
              ⚙️
            </a>
            <div class="logo">
              <a href="/" data-link>
                <span class="logo-icon">🏒</span>
                <span class="logo-text">StreamPuck</span>
              </a>
            </div>
          </div>
          <nav class="nav">
            <a href="/schedule" data-link class="nav-link">Schedule</a>
            <a href="/teams" data-link class="nav-link">Teams</a>
            <a href="/standings" data-link class="nav-link">Standings</a>
          </nav>
          <a href="/sens-hub" data-link class="sens-hub-button">
            <img src="/sens-logo.svg" alt="Sens" style="width: 20px; height: 20px;" />
            SENS FAN HUB
          </a>
        </div>
      </div>
    `;
  }
}

export function updateActiveNav() {
  const links = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname;
  
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPath || 
        (currentPath === '/' && link.getAttribute('href') === '/schedule')) {
      link.classList.add('active');
    }
  });
  
  // Update theme based on route
  const isSensMode = currentPath.startsWith('/sens-hub');
  document.body.classList.toggle('sens-mode', isSensMode);
  
  // Re-render header if mode changed
  const header = document.getElementById('site-header');
  if (header) {
    const wasInSensMode = header.querySelector('.back-to-streampuck-button') !== null;
    if (wasInSensMode !== isSensMode) {
      renderHeaderContent(header);
      updateActiveNav(); // Re-run to set active states
    }
  }
}
