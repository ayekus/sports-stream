/**
 * Simple Express proxy server to bypass CORS for NHL API, ESPN API, and salary cap scraping
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { mkdir, readFile, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';

const app = express();
const PORT = 3001;
const NHL_API_BASE = 'https://api-web.nhle.com/v1';
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';

// Caching configuration
const CACHE_DIR = './server/cache';
const CACHE_FILE = `${CACHE_DIR}/senators-salary-cap.json`;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

// Cache helper functions
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

async function getCachedData() {
  try {
    if (!existsSync(CACHE_FILE)) {
      return null;
    }
    
    const stats = await stat(CACHE_FILE);
    const now = Date.now();
    const fileAge = now - stats.mtimeMs;
    
    // Check if cache is still valid (less than 1 week old)
    if (fileAge < CACHE_DURATION) {
      const cachedContent = await readFile(CACHE_FILE, 'utf-8');
      const cached = JSON.parse(cachedContent);
      console.log(`📦 Using cached data from ${new Date(stats.mtimeMs).toLocaleString()}`);
      return cached;
    }
    
    console.log('⏰ Cache expired, will fetch fresh data');
    return null; // Cache expired
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

async function setCachedData(data) {
  try {
    await ensureCacheDir();
    await writeFile(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('💾 Data cached successfully');
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

// Enable CORS for our frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// NHL API Proxy endpoint
app.get('/api/nhl/*', async (req, res) => {
  try {
    const nhlPath = req.originalUrl.replace('/api/nhl', '');
    const nhlUrl = `${NHL_API_BASE}${nhlPath}`;
    
    console.log(`Proxying: ${nhlUrl}`);
    
    const response = await fetch(nhlUrl);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from NHL API' });
  }
});

// ESPN API Proxy endpoint
app.get('/api/espn/*', async (req, res) => {
  try {
    const espnPath = req.originalUrl.replace('/api/espn', '');
    const espnUrl = `${ESPN_API_BASE}${espnPath}`;
    
    console.log(`Proxying ESPN: ${espnUrl}`);
    
    const response = await fetch(espnUrl);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('ESPN Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from ESPN API' });
  }
});

// Salary Cap Scraping endpoint with caching
app.get('/api/salary-cap/senators', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await getCachedData();
      if (cachedData) {
        return res.json(cachedData);
      }
    }
    
    console.log('🌐 Fetching fresh salary cap data from CapWages...');
    
    const response = await fetch('https://capwages.com/teams/ottawa_senators');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract summary data
    const summary = {};
    const bodyText = $('body').text();
    
    const capHitMatch = bodyText.match(/Cap Hit[^$]*\$([\ d,]+)/i);
    if (capHitMatch) summary.capHit = capHitMatch[1].replace(/,/g, '');
    
    const capSpaceMatch =bodyText.match(/Cap Space[^$]*\$([\ d,]+)/i);
    if (capSpaceMatch) summary.capSpace = capSpaceMatch[1].replace(/,/g, '');
    
    const rosterMatch = bodyText.match(/(\d+)\s*\/\s*(\d+).*roster/i);
    if (rosterMatch) {
      summary.roster = { current: parseInt(rosterMatch[1]), max: parseInt(rosterMatch[2]) };
    }
    
    const contractsMatch = bodyText.match(/(\d+)\s*\/\s*(\d+).*contract/i);
    if (contractsMatch) {
      summary.contracts = { current: parseInt(contractsMatch[1]), max: parseInt(contractsMatch[2]) };
    }
    
    // Extract player data
    const players = [];
    
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const hasPlayerLinks = $table.find('tbody a[href*="/players/"]').length > 0;
      if (!hasPlayerLinks) return;
      
      let positionCategory = 'forward';
      $table.prevAll().each((i, elem) => {
        const text = $(elem).text().toLowerCase();
        if (text.includes('defense')) {
          positionCategory = 'defense';
          return false;
        }
        if (text.includes('goalie')) {
          positionCategory = 'goalie';
          return false;
        }
        if (text.includes('forward')) {
          positionCategory = 'forward';
          return false;
        }
      });
      
      const headers = [];
      $table.find('thead tr').first().find('th, td').each((i, th) => {
        headers.push($(th).text().trim().toLowerCase());
      });
      
      $table.find('tbody tr').each((rowIndex, row) => {
        const $row = $(row);
        const $playerLink = $row.find('a[href*="/players/"]').first();
        if (!$playerLink.length) return;
        
        const playerName = $playerLink.text().trim();
        if (!playerName || playerName.length < 3) return;
        
        const cells = [];
        $row.find('td').each((i, cell) => {
          let cellText = $(cell).text().trim();
          if (cellText.includes('$')) {
            const amounts = cellText.match(/\$[\d,]+/g);
            if (amounts && amounts.length > 0) {
              cellText = amounts[0];
            }
          }
          cells.push(cellText);
        });
        
        const playerData = {
          name: playerName,
          positionCategory: positionCategory
        };
        
        headers.forEach((header, idx) => {
          if (idx >= cells.length) return;
          const value = cells[idx];
          
          if (header.includes('years')) {
            playerData.yearsRemaining = value;
          } else if (header.includes('terms')) {
            playerData.terms = value;
          } else if (header === 'pos') {
            playerData.position = value;
          } else if (header.includes('status')) {
            playerData.status = value;
          } else if (header === 'age') {
            playerData.age = value;
          } else if (header.match(/^\d{4}-\d{2}$/)) {
            if (!playerData.contractYears) playerData.contractYears = {};
            playerData.contractYears[header] = value;
          }
        });
        
        players.push(playerData);
      });
    });
    
    const result = {
      summary,
      players,
      totalPlayers: players.length,
      scrapedAt: new Date().toISOString()
    };
    
    // Cache the result
    await setCachedData(result);
    
    console.log(`✅ Successfully scraped and cached ${players.length} players`);
    res.json(result);
    
  } catch (error) {
    console.error('Salary cap scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch salary cap data',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🏒 NHL & ESPN API Proxy running on http://localhost:${PORT}`);
});
