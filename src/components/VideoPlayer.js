/**
 * VideoPlayer Component
 * Plyr-based video player for stream playback
 */

import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

export class VideoPlayer {
  constructor(container, options = {}) {
    this.container = container;
    this.player = null;
    this.options = {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      settings: ['quality', 'speed'],
      quality: {
        default: 720,
        options: [1080, 720, 480, 360]
      },
      ...options
    };
  }

  /**
   * Initialize player with a stream URL
   * @param {string} url - Stream URL
   * @param {string} type - Stream type ('video' or 'iframe')
   */
  init(url, type = 'iframe') {
    this.destroy(); // Clean up existing player
    
    if (type === 'iframe') {
      this.createIframePlayer(url);
    } else {
      this.createVideoPlayer(url);
    }
  }

  /**
   * Create iframe-based player for embedded streams
   * @param {string} url - Embed URL
   */
  createIframePlayer(url) {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allowFullscreen = true;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'var(--radius-lg)';
    
    this.container.innerHTML = '';
    this.container.appendChild(iframe);
  }

  /**
   * Create video element with Plyr
   * @param {string} url - Video URL
   */
  createVideoPlayer(url) {
    const video = document.createElement('video');
    video.controls = true;
    video.crossOrigin = 'anonymous';
    
    const source = document.createElement('source');
    source.src = url;
    source.type = this.getVideoType(url);
    
    video.appendChild(source);
    
    this.container.innerHTML = '';
    this.container.appendChild(video);
    
    // Initialize Plyr
    this.player = new Plyr(video, this.options);
    
    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Determine video MIME type from URL
   * @param {string} url - Video URL
   * @returns {string} MIME type
   */
  getVideoType(url) {
    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    const types = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'm3u8': 'application/x-mpegURL',
      'mpd': 'application/dash+xml'
    };
    return types[ext] || 'video/mp4';
  }

  /**
   * Setup player event listeners
   */
  setupEventListeners() {
    if (!this.player) return;
    
    this.player.on('ready', () => {
      console.log('Player ready');
    });
    
    this.player.on('playing', () => {
      console.log('Playback started');
    });
    
    this.player.on('error', (event) => {
      console.error('Player error:', event);
      this.handleError();
    });
  }

  /**
   * Handle playback errors
   */
  handleError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'player-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <p>⚠️ Unable to load stream</p>
        <p class="text-secondary">The stream source may be unavailable or incompatible.</p>
        <button class="retry-button" onclick="window.location.reload()">Retry</button>
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(errorDiv);
  }

  /**
   * Change stream source
   * @param {string} url - New stream URL
   * @param {string} type - Stream type
   */
  changeSource(url, type = 'iframe') {
    this.init(url, type);
  }

  /**
   * Destroy player instance
   */
  destroy() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  /**
   * Play the video
   */
  play() {
    if (this.player) {
      this.player.play();
    }
  }

  /**
   * Pause the video
   */
  pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    if (this.player) {
      this.player.fullscreen.toggle();
    }
  }
}

/**
 * Create a video player instance
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Player options
 * @returns {VideoPlayer} Player instance
 */
export function createVideoPlayer(container, options = {}) {
  return new VideoPlayer(container, options);
}
