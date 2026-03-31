.PHONY: all help deps deps-build install install-py install-dev uninstall \
	build build-win build-mac build-linux build-all clean test test-unit

APP_NAME ?= zcli
PYTHON ?= python3
PIP ?= $(PYTHON) -m pip
PYINSTALLER ?= pyinstaller
ENTRYPOINT ?= entrypoint.py
DIST_DIR ?= dist
PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin

ifeq ($(OS),Windows_NT)
BIN_EXT := .exe
else
BIN_EXT :=
endif

BIN_PATH := $(DIST_DIR)/$(APP_NAME)$(BIN_EXT)

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

all: build

help:
	@echo "Common targets:"
	@echo "  make deps         Install dev/build dependencies"
	@echo "  make build        Build standalone executable for current platform"
	@echo "  make install      Install built executable to $(BINDIR)"
	@echo "  make install-py   Install Python package via pip"
	@echo "  make test-unit    Run unit tests"
	@echo "  make clean        Remove build artifacts"

# Install dependencies for development/build
deps:
	$(PIP) install -e ".[dev]"

# Install only build dependency
deps-build:
	@command -v $(PYINSTALLER) >/dev/null 2>&1 || $(PIP) install pyinstaller

# Backward-compatible alias for old dependency install behavior
install-dev: deps

# Build for current platform
build: deps-build
	$(PYINSTALLER) $(PYINSTALLER_ARGS)
	@echo "Output: $(BIN_PATH)"

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

uninstall:
	@echo "Use 'pip uninstall zcli' to remove Python installation on Windows."
else
# Install built executable to system path (override PREFIX/BINDIR as needed)
install: build
	install -d "$(DESTDIR)$(BINDIR)"
	install -m 755 "$(BIN_PATH)" "$(DESTDIR)$(BINDIR)/$(APP_NAME)"
	@echo "Installed: $(DESTDIR)$(BINDIR)/$(APP_NAME)"

uninstall:
	rm -f "$(DESTDIR)$(BINDIR)/$(APP_NAME)"
	@echo "Removed: $(DESTDIR)$(BINDIR)/$(APP_NAME)"
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

# Build all platforms (requires running on each OS)
build-all:
	@echo "Run 'make build-win' on Windows"
	@echo "Run 'make build-mac' on macOS"
	@echo "Run 'make build-linux' on Linux"
	@echo "Note: Cross-compilation is not supported by PyInstaller"
