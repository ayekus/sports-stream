/**
 * Standings Page
 * Display NHL standings with multiple views: Wild Card, Division, Conference, League
 */

import { getNHLStandings, getTeamLogoUrl } from '../services/nhlApi.js';
import { router } from '../router.js';

let currentStandings = null;
let currentView = 'wildcard'; // wildcard, division, conference, league

export async function renderStandingsPage() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        
        <div class="loading-container">
          <div class="loading"></div>
          <p class="loading-text">Loading standings...</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const data = await getNHLStandings();
    currentStandings = data;
    
    if (!data || !data.standings) {
      renderEmptyStandings();
      return;
    }
    
    renderStandingsUI(data);
    setupStandingsHandlers();
    
  } catch (error) {
    console.error('Error loading standings:', error);
    renderErrorStandings();
  }
}

function renderEmptyStandings() {
  const app = document.getElementById('app-content');
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h2 class="empty-state-title">Standings Unavailable</h2>
          <p>NHL standings data is currently unavailable.</p>
        </div>
      </div>
    </div>
  `;
}

function renderErrorStandings() {
  const app = document.getElementById('app-content');
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="error-message">
          <p>⚠️ Failed to load standings. Please try again later.</p>
        </div>
      </div>
    </div>
  `;
}

function renderStandingsUI(data) {
  const app = document.getElementById('app-content');
  
  let html = `
    <div class="page">
      <div class="container">
        
        <div class="view-toggle card mb-lg">
          <button class="view-button ${currentView === 'wildcard' ? 'active' : ''}" data-view="wildcard">Wild Card</button>
          <button class="view-button ${currentView === 'division' ? 'active' : ''}" data-view="division">Division</button>
          <button class="view-button ${currentView === 'conference' ? 'active' : ''}" data-view="conference">Conference</button>
          <button class="view-button ${currentView === 'league' ? 'active' : ''}" data-view="league">League</button>
        </div>
        
        <div id="standings-content"></div>
      </div>
    </div>
  `;
  
  app.innerHTML = html;
  renderViewContent(data);
}

function renderViewContent(data) {
  const container = document.getElementById('standings-content');
  if (!container) return;
  
  switch (currentView) {
    case 'wildcard':
      container.innerHTML = renderWildCardView(data.standings);
      break;
    case 'division':
      container.innerHTML = renderDivisionView(data.standings);
      break;
    case 'conference':
      container.innerHTML = renderConferenceView(data.standings);
      break;
    case 'league':
      container.innerHTML = renderLeagueView(data.standings);
      break;
  }
}

function renderWildCardView(standings) {
  // Group by conference and division
  const eastern = standings.filter(t => t.conferenceAbbrev === 'E');
  const western = standings.filter(t => t.conferenceAbbrev === 'W');
  
  const easternDivisions = groupByDivision(eastern);
  const westernDivisions = groupByDivision(western);
  
  // Calculate wild cards
  const easternWildCard = calculateWildCard(eastern);
  const westernWildCard = calculateWildCard(western);
  
  let html = '<div class="wildcard-grid">';
  
  // Eastern Conference
  html += '<div class="conference-section">';
  html += '<h2 class="conference-title">Eastern Conference</h2>';
  
  for (const [divisionName, teams] of Object.entries(easternDivisions)) {
    html += createDivisionTable(divisionName, teams.slice(0, 3), true);
  }
  
  html += createWildCardTable('Eastern Wild Card', easternWildCard);
  html += '</div>';
  
  // Western Conference
  html += '<div class="conference-section">';
  html += '<h2 class="conference-title">Western Conference</h2>';
  
  for (const [divisionName, teams] of Object.entries(westernDivisions)) {
    html += createDivisionTable(divisionName, teams.slice(0, 3), true);
  }
  
  html += createWildCardTable('Western Wild Card', westernWildCard);
  html += '</div>';
  
  html += '</div>';
  return html;
}

function renderDivisionView(standings) {
  const divisions = groupByDivision(standings);
  
  // Calculate all playoff teams (including wild cards)
  const playoffTeams = calculatePlayoffTeams(standings);
  const wildcardTeams = calculateWildcardTeams(standings);
  
  let html = '<div class="division-grid">';
  
  for (const [divisionName, teams] of Object.entries(divisions)) {
    html += createDivisionTable(divisionName, teams, false, playoffTeams, wildcardTeams);
  }
  
  html += '</div>';
  return html;
}

function renderConferenceView(standings) {
  const eastern = standings.filter(t => t.conferenceAbbrev === 'E').sort((a, b) => a.conferenceSequence - b.conferenceSequence);
  const western = standings.filter(t => t.conferenceAbbrev === 'W').sort((a, b) => a.conferenceSequence - b.conferenceSequence);
  
  const wildcardTeams = calculateWildcardTeams(standings);
  
  let html = '<div class="conference-grid">';
  html += createConferenceTable('Eastern Conference', eastern, wildcardTeams);
  html += createConferenceTable('Western Conference', western, wildcardTeams);
  html += '</div>';
  
  return html;
}

function renderLeagueView(standings) {
  const sorted = [...standings].sort((a, b) => a.leagueSequence - b.leagueSequence);
  
  // Calculate playoff teams
  const playoffTeams = calculatePlayoffTeams(standings);
  const wildcardTeams = calculateWildcardTeams(standings);
  
  return createLeagueTable(sorted, playoffTeams, wildcardTeams);
}

function createDivisionTable(title, teams, isWildCardView, playoffTeamsOrFlag = false, wildcardTeamsOrFlag = false) {
  let html = `
    <section class="standings-table-container card mb-lg">
      <h3 class="table-header">${title}</h3>
      <div class="standings-table-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="rank-col">#</th>
              <th class="team-col">Team</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>OT</th>
              <th>PTS</th>
              <th class="hide-mobile">GF</th>
              <th class="hide-mobile">GA</th>
              <th class="hide-mobile">DIFF</th>
              <th class="hide-mobile">L10</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  teams.forEach((team, index) => {
    const rank = isWildCardView ? index + 1 : team.divisionSequence;
    let playoffClass = '';
    
    const teamAbbrev = team.teamAbbrev?.default;
    
    if (isWildCardView && index < 3) {
      // Wild card view: highlight top 3 in each division
      playoffClass = 'playoff-spot';
    } else if (wildcardTeamsOrFlag instanceof Set && wildcardTeamsOrFlag.has(teamAbbrev)) {
      // Check if team is a wildcard team first
      playoffClass = 'wildcard-spot';
    } else if (playoffTeamsOrFlag instanceof Set && playoffTeamsOrFlag.has(teamAbbrev)) {
      // Check if team is a playoff team (top 3 in division)
      playoffClass = 'playoff-spot';
    }
    
    html += createTeamRow(team, rank, playoffClass);
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;
  
  return html;
}

function createWildCardTable(title, teams) {
  let html = `
    <section class="standings-table-container card mb-lg">
      <h3 class="table-header wildcard-header">${title}</h3>
      <div class="standings-table-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="rank-col">#</th>
              <th class="team-col">Team</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>OT</th>
              <th>PTS</th>
              <th class="hide-mobile">GF</th>
              <th class="hide-mobile">GA</th>
              <th class="hide-mobile">DIFF</th>
              <th class="hide-mobile">L10</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  teams.forEach((team, index) => {
    const playoffClass = index < 2 ? 'wildcard-spot' : '';
    html += createTeamRow(team, index + 1, playoffClass);
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;
  
  return html;
}

function createConferenceTable(title, teams, wildcardTeams) {
  let html = `
    <section class="standings-table-container card mb-lg">
      <h3 class="table-header">${title}</h3>
      <div class="standings-table-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="rank-col">#</th>
              <th class="team-col">Team</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>OT</th>
              <th>PTS</th>
              <th class="hide-mobile">GF</th>
              <th class="hide-mobile">GA</th>
              <th class="hide-mobile">DIFF</th>
              <th class="hide-mobile">L10</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  teams.forEach((team, index) => {
    const teamAbbrev = team.teamAbbrev?.default;
    let playoffClass = '';
    
    if (wildcardTeams.has(teamAbbrev)) {
      playoffClass = 'wildcard-spot';
    } else if (index < 8) {
      playoffClass = 'playoff-spot';
    }
    
    html += createTeamRow(team, index + 1, playoffClass);
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;
  
  return html;
}

function createLeagueTable(teams, playoffTeams, wildcardTeams) {
  let html = `
    <section class="standings-table-container card">
      <h3 class="table-header">NHL League Standings</h3>
      <div class="standings-table-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="rank-col">#</th>
              <th class="team-col">Team</th>
              <th>DIV</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>OT</th>
              <th>PTS</th>
              <th class="hide-mobile">GF</th>
              <th class="hide-mobile">GA</th>
              <th class="hide-mobile">DIFF</th>
              <th class="hide-mobile">L10</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  teams.forEach((team, index) => {
    const teamAbbrev = team.teamAbbrev?.default;
    let playoffClass = '';
    
    if (wildcardTeams.has(teamAbbrev)) {
      playoffClass = 'wildcard-spot';
    } else if (playoffTeams.has(teamAbbrev)) {
      playoffClass = 'playoff-spot';
    }
    
    html += createTeamRow(team, index + 1, playoffClass, true);
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;
  
  return html;
}

function createTeamRow(team, rank, playoffClass = '', showDivision = false) {
  const logoUrl = getTeamLogoUrl(team.teamAbbrev?.default || team.teamCommonName?.default);
  const l10Record = `${team.l10Wins || 0}-${team.l10Losses || 0}-${team.l10OtLosses || 0}`;
  
  return `
    <tr class="${playoffClass}">
      <td class="rank-col">${rank}</td>
      <td class="team-col">
        <img src="${logoUrl}" alt="${team.teamName?.default}" class="team-logo-small" onerror="this.style.display='none'" loading="lazy" />
        <span class="team-name">${team.teamName?.default || 'Unknown'}</span>
      </td>
      ${showDivision ? `<td>${team.divisionAbbrev}</td>` : ''}
      <td>${team.gamesPlayed || 0}</td>
      <td>${team.wins || 0}</td>
      <td>${team.losses || 0}</td>
      <td>${team.otLosses || 0}</td>
      <td class="points-col"><strong>${team.points || 0}</strong></td>
      <td class="hide-mobile">${team.goalFor || 0}</td>
      <td class="hide-mobile">${team.goalAgainst || 0}</td>
      <td class="hide-mobile ${team.goalDifferential > 0 ? 'positive' : team.goalDifferential < 0 ? 'negative' : ''}">${team.goalDifferential > 0 ? '+' : ''}${team.goalDifferential || 0}</td>
      <td class="hide-mobile">${l10Record}</td>
    </tr>
  `;
}

function groupByDivision(standings) {
  const divisions = {};
  
  standings.forEach(team => {
    const divisionName = team.divisionName || 'Unknown';
    if (!divisions[divisionName]) {
      divisions[divisionName] = [];
    }
    divisions[divisionName].push(team);
  });
  
  // Sort teams within each division
  for (const division in divisions) {
    divisions[division].sort((a, b) => a.divisionSequence - b.divisionSequence);
  }
  
  return divisions;
}

function calculateWildCard(conferenceTeams) {
  // Get division leaders (top team from each division)
  const divisions = groupByDivision(conferenceTeams);
  const divisionLeaders = [];
  
  for (const teams of Object.values(divisions)) {
    // Top 3 from each division
    divisionLeaders.push(...teams.slice(0, 3));
  }
  
  // Get remaining teams (not in top 3 of their division)
  const wildCardCandidates = conferenceTeams.filter(team => {
    return !divisionLeaders.find(leader => leader.teamAbbrev?.default === team.teamAbbrev?.default);
  });
  
  // Sort by wildcard sequence
  wildCardCandidates.sort((a, b) => a.wildcardSequence - b.wildcardSequence);
  
  // Return top 10 (show more context)
  return wildCardCandidates.slice(0, 10);
}

function calculatePlayoffTeams(standings) {
  /**
   * Calculate which teams make the playoffs
   * NHL Playoff Format:
   * - Top 3 teams from each division (4 divisions x 3 = 12 teams)
   * - 2 Wild Card teams from each conference (2 conferences x 2 = 4 teams)
   * - Total: 16 playoff teams (8 per conference)
   */
  const playoffTeams = new Set();
  
  // Get top 3 from each division
  const divisions = groupByDivision(standings);
  for (const teams of Object.values(divisions)) {
    teams.slice(0, 3).forEach(team => {
      playoffTeams.add(team.teamAbbrev?.default);
    });
  }
  
  // Get wild card teams from each conference
  const eastern = standings.filter(t => t.conferenceAbbrev === 'E');
  const western = standings.filter(t => t.conferenceAbbrev === 'W');
  
  const easternWildCard = calculateWildCard(eastern);
  const westernWildCard = calculateWildCard(western);
  
  // Add top 2 wild card teams from each conference
  easternWildCard.slice(0, 2).forEach(team => {
    playoffTeams.add(team.teamAbbrev?.default);
  });
  
  westernWildCard.slice(0, 2).forEach(team => {
    playoffTeams.add(team.teamAbbrev?.default);
  });
  
  return playoffTeams;
}

function calculateWildcardTeams(standings) {
  /**
   * Calculate which teams are wildcard teams
   * Returns a Set of team abbreviations for the 2 wildcard teams from each conference
   */
  const wildcardTeams = new Set();
  
  // Get top 3 from each division (these are NOT wildcard teams)
  const divisions = groupByDivision(standings);
  const divisionLeaders = new Set();
  
  for (const teams of Object.values(divisions)) {
    teams.slice(0, 3).forEach(team => {
      divisionLeaders.add(team.teamAbbrev?.default);
    });
  }
  
  // Get wild card teams from each conference
  const eastern = standings.filter(t => t.conferenceAbbrev === 'E');
  const western = standings.filter(t => t.conferenceAbbrev === 'W');
  
  const easternWildCard = calculateWildCard(eastern);
  const westernWildCard = calculateWildCard(western);
  
  // Add top 2 wild card teams from each conference (only if they're not division leaders)
  easternWildCard.slice(0, 2).forEach(team => {
    const teamAbbrev = team.teamAbbrev?.default;
    if (!divisionLeaders.has(teamAbbrev)) {
      wildcardTeams.add(teamAbbrev);
    }
  });
  
  westernWildCard.slice(0, 2).forEach(team => {
    const teamAbbrev = team.teamAbbrev?.default;
    if (!divisionLeaders.has(teamAbbrev)) {
      wildcardTeams.add(teamAbbrev);
    }
  });
  
  return wildcardTeams;
}

function setupStandingsHandlers() {
  const viewButtons = document.querySelectorAll('.view-button');
  
  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view;
      
      // Update active state
      viewButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Re-render content
      if (currentStandings) {
        renderViewContent(currentStandings);
      }
    });
  });
}
