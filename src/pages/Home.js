/**
 * Home Page
 * Displays hockey matches from Streamed.pk
 */

import { getHockeyMatches } from '../services/streamedApi.js';
import { createMatchCard } from '../components/MatchCard.js';

export async function renderHomePage() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Hockey Streams</h1>
          <p class="page-subtitle">Watch live hockey games without ads or popups</p>
        </div>
        
        <div class="loading-container">
          <div class="loading"></div>
          <p class="loading-text">Loading matches...</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const matches = await getHockeyMatches();
    
    if (matches.length === 0) {
      app.innerHTML = `
        <div class="page">
          <div class="container">
            <div class="page-header">
              <h1 class="page-title">Hockey Streams</h1>
              <p class="page-subtitle">Watch live hockey games without ads or popups</p>
            </div>
            
            <div class="empty-state">
              <div class="empty-state-icon">🏒</div>
              <h2 class="empty-state-title">No Matches Available</h2>
              <p>There are no hockey matches streaming right now. Check back later!</p>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    // Separate matches by status
    const liveMatches = matches.filter(m => {
      const status = determineStatus(m.time);
      return status === 'live';
    });
    
    const upcomingMatches = matches.filter(m => {
      const status = determineStatus(m.time);
      return status === 'upcoming';
    });
    
    const finishedMatches = matches.filter(m => {
      const status = determineStatus(m.time);
      return status === 'finished';
    });
    
    // Render organized sections
    let html = `
      <div class="page">
        <div class="container">
          <div class="page-header">
            <h1 class="page-title">Hockey Streams</h1>
            <p class="page-subtitle">Watch live hockey games without ads or popups</p>
          </div>
    `;
    
    if (liveMatches.length > 0) {
      html += `
        <section class="matches-section">
          <h2>🔴 Live Now (${liveMatches.length})</h2>
          <div class="matches-grid" id="live-matches"></div>
        </section>
      `;
    }
    
    if (upcomingMatches.length > 0) {
      html += `
        <section class="matches-section mt-xl">
          <h2>📅 Upcoming (${upcomingMatches.length})</h2>
          <div class="matches-grid" id="upcoming-matches"></div>
        </section>
      `;
    }
    
    if (finishedMatches.length > 0) {
      html += `
        <section class="matches-section mt-xl">
          <h2>✅ Recently Finished (${finishedMatches.length})</h2>
          <div class="matches-grid" id="finished-matches"></div>
        </section>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
    
    app.innerHTML = html;
    
    // Render match cards
    if (liveMatches.length > 0) {
      const liveContainer = document.getElementById('live-matches');
      liveMatches.forEach(match => {
        const processedMatch = processMatch(match);
        liveContainer.appendChild(createMatchCard(processedMatch));
      });
    }
    
    if (upcomingMatches.length > 0) {
      const upcomingContainer = document.getElementById('upcoming-matches');
      upcomingMatches.forEach(match => {
        const processedMatch = processMatch(match);
        upcomingContainer.appendChild(createMatchCard(processedMatch));
      });
    }
    
    if (finishedMatches.length > 0) {
      const finishedContainer = document.getElementById('finished-matches');
      finishedMatches.forEach(match => {
        const processedMatch = processMatch(match);
        finishedContainer.appendChild(createMatchCard(processedMatch));
      });
    }
    
  } catch (error) {
    console.error('Error loading matches:', error);
    app.innerHTML = `
      <div class="page">
        <div class="container">
          <div class="page-header">
            <h1 class="page-title">Hockey Streams</h1>
            <p class="page-subtitle">Watch live hockey games without ads or popups</p>
          </div>
          
          <div class="error-message">
            <p>⚠️ Failed to load matches. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    `;
  }
}

function processMatch(match) {
  return {
    id: match.id,
    title: match.title,
    time: match.time,
    league: match.league || 'Hockey',
    sources: match.sources || [],
    status: determineStatus(match.time)
  };
}

function determineStatus(matchTime) {
  const now = new Date();
  const matchDate = new Date(matchTime);
  const endTime = new Date(matchDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours
  
  if (now >= matchDate && now <= endTime) {
    return 'live';
  } else if (now < matchDate) {
    return 'upcoming';
  } else {
    return 'finished';
  }
}
