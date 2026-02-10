# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2-9-2026
- Added "Download PNG" option for high-quality 300 DPI PNG export, ideal for Canon Selphy CP1500 and similar photo printers
- On mobile (iOS/Android), PNG opens in a new tab for easy long-press to save to Photos

## [1.3.0] - 2-9-2026
- Added "Credit Card Size" paper option (86mm x 54mm) for printing 2 labels side-by-side on credit-card-sized paper
- Increased artwork zoom slider precision from 0.1 to 0.01 steps
- Fixed label grid preview not updating when artwork zoom/pan transforms changed

## [1.2.2] - 2-5-2026
- Renamed template dropdown options to "Original Label" and "Clean Label" for clarity

## [1.2.1] - 2-5-2026
- Moved "Clear Image" button below the label preview in the editor for better visibility

## [1.2.0] - 2-3-2026
- "Slightly Oversized" global option that enlarges each label by 1mm on all sides in the PDF for bleed tolerance when cutting; SVG cut paths remain at original size

## [1.1.0] - 2-3-2026
- New "Clean" label template with no top banner, rounded corners, and a larger bottom text area
- Customizable background and text colors for the Clean template via color pickers
- Per-label configuration overrides allowing individual labels to use different templates and colors than the global defaults
- Label the Configuration section in the editor with options to override global settings on a per-label basis

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
