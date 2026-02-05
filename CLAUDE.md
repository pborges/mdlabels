# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mdlabels is a web application for creating printable labels for MiniDisc cartridges. Users can search for albums via MusicBrainz, customize album artwork positioning, and export labels as PDFs or SVG cut sheets.

## Architecture

### Backend (Go)
- **Entry point**: `cmd/mdlabel-web/main.go`
- **Embedded assets**: Frontend is embedded via `assets.go` using Go's `embed.FS`
- **API endpoints**:
  - `/api/search` - Proxies MusicBrainz API searches with rate limiting (250ms between requests)
  - `/api/artwork/{mbid}` - Fetches album artwork from Cover Art Archive
  - `/api/artwork/{mbid}/thumbnails` - Fetches artwork metadata with all available images
  - `/health` - Health check endpoint
- **Development mode**: Set `MODE=dev` or `MODE=development` to enable CORS for Vite dev server
- **Production mode**: Serves embedded static files from `mdlabels-ui/dist` with SPA routing support

### Frontend (SolidJS + TypeScript)
- **Framework**: SolidJS with Vite build system
- **State management**: SolidJS stores (`src/store/labels.ts`)
  - Pages stored as array, each containing 20 label slots (5x4 grid)
  - Auto-saves to localStorage on changes
  - Supports multiple pages, page navigation, and editing individual labels
- **Components**:
  - `LabelGrid` - Displays 5x4 grid of labels for current page
  - `LabelEditor` - Modal for searching albums and customizing labels
  - `GlobalControls` - Actions like "Add Page", "Clear All"
  - `PageControls` - Per-page actions like "Download PDF", "Export CSV", "Delete Page"
  - `LabelCell` - Individual label cell with preview
- **Label rendering**:
  - Canvas-based rendering at 300 DPI for high quality (`lib/canvas-renderer.ts`)
  - Loads Roboto-Black font and MiniDisc logo on init
  - Supports zoom/pan transforms for artwork positioning
  - PDF generation uses jsPDF (`lib/pdf-generator.ts`)
  - SVG cut sheet generation for physical cutting (`lib/svg-generator.ts`)

### Label Specifications
- Physical size: 38mm width × 54mm height
- Top banner: 5mm black bar with MiniDisc logo and "INSERT THIS END" text
- Bottom banner: 11mm black bar with album name, artist, and year (Roboto-Black font, all caps)
- Artwork area: 38mm height (remaining space between banners)
- Dog-ear cutout: 2.5mm on top-left corner
- Grid layout: 5 columns × 4 rows = 20 labels per page
- PDF layout: Letter size (215.9mm × 279.4mm) with margins (left: 8mm, top: 20mm)

## Development Commands

### Backend
```bash
# Run backend in development mode (CORS enabled for Vite)
MODE=dev go run cmd/mdlabel-web/main.go

# Run backend in production mode (serves embedded frontend)
go run cmd/mdlabel-web/main.go

# Build binary
go build -o mdlabel-web cmd/mdlabel-web/main.go
```

### Frontend
```bash
cd mdlabels-ui

# Install dependencies
deno install

# Run Vite dev server (proxies /api to localhost:8080)
deno task dev

# Build for production (outputs to dist/)
deno task build

# Preview production build
deno task preview

# Type check
deno task check
```

### Full Development Workflow
1. Start backend in dev mode: `MODE=dev go run cmd/mdlabel-web/main.go`
2. In separate terminal, start frontend: `cd mdlabels-ui && deno task dev`
3. Frontend runs on http://localhost:5173, API calls proxied to :8080

### Production Build
1. Build frontend: `cd mdlabels-ui && deno task build`
2. Build Go binary: `go build -o mdlabel-web cmd/mdlabel-web/main.go`
3. Run binary: `./mdlabel-web` (serves on port 8080 or $PORT)

## Key Technical Details

### API Rate Limiting
- MusicBrainz API has 50 req/sec limit; this app uses 20ms minimum interval between requests
- Rate limiter implemented in `cmd/mdlabel-web/main.go` via `RateLimiter` struct
- User-Agent header includes app URL and contact email per MusicBrainz requirements

### Asset Embedding
- Frontend must be built first (`deno task build`) before building Go binary
- `assets.go` embeds `mdlabels-ui/dist` directory
- In development mode, backend returns 404 for static files (frontend on Vite)

### Canvas Rendering
- High DPI rendering (300 DPI) for quality prints
- Font must be loaded before rendering: `await renderer.init()`
- Images are cached to avoid reloading
- Artwork supports zoom/pan with transform matrix applied before drawing

### Data Model
- Each Page has 20 Label slots (nullable)
- Each Label contains: id, artist, album, year, mbid, artworkUrl, transform (zoom, panX, panY)
- Transform defaults: zoom=1.0, panX=0, panY=0

### Styling
- TailwindCSS for UI styling
- Responsive design with mobile-first approach (md: breakpoint for desktop)

## Deployment

1. Increment `VERSION` file
2. Add an entry to `CHANGELOG.md`
3. `git commit`
4. Run `bin/release`
