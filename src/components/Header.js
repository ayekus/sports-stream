/**
 * Header Component
 * Site header with navigation
 */

import { createLink } from '../router.js';

export function createHeader() {
  const header = document.createElement('header');
  header.className = 'site-header';
  
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/schedule', label: 'Schedule' },
    { path: '/teams', label: 'Teams' },
    { path: '/standings', label: 'Standings' },
    { path: '/settings', label: 'Settings' }
  ];
  
  header.innerHTML = `
    <div class="container">
      <div class="header-content">
        <div class="logo">
          <a href="/" data-link>
            <span class="logo-icon">🏒</span>
            <span class="logo-text">StreamPuck</span>
          </a>
        </div>
        <nav class="nav">
          <a href="/" data-link class="nav-link">Home</a>
          <a href="/schedule" data-link class="nav-link">Schedule</a>
          <a href="/teams" data-link class="nav-link">Teams</a>
          <a href="/standings" data-link class="nav-link">Standings</a>
          <a href="/settings" data-link class="nav-link">Settings</a>
        </nav>
      </div>
    </div>
  `;
  
  // Add active class to current page
  updateActiveNav(header);
  
  return header;
}

function updateActiveNav(header) {
  const currentPath = window.location.pathname;
  const links = header.querySelectorAll('.nav-link');
  
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPath || 
        (currentPath === '/' && link.getAttribute('href') === '/')) {
      link.classList.add('active');
    }
  });
}
