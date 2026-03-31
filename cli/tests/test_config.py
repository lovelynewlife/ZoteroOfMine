"""Unit tests for config module."""

import pytest
from pathlib import Path

from zotero_cli.config import Config, detect_zotero_data_dir


class TestConfig:
    """Tests for Config class."""

    def test_config_default(self):
        """Test default config state."""
        config = Config()
        assert config.data_dir is None or isinstance(config.data_dir, Path)
        assert config.source in ["default", "auto-detect", "config file", "environment"]

    def test_config_to_dict(self):
        """Test config serialization."""
        config = Config()
        result = config.to_dict()
        assert "data_dir" in result
        assert "source" in result

    def test_detect_zotero_data_dir(self):
        """Test auto-detection of Zotero data directory."""
        result = detect_zotero_data_dir()
        # Result can be None (not found) or a valid Path
        assert result is None or isinstance(result, Path)
