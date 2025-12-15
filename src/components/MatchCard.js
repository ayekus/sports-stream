/**
 * MatchCard Component
 * Displays a hockey match card with teams, time, and stream availability
 */

import { formatTime, formatDate, isToday, getRelativeTime } from '../utils/date.js';
import { router } from '../router.js';

export function createMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'match-card card';
  
  const matchDate = new Date(match.time);
  const timeDisplay = isToday(match.time) 
    ? formatTime(match.time) 
    : `${formatDate(match.time)} ${formatTime(match.time)}`;
  
  const relativeTime = getRelativeTime(match.time);
  const statusBadge = getStatusBadge(match.status);
  
  card.innerHTML = `
    <div class="match-card-header">
      <span class="match-league">${match.league || 'Hockey'}</span>
      ${statusBadge}
    </div>
    
    <div class="match-teams">
      <h3 class="match-title">${match.title}</h3>
    </div>
    
    <div class="match-info">
      <div class="match-time">
        <span class="time-main">${timeDisplay}</span>
        <span class="time-relative text-muted">${relativeTime}</span>
      </div>
      <div class="match-streams">
        <span class="stream-count">${match.sources?.length || 0} stream${match.sources?.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
    
    <button class="watch-button" data-match-id="${match.id}">
      ${match.status === 'live' ? '🔴 Watch Live' : 'View Streams'}
    </button>
  `;
  
  // Add click handler
  const button = card.querySelector('.watch-button');
  button.addEventListener('click', () => {
    router.navigateTo(`/match/${match.id}`);
  });
  
  return card;
}

function getStatusBadge(status) {
  const badges = {
    live: '<span class="badge live">Live</span>',
    upcoming: '<span class="badge upcoming">Upcoming</span>',
    finished: '<span class="badge finished">Finished</span>',
  };
  
  return badges[status] || '';
}
