"""Unit tests for commands module."""

import pytest

from zotero_cli.commands import (
    cmd_config_show,
    output_json,
)
from zotero_cli.config import Config


class TestCommands:
    """Tests for command functions."""

    def test_output_json_success(self):
        """Test JSON output for success case."""
        result = output_json({"key": "value"})
        assert '"success": true' in result
        assert '"data"' in result

    def test_output_json_error(self):
        """Test JSON output for error case."""
        result = output_json({}, success=False, error="Test error")
        assert '"success": false' in result
        assert '"error"' in result
        assert "Test error" in result

    def test_cmd_config_show(self):
        """Test config show command."""
        config = Config()
        result = cmd_config_show(config)
        assert '"success": true' in result
        assert '"data_dir"' in result
        assert '"source"' in result
