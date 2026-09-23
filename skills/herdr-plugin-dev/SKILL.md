---
name: herdr-plugin-dev
description: Expert guide for authoring, scaffolding, testing, and debugging Herdr multiplexer plugins using Vertical Slice Architecture (VSA) in Rust and Ratatui.
---

# Herdr Plugin Development Guide

Authoritative guide for developing plugins for Herdr (terminal multiplexer for coding agents).

## MANDATORY ARCHITECTURAL RULES (VSA)

1. **Vertical Slice Architecture (VSA / Feature-Based):**
   - Plugins MUST be organized into independent **vertical feature slices**.
   - **Composition Root (`src/main.rs`)**: CLI dispatch and entrypoint only, no business logic.
   - **Kernel / Shared (`src/shared/`)**: Domain models, Herdr CLI client, context parser, and logging. Must have ZERO knowledge of individual slices.
   - **Feature Slices (`src/slices/<feature>/`)**: Each slice owns its domain logic, widgets, rendering, state mutations, and actions.
   - **Inviolable Slice Boundary:** **Slices NEVER import each other.** All cross-cutting concerns flow through `src/shared/`, and `src/main.rs` dispatches between them.

2. **Language & UI Framework Mandate:**
   - **Herdr plugins MUST be built in Rust using Ratatui.**
   - Do NOT use other languages unless explicitly requested by the user. Rust + Ratatui provides instant cold-start (sub-8ms), minimal memory footprint (3-8MB RSS), and rich terminal popups/widgets.

3. **Mandatory Documentation Retrieval via MCP KB (Zero Hallucinations):**
   - **Never guess or invent Ratatui APIs from training data.** Ratatui is actively developed and has breaking changes across versions (e.g. `Block::bordered()`, `to_border_set`, shadow effects in v0.30+, new widget traits).
   - Before designing, scaffolding, writing code, or modifying any Herdr plugin with Ratatui UI, **you MUST query the Ratatui MCP Knowledge Base**:
     - Tool: `knowledge_base_kb_search`
     - Collection: `"ratatui"`
     - Query topics: layouts, widget traits, event loops, crossterm backend, `Clear` widget for popups, border types, etc.
     - For full context of any matched section, call `knowledge_base_kb_read_source`.

---

## Core Concepts & Plugin Model

- A Herdr plugin is an executable package declared in `herdr-plugin.toml`.
- Plugins run out-of-process. Herdr owns the host surface (windows, panes, tabs, events, keybindings).
- There is no separate SDK. The entire Herdr CLI (`HERDR_BIN_PATH`) is the plugin API.
- Communication with Herdr: invoke `$HERDR_BIN_PATH <command> --json` or connect to `$HERDR_SOCKET_PATH`.

## Progressive Disclosure References

- Architecture & layout (VSA): `references/vsa-architecture.md`
- Manifest schema & rules: `references/manifest-schema.md`
- Rust & Ratatui plugin architecture: `references/rust-plugin.md`
- Runtime environment & context: `references/runtime-environment.md`
- CLI reference & local development: `references/cli-and-linking.md`
- TypeScript / Node.js plugin template (reference only): `references/typescript-plugin.md`

## Fast Checklist for New Herdr Plugins

1. **Consult MCP KB:**
   - Run `knowledge_base_kb_search(collection: "ratatui", query: "...")` for every widget and pattern needed.

2. **Structure by Vertical Slices (`src/slices/`)**:
   - Create distinct slices for each action, popup, or background workflow (e.g. `src/slices/stats/`, `src/slices/layout/`).
   - Wire slice entrypoints in `src/main.rs`.

3. **Manifest (`herdr-plugin.toml`)**:
   - `id`, `name`, `version`, and `min_herdr_version` are mandatory.
   - `id` format: ASCII letters, numbers, dot, colon, underscore, hyphen (`my-org.my-plugin`).
   - Action / pane / link_handler ids must be local strings (no dots).
   - Set `platforms = ["linux", "macos", "windows"]` (or target subset).
   - `command` is an argv array (`["target/release/my-plugin", "slice-name", "subcommand"]`).

4. **Injected Environment**:
   - Call Herdr through `std::env::var("HERDR_BIN_PATH")`.
   - Read context from `HERDR_PLUGIN_CONTEXT_JSON`.
   - Never write state to `HERDR_PLUGIN_ROOT`. Write configs to `HERDR_PLUGIN_CONFIG_DIR` and state to `HERDR_PLUGIN_STATE_DIR`.

5. **Development & Linking**:
   - Link working directory: `herdr plugin link .`
   - List actions: `herdr plugin action list --plugin <plugin-id>`
   - Test invoke: `herdr plugin action invoke <plugin-id>.<action-id>`
   - Open popup: `herdr plugin pane open --plugin <plugin-id> --entrypoint <pane-id>`
   - Inspect logs: `herdr plugin log list --plugin <plugin-id>`
   - Unlink: `herdr plugin unlink <plugin-id>`

6. **Marketplace Discovery**:
   - Publish to GitHub.
   - Add GitHub topic `herdr-plugin` to repo.
   - Herdr indexer picks it up automatically.
