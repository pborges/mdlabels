# mdlabels

[![Latest Release](https://img.shields.io/github/v/release/pborges/mdlabels)](https://github.com/pborges/mdlabels/releases/latest)
[![Docker](https://img.shields.io/badge/ghcr.io-pborges%2Fmdlabels-blue)](https://github.com/pborges/mdlabels/pkgs/container/mdlabels)
[![CI](https://github.com/pborges/mdlabels/actions/workflows/ci.yml/badge.svg)](https://github.com/pborges/mdlabels/actions/workflows/ci.yml)

## Overview

A simple web app to create labels for minidiscs.

See it live! [https://mdlabels.incursion.dev](https://mdlabels.incursion.dev)

## User interface
- The UI presents a grid of 5x4 labels (representing a single printable page), and allows the user to edit the labels.

1. When the user clicks a label, a modal pops up with a search bar, and the user types in an album name. (if the selected label is already filled in, the modal is populated with the current values for editing, otherwise it is empty)
2. Matching albums are displayed in the modal (using musicbrainz api)
3. The user can select an album, after which a demo label is generated in the modal with the Artist, Album name, year and album art filled out.
4. To the right of the demo label is a grid of alternate artwork for the album the user can select from.
5. The user can upload custom artwork instead of using album art from MusicBrainz.
6. The user can zoom and pan the album art in fixed size of the generated label. 

Once the user clicks save, the label is added to the grid.

## Global Actions
- "Add Page" option that creates another set of 5x4 labels.
- "Clear All" option that clears all labels.
- "Delete Page" option that deletes the current set of labels.
- "Import Labels" option that imports a CSV file of labels.

## Page Actions
Each page has a set of actions in the top right corner.
- Download PDF (supports US Letter and A4 paper sizes)
- Export labels as CSV (which includes all the fields, a link to the album artwork along with any pan and zoom offsets applied, and the musicbrainz id)

## Storage
- All label data is stored in localStorage for persistence between sessions
- Artwork images are stored as base64 data URLs in localStorage, minimizing repeated network requests for album art

## Label description
- A rectangle 38mm wide by 54mm tall
- The top left corner is dog-eared by 2.5mm on each axis
- A black banner is printed on the top of the label, 5mm tall, that extends the entire width of the label.
- The right side of the banner contains the MiniDisc logo
- The left side of the banner has a small triangle pointed upwards and the text "INSERT THIS END" (Roboto-Black font)
- There is a black bottom border that extends with width of the label and is 11mm tall
- Centered vertically and left aligned in this border is (in all caps using the Roboto-Black font):
  - the album name
  - the artist name
  - the year of release
- The remaining space is filled with the album artwork

## Project Status
The web app is fully functional. Label rendering is done on the frontend using canvas. The backend serves the web app and proxies MusicBrainz API calls.

## Web App Architecture
- Simple SolidJS app
- golang backend
- The SolidJS app is embedded into and served from the golang backend.
- The backend does the musicbrainz api calls.

## Installation

### Pre-built Binaries

Download the latest release for your platform from the [releases page](https://github.com/pborges/mdlabels/releases/latest).

```bash
# Linux (amd64)
curl -LO https://github.com/pborges/mdlabels/releases/latest/download/mdlabel-web-linux-amd64.tar.gz
tar -xzf mdlabel-web-linux-amd64.tar.gz
./mdlabel-web

# macOS (Apple Silicon)
curl -LO https://github.com/pborges/mdlabels/releases/latest/download/mdlabel-web-darwin-arm64.tar.gz
tar -xzf mdlabel-web-darwin-arm64.tar.gz
./mdlabel-web

# macOS (Intel)
curl -LO https://github.com/pborges/mdlabels/releases/latest/download/mdlabel-web-darwin-amd64.tar.gz
tar -xzf mdlabel-web-darwin-amd64.tar.gz
./mdlabel-web
```

### Docker

```bash
# Pull and run the latest version
docker pull ghcr.io/pborges/mdlabels:latest
docker run -p 8080:80 ghcr.io/pborges/mdlabels:latest

# Or use a specific version
docker run -p 8080:80 ghcr.io/pborges/mdlabels:1.0.0
```

Then open http://localhost:8080 in your browser.

### Build from Source

Requires Go 1.21+ and Deno 2.0+.

```bash
# Clone the repository
git clone https://github.com/pborges/mdlabels.git
cd mdlabels

# Build frontend
cd mdlabels-ui
deno install
deno task build
cd ..

# Build Go binary
go build -o mdlabel-web ./cmd/mdlabel-web

# Run
./mdlabel-web
```

## Versioning

The app version is controlled by the `VERSION` file in the repository root. To release a new version:

1. Update the `VERSION` file with the new version number (e.g., `1.0.1`)
2. Update `CHANGELOG.md` with the changes
3. Commit and push

The Docker build reads from this file to set the version in both the frontend and backend.

## Development

### Backend (Go)
```bash
# Run in development mode (CORS enabled for Vite)
MODE=dev go run cmd/mdlabel-web/main.go
```

### Frontend (SolidJS)
```bash
cd mdlabels-ui
deno install
deno task dev
```

The frontend dev server runs on http://localhost:5173 and proxies API calls to the Go backend on port 8080.

## How to Deploy

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the server listens on |
| `MODE` | (empty) | Set to `dev` or `development` for CORS support |

### Docker

```bash
docker run -d --name mdlabels -p 8080:80 --restart unless-stopped ghcr.io/pborges/mdlabels:latest
```

### Dokku

```bash
# Create app
dokku apps:create mdlabels

# Deploy via Docker image
dokku git:from-image mdlabels ghcr.io/pborges/mdlabels:latest

# Enable HTTPS with Let's Encrypt
dokku letsencrypt:enable mdlabels
```

## License

MIT License - see [LICENSE](LICENSE) for details.
