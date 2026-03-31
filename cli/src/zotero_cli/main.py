"""CLI entry point for Zotero CLI."""

import typer
from typing import Optional

from . import __version__
from .commands import (
    cmd_collections,
    cmd_config_init,
    cmd_config_set,
    cmd_config_show,
    cmd_get,
    cmd_search,
    cmd_tags,
)
from .config import Config

app = typer.Typer(
    name="zcli",
    help="CLI tool for querying local Zotero database",
)

config_app = typer.Typer(help="Configuration management")
app.add_typer(config_app, name="config")

# Global config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get or create config instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: bool = typer.Option(
        False, "--version", "-v", help="Show version and exit", is_eager=True
    )
):
    """Zotero CLI - Query local Zotero database."""
    if version:
        typer.echo(f"zcli version {__version__}")
        raise typer.Exit()
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query"),
    limit: int = typer.Option(50, "--limit", "-l", help="Maximum number of results"),
):
    """Search items by title, authors, or year."""
    config = get_config()
    result = cmd_search(config, query, limit)
    typer.echo(result)


@app.command()
def get(
    key: str = typer.Argument(..., help="Item key (e.g., ABCD1234)"),
):
    """Get a single item by key."""
    config = get_config()
    result = cmd_get(config, key)
    typer.echo(result)


@app.command()
def collections():
    """List all collections."""
    config = get_config()
    result = cmd_collections(config)
    typer.echo(result)


@app.command()
def tags():
    """List all tags."""
    config = get_config()
    result = cmd_tags(config)
    typer.echo(result)


@config_app.command("init")
def config_init():
    """Initialize configuration with auto-detected Zotero directory."""
    config = get_config()
    result = cmd_config_init(config)
    typer.echo(result)


@config_app.command("show")
def config_show():
    """Show current configuration."""
    config = get_config()
    result = cmd_config_show(config)
    typer.echo(result)


@config_app.command("set")
def config_set(
    key: str = typer.Argument(..., help="Configuration key"),
    value: str = typer.Argument(..., help="Configuration value"),
):
    """Set a configuration value."""
    config = get_config()
    result = cmd_config_set(config, key, value)
    typer.echo(result)


if __name__ == "__main__":
    app()
