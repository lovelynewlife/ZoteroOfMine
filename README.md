# ZoteroOfMine

[![Zotero Version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org/)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

A personal Zotero 7 plugin for tracking reading history.

## Features

### Reading History Sidebar

Adds a "Reading History" button to the left sidebar pane, providing quick access to your reading activity.

### Automatic History Capture

Automatically captures reading history when:
- Double-clicking to open a PDF document
- Switching to an already-opened PDF tab

Captured information includes:
- Document title
- Authors

### Smart Cooldown

Implements a 10-second cooldown period per tab to prevent duplicate captures when rapidly switching between documents.

### Internationalization

Supports multiple languages:
- English
- Chinese (中文)

## Installation

1. Download the latest release `zotero-of-mine.xpi` from the [Releases](https://github.com/lovelynewlife/ZoteroOfMine/releases) page
2. In Zotero 7, go to `Tools` → `Add-ons`
3. Click the gear icon and select `Install Add-on From File`
4. Select the downloaded `.xpi` file

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Build

```bash
# Install dependencies
pnpm install

# Build for development
pnpm run build

# Build for production
pnpm run build
```

The built plugin will be in `build/zotero-of-mine.xpi`.

### Development Mode

```bash
pnpm run dev
```

This enables auto hot-reload. See [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) for more details.

## Tech Stack

- TypeScript
- [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- [zotero-types](https://github.com/windingwind/zotero-types)

## License

MIT

## Acknowledgments

- [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) by windingwind
- [Zotero](https://github.com/zotero/zotero)
