/**
 * TeamCard Component
 * Displays an NHL team card with logo and information
 */

export function createTeamCard(team) {
  const card = document.createElement('div');
  card.className = 'team-card card';
  
  const logo = team.strBadge || team.strLogo || '';
  const stadium = team.strStadium || 'Unknown';
  const formed = team.intFormedYear || 'N/A';
  
  card.innerHTML = `
    <div class="team-logo">
      ${logo ? `<img src="${logo}" alt="${team.strTeam}" />` : `
        <div class="logo-placeholder">🏒</div>
      `}
    </div>
    
    <div class="team-info">
      <h3 class="team-name">${team.strTeam}</h3>
      <p class="team-league text-muted">${team.strLeague || 'NHL'}</p>
      
      <div class="team-details mt-sm">
        <span class="detail-item">
          <strong>Arena:</strong> ${stadium}
        </span>
        <span class="detail-item">
          <strong>Founded:</strong> ${formed}
        </span>
      </div>
    </div>
    
    <button class="team-button" data-team-id="${team.idTeam}">
      View Details
    </button>
  `;
  
  return card;
}

/**
 * Create team detail modal
 * @param {Object} team - Team object
 * @returns {HTMLElement} Modal element
 */
export function createTeamModal(team) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'team-modal';
  
  const logo = team.strBadge || team.strLogo || '';
  const banner = team.strTeamBanner || '';
  const description = team.strDescriptionEN || team.strDescription || 'No description available.';
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeTeamModal()"></div>
    <div class="modal-content">
      <button class="modal-close" onclick="closeTeamModal()">×</button>
      
      ${banner ? `
        <div class="modal-banner">
          <img src="${banner}" alt="${team.strTeam}" />
        </div>
      ` : ''}
      
      <div class="modal-body">
        <div class="modal-header">
          ${logo ? `<img src="${logo}" alt="${team.strTeam}" class="modal-logo" />` : ''}
          <div>
            <h2>${team.strTeam}</h2>
            <p class="text-secondary">${team.strLeague || 'NHL'}</p>
          </div>
        </div>
        
        <div class="modal-details">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Arena</span>
              <span class="detail-value">${team.strStadium || 'Unknown'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Location</span>
              <span class="detail-value">${team.strStadiumLocation || 'Unknown'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Founded</span>
              <span class="detail-value">${team.intFormedYear || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Capacity</span>
              <span class="detail-value">${team.intStadiumCapacity ? parseInt(team.intStadiumCapacity).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
          
          ${team.strWebsite ? `
            <div class="mt-lg">
              <a href="https://${team.strWebsite}" target="_blank" rel="noopener noreferrer" class="team-website">
                🌐 Visit Official Website
              </a>
            </div>
          ` : ''}
          
          <div class="team-description mt-lg">
            <h4>About</h4>
            <p>${description.substring(0, 500)}${description.length > 500 ? '...' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return modal;
}

/**
 * Close team modal
 */
window.closeTeamModal = function() {
  const modal = document.getElementById('team-modal');
  if (modal) {
    modal.remove();
  }
};
