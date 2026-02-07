/**
 * Highlights Section Component
 * Displays goal highlights in a grid layout
 */

export function createHighlightsSection(highlights, onHighlightClick) {
  if (!highlights || highlights.length === 0) {
    return ''; // Don't render section if no highlights
  }
  
  const highlightCards = highlights.map((highlight, index) => 
    createHighlightCard(highlight, index, onHighlightClick)
  ).join('');
  
  return `
    <section class="highlights-section">
      <div class="highlights-header">
        <h2 class="highlights-title">🎯 Goal Highlights</h2>
        <span class="highlights-count">${highlights.length} ${highlights.length === 1 ? 'Goal' : 'Goals'}</span>
      </div>
      
      <div class="highlights-grid">
        ${highlightCards}
      </div>
    </section>
  `;
}

/**
 * Create a single highlight card
 */
function createHighlightCard(highlight, index, onClickCallback) {
  const strengthBadge = getStrengthBadge(highlight.strength);
  const teamColor = getTeamColor(highlight.team.abbrev);
  
  return `
    <div class="highlight-card" 
         role="button"
         tabindex="0"
         aria-label="Watch goal by ${highlight.scorer.name}, ${highlight.timeInPeriod} in ${highlight.periodDisplay}"
         data-highlight-index="${index}"
         style="--team-color: ${teamColor}">
      
      <div class="highlight-thumbnail">
        ${highlight.team.logo ? 
          `<img src="${highlight.team.logo}" alt="${highlight.team.name}" class="team-logo-bg" loading="lazy">` :
          ''
        }
        <div class="play-button">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      
      <div class="highlight-info">
        <div class="highlight-header">
          <h3 class="scorer-name">${highlight.scorer.name}</h3>
          ${strengthBadge}
        </div>
        
        <div class="highlight-details">
          <span class="period">${highlight.periodDisplay}</span>
          <span class="time">${highlight.timeInPeriod}</span>
        </div>
        
        <div class="highlight-score">
          ${highlight.score.display}
          ${highlight.assists.length > 0 ? 
            `<span class="assists-count">(${highlight.assists.length}A)</span>` : 
            ''
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * Get strength badge HTML
 */
function getStrengthBadge(strength) {
  const badges = {
    'pp': '<span class="strength-badge pp">PP</span>',
    'sh': '<span class="strength-badge sh">SH</span>',
    'ps': '<span class="strength-badge ps">PS</span>',
    'ev': ''
  };
  
  return badges[strength] || '';
}

/**
 * Get team accent color
 */
function getTeamColor(teamAbbrev) {
  const teamColors = {
    // Atlantic
    'BOS': '#FFB81C',
    'BUF': '#003087',
    'DET': '#CE1126',
    'FLA': '#C8102E',
    'MTL': '#AF1E2D',
    'OTT': '#C52032',
    'TBL': '#002868',
    'TOR': '#003E7E',
    
    // Metropolitan
    'CAR': '#CE1126',
    'CBJ': '#002654',
    'NJD': '#CE1126',
    'NYI': '#00539B',
    'NYR': '#0038A8',
    'PHI': '#F74902',
    'PIT': '#FCB514',
    'WSH': '#041E42',
    
    // Central
    'ARI': '#8C2633',
    'CHI': '#CF0A2C',
    'COL': '#6F263D',
    'DAL': '#006847',
    'MIN': '#154734',
    'NSH': '#FFB81C',
    'STL': '#002F87',
    'WPG': '#041E42',
    'UTA': '#69B3E7',
    
    // Pacific
    'ANA': '#F47A38',
    'CGY': '#C8102E',
    'EDM': '#FF4C00',
    'LAK': '#111111',
    'SJS': '#006D75',
    'SEA': '#001628',
    'VAN': '#00205B',
    'VGK': '#B4975A'
  };
  
  return teamColors[teamAbbrev] || '#FF6B6B';
}

/**
 * Setup event handlers for highlight clicks
 */
export function setupHighlightHandlers(highlights, onHighlightClick) {
  const cards = document.querySelectorAll('.highlight-card');
  
  cards.forEach(card => {
    const handleClick = () => {
      const index = parseInt(card.dataset.highlightIndex);
      onHighlightClick(highlights[index], index);
    };

    card.addEventListener('click', handleClick);
    
    // Add keyboard support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    });
  });
}

/**
 * Create loading skeleton for highlights
 */
export function createHighlightsLoadingSkeleton() {
  return `
    <section class="highlights-section">
      <div class="highlights-header">
        <h2 class="highlights-title">🎯 Goal Highlights</h2>
        <span class="highlights-loading">Loading...</span>
      </div>
      
      <div class="highlights-grid">
        ${Array(6).fill(0).map(() => `
          <div class="highlight-card skeleton">
            <div class="highlight-thumbnail skeleton-shimmer"></div>
            <div class="highlight-info">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}
