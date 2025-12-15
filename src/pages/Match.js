/**
 * Match Detail Page
 * Shows stream player and match information
 */

import { getStreamUrls } from '../services/streamedApi.js';
import { getHockeyMatches } from '../services/streamedApi.js';

export async function renderMatchPage(params) {
  const app = document.getElementById('app-content');
  const matchId = params.id;
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="loading-container">
          <div class="loading"></div>
          <p class="loading-text">Loading stream...</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    // Get match data
    const matches = await getHockeyMatches();
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      app.innerHTML = `
        <div class="page">
          <div class="container">
            <div class="empty-state">
              <div class="empty-state-icon">❌</div>
              <h2 class="empty-state-title">Match Not Found</h2>
              <p>The requested match could not be found.</p>
              <button onclick="window.history.back()" class="mt-lg">Go Back</button>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    if (!match.sources || match.sources.length === 0) {
      app.innerHTML = `
        <div class="page">
          <div class="container">
            <h1 class="page-title">${match.title}</h1>
            <div class="error-message mt-lg">
              <p>⚠️ No streams available for this match.</p>
            </div>
            <button onclick="window.history.back()" class="mt-lg">Go Back</button>
          </div>
        </div>
      `;
      return;
    }
    
    // Get stream URLs
    const firstSource = match.sources[0];
    const streamData = await getStreamUrls(firstSource.source, firstSource.id);
    
    // Render match page with stream
    app.innerHTML = `
      <div class="page match-page">
        <div class="container">
          <button class="back-button mb-lg" onclick="window.history.back()">
            ← Back to Matches
          </button>
          
          <h1 class="page-title">${match.title}</h1>
          <p class="text-secondary mb-lg">${match.league || 'Hockey'}</p>
          
          <div class="stream-container">
            <div class="stream-notice">
              <p>⚠️ Stream player integration coming soon!</p>
              <p class="text-secondary mt-sm">For now, stream links are being fetched from the API.</p>
              ${streamData.embedUrl ? `<p class="mt-md">Stream URL: <code>${streamData.embedUrl}</code></p>` : ''}
            </div>
            
            ${match.sources.length > 1 ? `
              <div class="stream-sources mt-lg">
                <h3>Available Streams (${match.sources.length})</h3>
                <div class="sources-list">
                  ${match.sources.map((source, idx) => `
                    <button class="source-button" data-source-idx="${idx}">
                      Stream ${idx + 1} (${source.source})
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="match-details mt-xl card">
            <h3>Match Details</h3>
            <dl class="details-list">
              <dt>League</dt>
              <dd>${match.league || 'Unknown'}</dd>
              
              <dt>Match Time</dt>
              <dd>${new Date(match.time).toLocaleString()}</dd>
              
              <dt>Available Streams</dt>
              <dd>${match.sources.length} source${match.sources.length !== 1 ? 's' : ''}</dd>
            </dl>
          </div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading match:', error);
    app.innerHTML = `
      <div class="page">
        <div class="container">
          <div class="error-message">
            <p>⚠️ Failed to load stream. Please try again.</p>
          </div>
          <button onclick="window.history.back()" class="mt-lg">Go Back</button>
        </div>
      </div>
    `;
  }
}
