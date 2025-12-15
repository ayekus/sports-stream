# StreamPuck - Sports Streaming Platform

A modern, ad-free hockey streaming platform built with Vite and Vanilla JavaScript.

## Features

- 🏒 Live hockey match listings from Streamed.pk
- 🌑 Beautiful dark theme with glassmorphism effects
- 📱 Fully responsive design (mobile, tablet, desktop)
- ⚡ Fast performance with intelligent API caching
- 🎯 Match categorization (Live, Upcoming, Finished)
- ⚙️ Cache management and settings

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn

### Installation

```bash
# Clone or navigate to project directory
cd sports-stream

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
src/
├── services/       # API integrations (Streamed.pk, TheSportsDB)
├── components/     # Reusable UI components
├── pages/          # Page components
├── styles/         # Global and component styles
├── utils/          # Utilities (cache, date formatting)
├── router.js       # SPA routing
└── main.js         # App entry point
```

## API Sources

- **Streamed.pk** - Live stream links and match schedules
- **TheSportsDB** - Team logos and images

## Technology Stack

- **Vite** - Build tool
- **Vanilla JavaScript** - No framework overhead
- **CSS** - Custom design system with variables
- **Plyr** - Video player library

## Build for Production

```bash
npm run build
npm run preview
```

## Legal Notice

This application aggregates publicly available stream links. Users are responsible for ensuring compliance with local laws and regulations regarding sports streaming.

## License

Built for personal use.
