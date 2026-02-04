# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2-3-2026

### Added
- "Slightly Oversized" global option that enlarges each label by 1mm on all sides in the PDF for bleed tolerance when cutting; SVG cut paths remain at original size

## [1.1.0] - 2-3-2026

### Added
- New "Clean" label template with no top banner, rounded corners, and a larger bottom text area
- Customizable background and text colors for the Clean template via color pickers
- Per-label configuration overrides allowing individual labels to use different templates and colors than the global defaults
- Label Configuration section in the editor with options to override global settings on a per-label basis

## [1.0.6] - 2-2-2026
- Test release for auto deploy to Dokku

## [1.0.5] - 2-2-2026
- Test release for auto deploy to Dokku

## [1.0.4] - 2-2-2026
- Test release for auto deploy to Dokku

## [1.0.3] - 2-2-2026
- Fixed label preview not showing until all fields were filled in when uploading custom artwork

## [1.0.2] - 2-1-2026
- Fixing CI

## [1.0.1] - 2-1-2026
- Initial public release

## [1.0.0] - 2-1-2026

### Added
- MusicBrainz album search with artwork support
- Cover Art Archive integration with multiple artwork options
- Custom artwork upload support
- Zoom and pan controls for artwork positioning
- PDF export (US Letter and A4 paper sizes)
- SVG cut sheet export for physical cutting
- CSV import/export for label data
- Multi-page label management (5x4 grid per page)
- localStorage persistence for label data and artwork
- Docker support with multi-arch images
- Pre-built binaries for Linux, macOS, and Windows (amd64/arm64)
