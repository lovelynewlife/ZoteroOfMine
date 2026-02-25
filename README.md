# ZoteroOfMine

[![Zotero Version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org/)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

A personal Zotero 7 plugin for tracking PDF reading history.

## Features

### 📖 Reading History Sidebar

Adds a "Reading History" button at the bottom of the left sidebar pane. Click to view your reading history in a dialog with sortable columns (Title, Authors, Time).

### ⚡ Automatic Capture

Automatically captures reading history when:
- Opening a PDF document
- Switching to an opened PDF tab

Captured information includes:
- Document title
- Authors
- Capture timestamp

### 💾 Persistent Storage

Reading history is persisted in a JSON file (`zoteroofmine_history.json`) stored in the Zotero profile directory. Only minimal data (itemID + timestamp) is stored; document details are fetched from Zotero API on demand, ensuring data stays fresh and storage stays lightweight.

### 🧹 Clear History

"Clear All" button in the history dialog with a confirmation prompt before deletion.

### 🔄 Smart Cooldown

10-second cooldown per tab to prevent duplicate captures when rapidly switching between documents.

### 🌐 Internationalization

Supports multiple languages:
- English
- Chinese (中文)

## Installation

### From Release

1. Download `zotero-of-mine.xpi` from the [Releases](https://github.com/lovelynewlife/ZoteroOfMine/releases) page
2. In Zotero 7, go to `Tools` → `Add-ons`
3. Click the gear icon → `Install Add-on From File`
4. Select the downloaded `.xpi` file

### From Source

```bash
# Clone the repository
git clone https://github.com/lovelynewlife/ZoteroOfMine.git
cd ZoteroOfMine

# Install dependencies
pnpm install

# Build
pnpm run build
```

The built plugin will be at `build/zotero-of-mine.xpi`.

## Usage

1. **View History**: Click the "Reading History" / "阅读历史" button at the bottom of the left sidebar
2. **Open Document**: Double-click any row in the history dialog to open the corresponding document
3. **Clear History**: Click "Clear All" / "清除全部" button in the dialog, then confirm

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Commands

```bash
# Install dependencies
pnpm install

# Build (production)
pnpm run build

# Build (development with hot-reload)
pnpm run start-watch

# Lint & format
pnpm run lint
```

### Project Structure

```
ZoteroOfMine/
├── addon/                    # Add-on resources
│   ├── locale/              # i18n translations
│   │   ├── en-US/
│   │   └── zh-CN/
│   └── chrome/              # UI styles
├── src/
│   ├── modules/
│   │   ├── historyStore.ts  # Storage layer (JSON persistence)
│   │   └── readingHistory.ts # UI & capture logic
│   └── utils/
│       └── zdb.ts           # Zotero DB helpers
├── typings/                  # TypeScript declarations
└── package.json
```

## Tech Stack

- **TypeScript** - Type-safe development
- **zotero-plugin-toolkit** - Zotero plugin development utilities
- **zotero-types** - TypeScript types for Zotero API
- **IOUtils / PathUtils** - Firefox/Zotero 7 native file APIs

## Data Storage

- **Location**: `{Zotero Profile}/zoteroofmine_history.json`
- **Format**:
  ```json
  {
    "version": 1,
    "entries": [
      { "itemID": 123, "captureTime": 1700000000000 }
    ]
  }
  ```
- **Strategy**: Minimal storage (itemID only), fresh data from Zotero API

## License

AGPL-3.0-or-later

## Acknowledgments

- [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) by windingwind
- [Zotero](https://github.com/zotero/zotero)
