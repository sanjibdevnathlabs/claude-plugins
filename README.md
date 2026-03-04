# Claude Plugins

[![CI](https://github.com/sanjibdevnathlabs/claude-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/sanjibdevnathlabs/claude-plugins/actions/workflows/ci.yml)

A collection of open-source plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Anthropic's CLI for AI-assisted software development.

## What are Claude Code plugins?

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's command-line tool that brings Claude directly into your terminal. **Plugins** extend Claude Code with additional capabilities — hooks that run on events (like session start), skills that add new `/slash` commands, and MCP server configurations.

Plugins can:
- Add **hooks** that trigger on events (e.g., start a dashboard when Claude Code opens)
- Add **skills** that register new `/commands` inside Claude Code
- Bundle **MCP servers** for tool integrations

## Plugins

| Plugin | Description | Status |
|--------|-------------|--------|
| [mcp-manager](./mcp-manager/) | Web dashboard to toggle MCP servers on/off, view tools, and manage configs across workspaces | v1.0.0 |

## Getting Started

### Prerequisites

1. **Install Claude Code** — Follow the [official guide](https://docs.anthropic.com/en/docs/claude-code) to install Claude Code
2. **Run Claude Code at least once** — This creates the `~/.claude.json` config file that plugins depend on
3. **Node.js 20+** and **npm** — Required to build and run plugins

### How plugin installation works

Claude Code uses a **marketplace** system. A marketplace is a GitHub repo (or local path) that contains one or more plugins. To install a plugin, you first register the marketplace, then install plugins from it.

#### Step 1: Add a marketplace

A marketplace is any repo with a `.claude-plugin/marketplace.json` at its root. Register it with:

```bash
# From a GitHub repo
claude plugin marketplace add github:<owner>/<repo>

# From a local path
claude plugin marketplace add /path/to/marketplace
```

#### Step 2: Install a plugin from the marketplace

Once the marketplace is registered, install any plugin listed in it:

```bash
claude plugin install <plugin-name>
```

This clones the plugin, builds it, and registers its hooks and skills with Claude Code automatically.

#### Step 3: Restart Claude Code

Start a new Claude Code session for the plugin's hooks and skills to take effect.

### Manage plugins and marketplaces

```bash
# List registered marketplaces
claude plugin marketplace list

# Update marketplace catalogs
claude plugin marketplace update

# List installed plugins
claude plugin list

# Remove a plugin
claude plugin uninstall <plugin-name>

# Remove a marketplace
claude plugin marketplace remove <marketplace-name>
```

### Install a plugin from this repo

To install **mcp-manager** from this repository:

```bash
# 1. Register this repo as a marketplace
claude plugin marketplace add github:sanjibdevnathlabs/claude-plugins

# 2. Install the plugin
claude plugin install mcp-manager
```

Then start a new Claude Code session — you should see:

```
MCP Manager dashboard running at http://localhost:4111
```

See the [mcp-manager README](./mcp-manager/README.md) for full setup and usage details.

## Contributing

Each plugin lives in its own directory at the repo root. See the individual plugin READMEs for development setup:

- [mcp-manager development guide](./mcp-manager/README.md#development)

## License

[MIT](./LICENSE)
