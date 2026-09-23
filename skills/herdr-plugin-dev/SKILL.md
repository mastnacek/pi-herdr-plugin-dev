---
name: herdr-plugin-dev
description: Expert guide for authoring, scaffolding, testing, and debugging Herdr multiplexer plugins in Rust, TypeScript, and Bash.
---

# Herdr Plugin Development Guide

Authoritative guide for developing plugins for Herdr (terminal multiplexer for coding agents).

## Core Concepts & Plugin Model

- A Herdr plugin is an executable package declared in `herdr-plugin.toml`.
- Plugins run out-of-process. Herdr owns the host surface (windows, panes, tabs, events, keybindings).
- There is no separate SDK. The entire Herdr CLI (`HERDR_BIN_PATH`) is the plugin API.
- Communication with Herdr: invoke `$HERDR_BIN_PATH <command> --json` or connect to `$HERDR_SOCKET_PATH`.

## Progressive Disclosure References

- Manifest schema & rules: `references/manifest-schema.md`
- TypeScript / Node.js plugin template: `references/typescript-plugin.md`
- Rust plugin template: `references/rust-plugin.md`
- Runtime environment & context: `references/runtime-environment.md`
- CLI reference & local development: `references/cli-and-linking.md`

## Fast Checklist for New Herdr Plugins

1. **Manifest (`herdr-plugin.toml`)**:
   - `id`, `name`, `version`, and `min_herdr_version` are mandatory.
   - `id` format: ASCII letters, numbers, dot, colon, underscore, hyphen (`my-org.my-plugin`).
   - Action / pane / link_handler ids must be local strings (no dots).
   - Set `platforms = ["linux", "macos", "windows"]` (or target subset).
   - `command` is an argv array (`["node", "dist/index.js"]` or `["target/release/my-plugin"]`).

2. **Injected Environment**:
   - Call Herdr through `process.env.HERDR_BIN_PATH` (or `std::env::var("HERDR_BIN_PATH")`).
   - Read context from `HERDR_PLUGIN_CONTEXT_JSON`.
   - Never write state to `HERDR_PLUGIN_ROOT`. Write configs to `HERDR_PLUGIN_CONFIG_DIR` and state to `HERDR_PLUGIN_STATE_DIR`.

3. **Development & Linking**:
   - Link working directory: `herdr plugin link .`
   - List actions: `herdr plugin action list --plugin <plugin-id>`
   - Test invoke: `herdr plugin action invoke <plugin-id>.<action-id>`
   - Inspect logs: `herdr plugin log list --plugin <plugin-id>`
   - Unlink: `herdr plugin unlink <plugin-id>`

4. **Marketplace Discovery**:
   - Publish to GitHub.
   - Add GitHub topic `herdr-plugin` to repo.
   - Herdr indexer picks it up within 30 minutes.
