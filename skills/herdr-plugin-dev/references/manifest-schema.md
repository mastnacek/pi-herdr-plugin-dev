# Herdr Manifest Schema & Specification

## Manifest Format (`herdr-plugin.toml`)

```toml
id = "example.layout-manager"
name = "Layout Manager"
version = "0.1.0"
min_herdr_version = "0.7.0"
description = "Manage terminal splits and workspace layouts"
platforms = ["linux", "macos", "windows"]

[[build]]
command = ["npm", "ci"]

[[build]]
command = ["npm", "run", "build"]
platforms = ["linux", "macos"]

[[startup]]
command = ["node", "dist/startup.js"]

[[actions]]
id = "split-dev"
title = "Split Development View"
contexts = ["workspace"]
command = ["node", "dist/actions/split-dev.js"]

[[events]]
on = "worktree.created"
command = ["node", "dist/events/on-worktree.js"]

[[panes]]
id = "metrics"
title = "Agent Metrics"
placement = "popup"
width = "80%"
height = 20
command = ["node", "dist/panes/metrics.js"]

[[link_handlers]]
id = "github-issue"
title = "Open GitHub Issue"
pattern = "^https://github\\.com/[^/]+/[^/]+/(issues|pull)/[0-9]+$"
action = "split-dev"
```

## Top-Level Fields

- **id** (string, required): Unique identifier (`[a-zA-Z0-9._:-]+`).
- **name** (string, required): Human-readable title.
- **version** (string, required): Semver string.
- **min_herdr_version** (string, required): Oldest Herdr version required. Herdr blocks install if its version is older.
- **description** (string, optional): Short summary.
- **platforms** (array of strings, optional): `["linux", "macos", "windows"]`.

## Sections

### `[[build]]`
Commands executed on `herdr plugin install owner/repo`.
- Runs sequentially.
- If any command fails (non-zero exit code), installation aborts.
- `herdr plugin link` skips build commands.

### `[[startup]]`
Executed once when Herdr server starts or restores session.
- One-shot initialization script; not a background daemon.
- Receives `HERDR_PLUGIN_EVENT=startup`.

### `[[actions]]`
User or keybinding triggered actions.
- `id` (string, required): Local action identifier (no dots). Fully qualified as `<plugin-id>.<id>`.
- `title` (string, required): Display title.
- `command` (array of strings, required): argv array.
- `contexts` (array of strings, optional): `["workspace"]`, etc.

### `[[events]]`
Lifecycle event listeners.
- `on` (string, required): Event name (e.g. `worktree.created`, `workspace.created`, `tab.created`, `pane.created`, `agent.settled`).
- `command` (array of strings, required): argv array.
- Receives `HERDR_PLUGIN_EVENT` and `HERDR_PLUGIN_EVENT_JSON`.

### `[[panes]]`
Plugin-provided terminal windows / popups.
- `id` (string, required): Local pane identifier.
- `title` (string, required): Pane title.
- `placement` (string, optional): `overlay` (default), `popup`, `split`, `tab`, `zoomed`.
- `width` / `height` (optional): Outer terminal cells or percentages (e.g. `width = "80%"`, `height = 20`).
- `command` (array of strings, required): Interactive program to launch.

### `[[link_handlers]]`
Custom click handlers for terminal URLs (Ctrl + click).
- `pattern` (string, required): Rust regex.
- `action` (string, required): Plugin action ID to execute.
