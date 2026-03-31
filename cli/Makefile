.PHONY: install build build-win build-mac build-linux clean test test-unit

# Default build (detect current platform)
build:
	pyinstaller --onefile --name zcli \
		--paths src \
		--hidden-import zotero_cli \
		--hidden-import zotero_cli.main \
		--hidden-import zotero_cli.config \
		--hidden-import zotero_cli.models \
		--hidden-import zotero_cli.database \
		--hidden-import zotero_cli.commands \
		--exclude-module pytest \
		--exclude-module tests \
		entrypoint.py

# Windows build
build-win:
	pyinstaller --onefile --name zcli \
		--paths src \
		--hidden-import zotero_cli \
		--hidden-import zotero_cli.main \
		--hidden-import zotero_cli.config \
		--hidden-import zotero_cli.models \
		--hidden-import zotero_cli.database \
		--hidden-import zotero_cli.commands \
		--exclude-module pytest \
		--exclude-module tests \
		entrypoint.py
	@echo "Output: dist/zcli.exe"

# macOS build
build-mac:
	pyinstaller --onefile --name zcli \
		--paths src \
		--hidden-import zotero_cli \
		--hidden-import zotero_cli.main \
		--hidden-import zotero_cli.config \
		--hidden-import zotero_cli.models \
		--hidden-import zotero_cli.database \
		--hidden-import zotero_cli.commands \
		--exclude-module pytest \
		--exclude-module tests \
		entrypoint.py
	@echo "Output: dist/zcli"

# Linux build
build-linux:
	pyinstaller --onefile --name zcli \
		--paths src \
		--hidden-import zotero_cli \
		--hidden-import zotero_cli.main \
		--hidden-import zotero_cli.config \
		--hidden-import zotero_cli.models \
		--hidden-import zotero_cli.database \
		--hidden-import zotero_cli.commands \
		--exclude-module pytest \
		--exclude-module tests \
		entrypoint.py
	@echo "Output: dist/zcli"

# Install dependencies
install:
	pip install -e . pyinstaller

# Install dev dependencies only
install-dev:
	pip install pyinstaller

# Clean build artifacts
clean:
	rm -rf build/ dist/ *.spec

# Test the CLI
test:
	zcli --help
	zcli --version

# Run unit tests
test-unit:
	pytest tests/ -v

# Build all platforms (requires running on each OS)
build-all:
	@echo "Run 'make build-win' on Windows"
	@echo "Run 'make build-mac' on macOS"
	@echo "Run 'make build-linux' on Linux"
	@echo "Note: Cross-compilation is not supported by PyInstaller"
