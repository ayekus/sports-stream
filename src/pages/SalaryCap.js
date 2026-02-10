import { getSenatorsSalaryCap, formatSalary, formatNumber } from '../services/salaryCapApi.js';

export default class SalaryCap {
  constructor() {
    this.data = null;
    this.loading = true;
    this.error = null;
  }

  async mount() {
    await this.loadData();
    return this.render();
  }

  async loadData() {
    try {
      this.loading = true;
      this.data = await getSenatorsSalaryCap();
      this.loading = false;
    } catch (error) {
      this.error = error.message;
      this.loading = false;
    }
  }

  renderSummary() {
    if (!this.data) return '';
    
    const { summary } = this.data;
    const capHit = parseInt(summary.capHit || 0);
    const capSpace = parseInt(summary.capSpace || 0);
    const capCeiling = 96000000; // 2025-26 salary cap
    
    return `
      <div class="salary-cap-summary">
        <h2>Ottawa Senators Salary Cap</h2>
        <div class="cap-stats">
          <div class="cap-stat">
            <div class="cap-label">Cap Hit</div>
            <div class="cap-value">$${formatNumber(capHit)}</div>
          </div>
          <div class="cap-stat">
            <div class="cap-label">Cap Space</div>
            <div class="cap-value cap-space">$${formatNumber(capSpace)}</div>
          </div>
          <div class="cap-stat">
            <div class="cap-label">Cap Ceiling</div>
            <div class="cap-value">$${formatNumber(capCeiling)}</div>
          </div>
          <div class="cap-stat">
            <div class="cap-label">Roster</div>
            <div class="cap-value">${summary.roster?.current || 0} / ${summary.roster?.max || 23}</div>
          </div>
          <div class="cap-stat">
            <div class="cap-label">Contracts</div>
            <div class="cap-value">${summary.contracts?.current || 0} / ${summary.contracts?.max || 50}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderPlayerTable(title, players) {
    if (!players || players.length === 0) return '';
    
    return `
      <div class="player-category">
        <h3>${title} (${players.length})</h3>
        <div class="player-table-container">
          <table class="player-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Pos</th>
                <th>Age</th>
                <th>Status</th>
                <th>2025-26</th>
                <th>2026-27</th>
                <th>2027-28</th>
                <th>Years</th>
              </tr>
            </thead>
            <tbody>
              ${players.map(player => `
                <tr>
                  <td class="player-name">${player.name}</td>
                  <td>${player.position || '-'}</td>
                  <td>${player.age || '-'}</td>
                  <td>${player.status || '-'}</td>
                  <td>${formatSalary(player.contractYears?.['2025-26'] || '')}</td>
                  <td>${formatSalary(player.contractYears?.['2026-27'] || '')}</td>
                  <td>${formatSalary(player.contractYears?.['2027-28'] || '')}</td>
                  <td>${player.yearsRemaining || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return `
        <div class="salary-cap-page">
          <div class="loading">Loading salary cap data...</div>
        </div>
      `;
    }
    
    if (this.error) {
      return `
        <div class="salary-cap-page">
          <div class="error">Error: ${this.error}</div>
        </div>
      `;
    }
    
    const { categorizedPlayers } = this.data;
    
    return `
      <div class="salary-cap-page">
        ${this.renderSummary()}
        ${this.renderPlayerTable('Forwards', categorizedPlayers.forwards)}
        ${this.renderPlayerTable('Defense', categorizedPlayers.defense)}
        ${this.renderPlayerTable('Goalies', categorizedPlayers.goalies)}
        
        <div class="data-info">
          <p>Data scraped from CapWages.com</p>
          <p>Last updated: ${new Date(this.data.scrapedAt).toLocaleString()}</p>
        </div>
      </div>
    `;
  }
}
