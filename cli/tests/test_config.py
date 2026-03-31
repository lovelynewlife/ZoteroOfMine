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
        assert isinstance(config.read_only, bool)
        assert config.source in ["default", "auto-detect", "config file", "environment"]

    def test_config_to_dict(self):
        """Test config serialization."""
        config = Config()
        result = config.to_dict()
        assert "data_dir" in result
        assert "read_only" in result
        assert "source" in result

    def test_parse_bool(self):
        """Test bool parsing helper."""
        assert Config.parse_bool("true") is True
        assert Config.parse_bool("1") is True
        assert Config.parse_bool("yes") is True
        assert Config.parse_bool("false") is False
        assert Config.parse_bool("0") is False
        assert Config.parse_bool("off") is False
        assert Config.parse_bool("maybe") is None

    def test_detect_zotero_data_dir(self):
        """Test auto-detection of Zotero data directory."""
        result = detect_zotero_data_dir()
        # Result can be None (not found) or a valid Path
        assert result is None or isinstance(result, Path)
