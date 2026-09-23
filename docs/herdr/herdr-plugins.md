# Herdr Plugins Specification & Documentation

*Source: https://herdr.dev/docs/plugins/*

Herdr plugins are shareable, executable workflow packages. A plugin can be a Bash script, JavaScript app, Lua script, Rust binary, or any other argv command your machine can run. Herdr owns the host surface: installation, manifest validation, keybindings, terminal panes, events, invocation context, and socket access. The plugin owns its implementation language, dependencies, files, and durable state.

Plugins exist so Herdr can stay lean. The core stays focused on terminal workspaces, panes, agents, and a stable CLI/socket API. Plugins turn that existing extension surface into reusable workflows that people can build, install, and share without adding every workflow to Herdr itself.

A plugin is a directory with a `herdr-plugin.toml` manifest and commands Herdr can launch. Herdr validates the manifest, injects runtime context, starts the declared commands, and records logs. The commands call back into Herdr through the CLI or socket when they need to do more work.

There is no separate plugin SDK or restricted command set. The entire Herdr CLI is the plugin API. Every command in the CLI reference is available to a plugin, and a plugin can run anything you can run yourself as `herdr ...`. Most plugins should call Herdr through `HERDR_BIN_PATH`, which points at the running Herdr binary. That keeps plugins portable across Unix sockets and Windows named pipes. Use the socket API when you want to send raw JSON requests yourself.

Runtime action registration and native non-terminal plugin UI are not part of plugin v1. Actions, event hooks, panes, and link handlers are all declared in the manifest.

## Trust and Security

A plugin is ordinary code that runs on your machine. Its build and runtime commands run as your user, inherit your environment, and can call the full Herdr CLI. Treat a plugin like any extension you add to an editor, shell, or coding agent.

Install or link plugins only from authors and repositories you trust. Before installing or linking one, skim the `herdr-plugin.toml` manifest and the scripts or binaries it runs. `herdr plugin install` shows a preview of the source and the commands it will run in interactive terminals, so you can review before confirming. Use `--yes` for sources you already trust, and pin `--ref` when you want a specific revision.

Herdr validates the manifest and keeps each plugin's config and state in its own directory, but it does not review or sandbox plugin code. Third-party plugins come from their authors, not Herdr; you are responsible for deciding whether to run them.

## Manifest (`herdr-plugin.toml`)

The manifest is the contract between Herdr and the plugin. It declares package metadata, supported platforms, optional build commands, and the entrypoints Herdr can run.

```toml
id = "example.layout"
name = "Layout"
version = "0.1.0"
min_herdr_version = "0.7.0"
description = "Apply project layouts"
platforms = ["linux", "macos", "windows"]

[[build]]
command = ["npm", "ci"]

[[build]]
command = ["npm", "run", "build"]
platforms = ["linux", "macos"]

[[startup]]
command = ["node", "dist/restore.js"]

[[actions]]
id = "apply"
title = "Apply layout"
contexts = ["workspace"]
command = ["node", "dist/apply.js"]

[[events]]
on = "worktree.created"
command = ["herdr", "workspace", "list"]

[[panes]]
id = "board"
title = "Project board"
placement = "overlay"
command = ["herdr-board"]

[[link_handlers]]
id = "github-issue"
title = "Open GitHub issue"
pattern = "^https://github\\.com/[^/]+/[^/]+/(issues|pull)/[0-9]+$"
action = "apply"
```

### Manifest Rules
- Top-level `id`, `name`, `version`, and `min_herdr_version` are **required**.
- `min_herdr_version`: set to oldest Herdr version supporting used features. Herdr refuses to link/install if this is newer than the binary.
- `id`: ASCII letters, digits, dot, colon, underscore, hyphen (`example.layout`).
- Action ids, pane ids, and link handler ids: local ids inside the plugin. ASCII letters, digits, colon, underscore, hyphen. **No dots**.
- `platforms`: `["linux", "macos", "windows"]`. Can be overridden per-item (`[[build]]`, `[[actions]]`, etc.).
- `command`: argv array of strings (`["node", "dist/index.js"]`). Never run through shell; no shell expansion unless wrapped in `["sh", "-c", "..."]` or `["cmd", "/c", "..."]`.

## Build Commands (`[[build]]`)

Build commands run during GitHub `herdr plugin install` after confirmation and before Herdr registers the plugin.
- If a build command fails, installation aborts.
- `herdr plugin link` does **not** run build commands; author builds manually.
- Build commands do not receive runtime plugin context or socket env. Document required toolchains (`cargo`, `npm`, `bun`).

## Startup Hooks (`[[startup]]`)

Commands run once for each enabled plugin after Herdr restores session and API socket is ready.
- Runs again when new server takes over during live handoff.
- Receives normal plugin env with `HERDR_PLUGIN_EVENT="startup"`.
- One-shot initialization; not a supervised daemon. Should restore state and exit.

## Commands and Runtime Environment

Working directory is always the plugin directory (`HERDR_PLUGIN_ROOT`).
Injected environment variables:
- `HERDR_BIN_PATH`: Path to herdr binary. Use this for CLI calls across OSes!
- `HERDR_SOCKET_PATH`: Path to socket or named pipe.
- `HERDR_ENV=1`: Indicates execution inside Herdr.
- `HERDR_PLUGIN_ID`: Current plugin ID.
- `HERDR_PLUGIN_ROOT`: Plugin root directory (checkout / linked path). Do NOT write durable state here.
- `HERDR_PLUGIN_CONFIG_DIR`: User config directory (e.g. `.env`, custom settings).
- `HERDR_PLUGIN_STATE_DIR`: Durable runtime state directory.
- `HERDR_PLUGIN_CONTEXT_JSON`: JSON string containing workspace, tab, focused pane, worktree, agent, selected text, clicked URL, etc.
- `HERDR_WORKSPACE_ID`: Calling workspace ID (if available).
- `HERDR_TAB_ID`: Calling tab ID (if available).
- `HERDR_PANE_ID`: Calling pane ID (if available).
- `HERDR_PLUGIN_ACTION_ID`: For action invocations.
- `HERDR_PLUGIN_EVENT`: For event hooks (or `"startup"` for startup hooks).
- `HERDR_PLUGIN_EVENT_JSON`: JSON payload for event hooks.
- `HERDR_PLUGIN_ENTRYPOINT_ID`: For pane commands.

## Panes & Placement (`[[panes]]`)

Placement options:
- `overlay`: Temporary zoomed overlay over active pane; restores previous focus on close. (Default)
- `popup`: Session-modal terminal popup. Supports `width` and `height` (e.g. `width = "80%"`, `height = 20`).
- `split`, `tab`, `zoomed`: Standard Herdr panes with full lifecycle.

## Link Handlers (`[[link_handlers]]`)

Routes Ctrl+click on matching URLs in terminal to a plugin action:
- `pattern`: Rust regex string.
- `action`: Name of plugin action.
- Receives `invocation_source = "link_click"` in `HERDR_PLUGIN_CONTEXT_JSON`.

## CLI Workflow for Plugin Dev
```bash
herdr plugin link /path/to/plugin
herdr plugin list
herdr plugin action list --plugin <plugin-id>
herdr plugin action invoke <plugin-id>.<action-id>
herdr plugin log list --plugin <plugin-id>
herdr plugin unlink <plugin-id>
```

Marketplace tag: add GitHub topic `herdr-plugin` on repo to auto-list on herdr.dev/plugins.
