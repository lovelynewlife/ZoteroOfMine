# ZCLI

A command-line tool for querying local Zotero database.

## Installation

### From Source

```bash
pip install -e .
```

### From Executable (No Python Required)

Download the appropriate executable for your platform from the releases page.

Or build it yourself:

```bash
# Install dependencies
make install

# Build for current platform
make build

# Output: dist/zcli (Linux/macOS) or dist/zcli.exe (Windows)
```

## Usage

### Initialize Configuration

```bash
zcli config init
```

### Search Items

```bash
zcli search "machine learning"
```

### Get Item Details

```bash
zcli get ABCD1234
```

### List Collections

```bash
zcli collections
```

### List Tags

```bash
zcli tags
```

### Show Configuration

```bash
zcli config show
```

### Set Configuration

```bash
zcli config set data_dir /path/to/zotero
```

## Configuration

Configuration is stored in `~/.zcli/config.json`:

```json
{
  "data_dir": "/Users/xxx/Zotero"
}
```

## Output Format

All commands output JSON for easy parsing by LLM tool calling:

```json
{
  "success": true,
  "data": [...]
}
```

## Building

### Prerequisites

```bash
pip install -e .[dev]
```

### Build Commands

```bash
make build        # Build for current platform
make build-win    # Build for Windows (run on Windows)
make build-mac    # Build for macOS (run on macOS)
make build-linux  # Build for Linux (run on Linux)
make clean        # Clean build artifacts
```

**Note:** PyInstaller does not support cross-compilation. You must run the build command on the target platform. The output will be `dist/zcli` (Linux/macOS) or `dist/zcli.exe` (Windows).
