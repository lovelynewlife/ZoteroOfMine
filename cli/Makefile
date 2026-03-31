.PHONY: all help deps deps-build deps-mcp install install-mcp install-tools install-py install-dev uninstall \
	build build-mcp build-tools build-win build-mac build-linux build-all clean test test-unit test-mcp

APP_NAME ?= zcli
MCP_APP_NAME ?= zcli-mcp
PYTHON ?= python
PIP ?= $(PYTHON) -m pip
PYINSTALLER ?= pyinstaller
ENTRYPOINT ?= entrypoint.py
MCP_ENTRYPOINT ?= entrypoint_mcp.py
DIST_DIR ?= dist
PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin

ifeq ($(OS),Windows_NT)
BIN_EXT := .exe
else
BIN_EXT :=
endif

BIN_PATH := $(DIST_DIR)/$(APP_NAME)$(BIN_EXT)
MCP_BIN_PATH := $(DIST_DIR)/$(MCP_APP_NAME)$(BIN_EXT)

PYINSTALLER_ARGS := \
	--onefile \
	--name $(APP_NAME) \
	--paths src \
	--hidden-import zotero_cli \
	--hidden-import zotero_cli.main \
	--hidden-import zotero_cli.config \
	--hidden-import zotero_cli.models \
	--hidden-import zotero_cli.database \
	--hidden-import zotero_cli.commands \
	--exclude-module pytest \
	--exclude-module tests \
	$(ENTRYPOINT)

PYINSTALLER_MCP_ARGS := \
	--onefile \
	--name $(MCP_APP_NAME) \
	--paths src \
	--hidden-import zotero_cli \
	--hidden-import zotero_cli.mcp_server \
	--hidden-import zotero_cli.config \
	--hidden-import zotero_cli.database \
	--hidden-import zotero_cli.models \
	--hidden-import zotero_cli.commands \
	--hidden-import mcp \
	--hidden-import mcp.server.fastmcp \
	--exclude-module pytest \
	--exclude-module tests \
	$(MCP_ENTRYPOINT)

all: build

help:
	@echo "Common targets:"
	@echo "  make deps         Install dev/build dependencies (includes MCP)"
	@echo "  make build        Build standalone executable for current platform"
	@echo "  make build-mcp    Build standalone MCP server executable"
	@echo "  make build-tools  Build zcli and zcli-mcp executables"
	@echo "  make install      Install built executable to $(BINDIR)"
	@echo "  make install-mcp  Install built MCP executable to $(BINDIR)"
	@echo "  make install-tools Install both zcli and zcli-mcp to $(BINDIR)"
	@echo "  make install-py   Install Python package via pip"
	@echo "  make test-unit    Run unit tests"
	@echo "  make test-mcp     Run MCP smoke test"
	@echo "  make clean        Remove build artifacts"

# Install dependencies for development/build
deps:
	@$(PYTHON) -c "import pytest, typer, mcp" >/dev/null 2>&1 || $(PIP) install -e ".[dev,mcp]"

# Install only build dependency
deps-build:
	@command -v $(PYINSTALLER) >/dev/null 2>&1 || $(PIP) install pyinstaller

# Install MCP runtime dependency
deps-mcp:
	@$(PYTHON) -c "import mcp" >/dev/null 2>&1 || $(PIP) install -e ".[mcp]"

# Backward-compatible alias for old dependency install behavior
install-dev: deps

# Build for current platform
build: deps-build
	$(PYINSTALLER) $(PYINSTALLER_ARGS)
	@echo "Output: $(BIN_PATH)"

# Build MCP server executable for current platform
build-mcp: deps-build deps-mcp
	$(PYINSTALLER) $(PYINSTALLER_MCP_ARGS)
	@echo "Output: $(MCP_BIN_PATH)"

# Build both CLI and MCP server executables
build-tools: build build-mcp

# Windows build
build-win:
	@if [ "$(OS)" != "Windows_NT" ]; then \
		echo "build-win must be run on Windows"; \
		exit 1; \
	fi
	$(MAKE) build

# macOS build
build-mac:
	@if [ "$$(uname -s)" != "Darwin" ]; then \
		echo "build-mac must be run on macOS"; \
		exit 1; \
	fi
	$(MAKE) build

# Linux build
build-linux:
	@if [ "$$(uname -s)" != "Linux" ]; then \
		echo "build-linux must be run on Linux"; \
		exit 1; \
	fi
	$(MAKE) build

ifeq ($(OS),Windows_NT)
install: build
	@echo "Binary install target is not supported on Windows."
	@echo "Use 'make install-py' instead."
	@exit 1

install-mcp: build-mcp
	@echo "Binary install target is not supported on Windows."
	@echo "Use 'make install-py' instead."
	@exit 1

install-tools: build-tools
	@echo "Binary install target is not supported on Windows."
	@echo "Use 'make install-py' instead."
	@exit 1

uninstall:
	@echo "Use 'pip uninstall zcli' to remove Python installation on Windows."
else
# Install built executable to system path (override PREFIX/BINDIR as needed)
install: build
	install -d "$(DESTDIR)$(BINDIR)"
	install -m 755 "$(BIN_PATH)" "$(DESTDIR)$(BINDIR)/$(APP_NAME)"
	@echo "Installed: $(DESTDIR)$(BINDIR)/$(APP_NAME)"

install-mcp: build-mcp
	install -d "$(DESTDIR)$(BINDIR)"
	install -m 755 "$(MCP_BIN_PATH)" "$(DESTDIR)$(BINDIR)/$(MCP_APP_NAME)"
	@echo "Installed: $(DESTDIR)$(BINDIR)/$(MCP_APP_NAME)"

install-tools: install install-mcp

uninstall:
	rm -f "$(DESTDIR)$(BINDIR)/$(APP_NAME)"
	rm -f "$(DESTDIR)$(BINDIR)/$(MCP_APP_NAME)"
	@echo "Removed: $(DESTDIR)$(BINDIR)/$(APP_NAME) and $(DESTDIR)$(BINDIR)/$(MCP_APP_NAME)"
endif

# Install Python package via pip (virtualenv/system decided by current Python)
install-py:
	$(PIP) install .

# Clean build artifacts
clean:
	rm -rf build/ dist/ *.spec

# Test CLI module directly (no prior install needed)
test:
	PYTHONPATH=src $(PYTHON) -m zotero_cli.main --help
	PYTHONPATH=src $(PYTHON) -m zotero_cli.main --version

# Run unit tests
test-unit:
	PYTHONPATH=src $(PYTHON) -m pytest tests/ -v

# Validate MCP server registration and tool list
test-mcp:
	PYTHONPATH=src $(PYTHON) -c "import anyio; from zotero_cli.mcp_server import create_server; s=create_server(); print([t.name for t in anyio.run(s.list_tools)])"

# Build all platforms (requires running on each OS)
build-all:
	@echo "Run 'make build-win' on Windows"
	@echo "Run 'make build-mac' on macOS"
	@echo "Run 'make build-linux' on Linux"
	@echo "Note: Cross-compilation is not supported by PyInstaller"
