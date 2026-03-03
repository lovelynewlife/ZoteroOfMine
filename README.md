# ZoteroOfMine

[![Zotero Version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

A personal Zotero 7 plugin for tracking and managing PDF reading history with powerful filtering and deletion capabilities.

![Reading History UI](./assets/readingHistoryUI.png)

## ✨ Features

### 📖 Reading History Management

- **Left Sidebar Integration**: Quick access via "Reading History" button at the bottom of the left sidebar
- **Rich Information Display**: Shows document title, authors, and capture timestamp
- **One-Click Open**: Double-click any history entry to open the corresponding document

### 🔍 Smart Search & Filter

- **Real-time Search**: Filter history by document title or authors
- **Sortable Columns**: Click column headers to sort by title, authors, or time

### 🗑️ Flexible Deletion Options

- **Bulk Deletion**: Select multiple entries using checkboxes and delete them together
- **Time-Based Deletion**: Delete history from specific time periods:
  - Last day
  - Last week
  - Last month
  - Last 3 months
  - Last 6 months
  - Last year
- **Clear All**: Remove all history with a confirmation prompt
- **Safe Operations**: All deletion operations require confirmation

### ⚡ Automatic Capture

Automatically tracks when you read PDF documents:
- Opening a PDF document in the built-in reader
- Switching to an already opened PDF tab

### 🛡️ Smart Capture Management

- **Cooldown Mechanism**: 10-second cooldown per tab prevents duplicate captures
- **Minimal Storage**: Only stores item ID and timestamp; all other data fetched from Zotero API
- **Data Freshness**: Always displays up-to-date document information

### 🌐 Internationalization

- English (en-US)
- Chinese (中文)

## 📦 Installation

### From Release (Recommended)

1. Download the latest `zotero-of-mine.xpi` from the [Releases](https://github.com/lovelynewlife/ZoteroOfMine/releases) page
2. Open Zotero 7
3. Go to `Tools` → `Add-ons`
4. Click the gear icon → `Install Add-on From File`
5. Select the downloaded `.xpi` file

### From Source

```bash
# Clone the repository
git clone https://github.com/lovelynewlife/ZoteroOfMine.git
cd ZoteroOfMine

# Install dependencies
pnpm install

# Build the plugin
pnpm run build
```

The built plugin will be located at `build/zotero-of-mine.xpi`.

## 🚀 Usage

### Viewing History

1. Click the "Reading History" / "阅读历史" button at the bottom left of Zotero
2. The history dialog will show all tracked reading sessions

### Opening Documents

Double-click any row in the history table to open the corresponding document in Zotero.

### Searching

Type in the search box to filter history by document title or author name.

### Deleting History

#### Delete Selected Items

1. Check the checkboxes next to entries you want to delete
2. Click the "Delete Selected" / "删除选中" button
3. Confirm the deletion

#### Delete by Time Period

1. Click any time period button (e.g., "Last Week", "Last Month")
2. Confirm the deletion

#### Clear All History

1. Click the "Clear All" / "清除全部" button
2. Confirm the deletion

## 🔧 Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Development mode with hot-reload
pnpm run start-watch

# Production build
pnpm run build
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
│       ├── mockHistory.ts   # Mock data for testing
│       └── zdb.ts           # Zotero DB helpers
├── typings/                  # TypeScript declarations
└── package.json
```

### Building

```bash
# Build for production
pnpm run build

# The plugin will be built to:
# build/zotero-of-mine.xpi
```

## 💾 Data Storage

### Location

Reading history is stored in:
```
{Zotero Profile Directory}/zoteroofmine_history.json
```

### Format

```json
{
  "version": 1,
  "entries": [
    {
      "itemID": 123,
      "captureTime": 1700000000000
    }
  ]
}
```

### Storage Strategy

- **Minimal Storage**: Only item ID and timestamp are stored
- **Fresh Data**: Document details (title, authors, etc.) are fetched from Zotero API on demand
- **Lightweight**: History file stays small even with thousands of entries

## 🛠️ Tech Stack

- **TypeScript** - Type-safe development
- **zotero-plugin-toolkit** - Zotero plugin development utilities
- **zotero-types** - TypeScript types for Zotero API
- **IOUtils / PathUtils** - Firefox/Zotero 7 native file APIs

## 📝 Changelog

### Latest Changes

- ✅ Add bulk deletion with checkbox selection
- ✅ Add time-based deletion (day/week/month/quarter/half-year/year)
- ✅ Add real-time search functionality
- ✅ Add sortable columns
- ✅ Improve UI with fixed table headers
- ✅ Prevent dialog auto-close after deletion

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

AGPL-3.0-or-later - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) by windingwind
- [Zotero](https://github.com/zotero/zotero) - The amazing reference manager

## 📧 Support

For issues and questions:
- Create an issue on [GitHub Issues](https://github.com/lovelynewlife/ZoteroOfMine/issues)
