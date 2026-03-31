# ZCLI

A command-line tool for querying local Zotero database.

## Installation

### From Source

```bash
pip install -e .
```

### From Executable (No Python Required)

Download the appropriate executable for your platform from the releases page.

### Binary Setup on End-User Machine

1. Download release assets for your platform:
`zcli-<platform>` and `zcli-mcp-<platform>`.

Linux (x64):

```bash
chmod +x zcli-linux-x64 zcli-mcp-linux-x64
sudo mv zcli-linux-x64 /usr/local/bin/zcli
sudo mv zcli-mcp-linux-x64 /usr/local/bin/zcli-mcp
```

macOS (x64):

```bash
chmod +x zcli-macos-x64 zcli-mcp-macos-x64
sudo mv zcli-macos-x64 /usr/local/bin/zcli
sudo mv zcli-mcp-macos-x64 /usr/local/bin/zcli-mcp
```

Windows (x64, PowerShell as Administrator):

```powershell
New-Item -ItemType Directory -Force C:\Tools\zcli | Out-Null
Copy-Item .\zcli-windows-x64.exe C:\Tools\zcli\zcli.exe
Copy-Item .\zcli-mcp-windows-x64.exe C:\Tools\zcli\zcli-mcp.exe
setx PATH "$env:PATH;C:\Tools\zcli"
```

2. Configure Zotero data path:

```bash
zcli config init
# If auto-detect fails:
zcli config set data_dir /path/to/Zotero
```

3. Register MCP once in Codex (auto-start, no manual launch needed):

```bash
codex mcp add zcli -- zcli-mcp
# Or use absolute path if not in PATH:
# codex mcp add zcli -- /absolute/path/to/zcli-mcp
```

4. Verify:

```bash
zcli --version
codex mcp list
```

Or build it yourself:

```bash
# Install build dependency
make deps-build

# Build for current platform
make build

# Build MCP server executable for current platform
make build-mcp

# Install binary to system path (default: /usr/local/bin)
make install
make install-mcp

# Output:
#   dist/zcli and dist/zcli-mcp (Linux/macOS)
#   dist/zcli.exe and dist/zcli-mcp.exe (Windows)
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
zcli config set read_only true
```

## Command Reference

### Global

```bash
zcli --help
zcli --version
zcli -v
```

- `--help`: Show command help.
- `--version`, `-v`: Show version and exit.

### `zcli search`

Search items by text query.

Syntax:

```bash
zcli search <query> [--limit <n>]
```

Arguments and options:

- `<query>`: Search keyword, used for title/abstract matching.
- `--limit`, `-l`: Maximum returned items. Default: `50`.

Examples:

```bash
zcli search "machine learning"
zcli search "vector database" --limit 10
```

Success data fields (per item):

- `key`, `title`, `item_type`
- `authors`, `year`
- `abstract`, `doi`, `url`, `publication`, `pdf_path`

Common errors:

- Zotero path not configured.
- Database file unavailable/locked for current access mode.

### `zcli get`

Get one item by Zotero key.

Syntax:

```bash
zcli get <key>
```

Arguments:

- `<key>`: Zotero item key, e.g. `ABCD1234`.

Example:

```bash
zcli get ABCD1234
```

Common errors:

- `Item not found: <key>`
- Zotero path not configured.

### `zcli collections`

List all collections.

Syntax:

```bash
zcli collections
```

Success data fields (per collection):

- `collection_id`, `key`, `name`
- `parent_id`, `parent_key`

### `zcli tags`

List all tags with item count.

Syntax:

```bash
zcli tags
```

Success data fields (per tag):

- `tag_id`, `name`, `count`

### `zcli config init`

Auto-detect and persist Zotero data directory.

Syntax:

```bash
zcli config init
```

Success data fields:

- `message`, `data_dir`, `read_only`, `config_file`

### `zcli config show`

Show active configuration.

Syntax:

```bash
zcli config show
```

Success data fields:

- `data_dir`: Current Zotero data directory.
- `read_only`: Database access mode (`true` by default).
- `source`: Config source (`environment`, `config file`, `auto-detect`).
- `config_file`: Config file location.

### `zcli config set`

Set one configuration key/value.

Syntax:

```bash
zcli config set <key> <value>
```

Supported keys:

- `data_dir <path>`: Directory containing `zotero.sqlite`.
- `read_only <true|false>`: Toggle SQLite open mode (default: `true`).
  - Accepted boolean values: `true/false`, `1/0`, `yes/no`, `on/off`.

Examples:

```bash
zcli config set data_dir ~/Zotero
zcli config set read_only true
zcli config set read_only false
```

Common errors:

- `Unknown configuration key`
- `Directory does not exist`
- `Not a valid Zotero data directory (missing zotero.sqlite)`
- `Invalid value for read_only`

## Configuration

Configuration is stored in `~/.zcli/config.json`:

```json
{
  "data_dir": "/Users/xxx/Zotero",
  "read_only": true
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
make deps
```

### Build Commands

```bash
make deps         # Install development/build dependencies
make build        # Build for current platform
make build-mcp    # Build MCP server executable
make build-tools  # Build both zcli and zcli-mcp
make install      # Install built binary to /usr/local/bin (override PREFIX/BINDIR)
make install-mcp  # Install built MCP binary to /usr/local/bin
make install-tools # Install both zcli and zcli-mcp to /usr/local/bin
make install-py   # Install Python package into current environment
make build-win    # Build for Windows (run on Windows)
make build-mac    # Build for macOS (run on macOS)
make build-linux  # Build for Linux (run on Linux)
make clean        # Clean build artifacts
```

**Note:** PyInstaller does not support cross-compilation. You must run the build command on the target platform.

## MCP Integration

If you want LLM agents (including Codex) to auto-discover `zcli` as a tool, run it through MCP.
You do **not** need to manually launch `zcli-mcp` for normal use.

### Option A: Python environment

```bash
# Install MCP runtime dependency
pip install -e ".[mcp]"

# One-time registration in Codex (Codex will auto-start it when needed)
codex mcp add zcli -- zcli-mcp
```

### Option B: Standalone binary (no Python required)

After downloading the release binary, do this:

1. Put binary in `PATH` and rename it to `zcli-mcp`

```bash
# Example (Linux/macOS)
chmod +x zcli-mcp-linux-x64
sudo mv zcli-mcp-linux-x64 /usr/local/bin/zcli-mcp
```

2. Verify it is executable

```bash
which zcli-mcp
```

3. Register in Codex (one-time, global)

```bash
codex mcp add zcli -- zcli-mcp
```

4. Verify registration

```bash
codex mcp list
```

If you do not want global registration, start Codex with session-only config:

```bash
codex -c 'mcp_servers.zcli.command="/absolute/path/to/zcli-mcp"' -c 'mcp_servers.zcli.args=[]'
```

Optional (debug only): run the MCP server directly via stdio:

```bash
zcli-mcp
```
