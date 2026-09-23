# Herdr Socket & JSON API Specification

*Source: https://herdr.dev/docs/socket-api/*

Herdr exposes a JSON-RPC-like socket API (Unix domain socket on Linux/macOS, Named Pipe on Windows).

Most plugins call the CLI wrapper through `HERDR_BIN_PATH` (`herdr ... --json`), but direct socket communication is available via `HERDR_SOCKET_PATH`.

## Methods Overview

| Category | Method | Description |
| --- | --- | --- |
| **Server** | `ping` | Healthcheck |
| | `server.stop` | Stop server |
| | `server.reload_config` | Reload config.toml |
| | `server.agent_manifests` | List agent detector manifests |
| **Workspace** | `workspace.create` | `{ cwd, label, env, focus }` |
| | `workspace.list` | List all workspaces |
| | `workspace.get` | Get workspace details |
| | `workspace.focus` | Focus workspace |
| | `workspace.close` | Close workspace (`close_group: true` for worktrees) |
| **Tab** | `tab.create` | `{ workspace_id, label, cwd, focus }` |
| | `tab.list` | `{ workspace_id }` |
| | `tab.get` | Tab details |
| | `tab.close` | Close tab |
| **Pane** | `pane.split` | `{ direction, ratio, right_click, env }` |
| | `pane.current` | `{ caller_pane_id }` |
| | `pane.layout` | Get BSP tab layout tree |
| | `pane.read` | `{ pane_id, source, lines, format }` |
| | `pane.send_keys` | `{ pane_id, keys: [...] }` |
| | `pane.send_text` | `{ pane_id, text }` |
| | `pane.wait_for_output` | `{ pane_id, match, regex, timeout_ms }` |
| | `pane.close` | Close pane |
| **Agent** | `agent.list` | List detected agents |
| | `agent.get` | `{ target }` |
| | `agent.start` | `{ name, kind, pane_id, args }` |
| | `agent.prompt` | `{ target, text, wait: { until, timeout_ms } }` |
| | `agent.wait` | `{ target, until, timeout_ms }` |
| | `agent.read` | Read agent output |
| **Plugin** | `plugin.link` | `{ path, enabled }` |
| | `plugin.unlink` | `{ plugin_id }` |
| | `plugin.list` | List all plugins |
| | `plugin.action.list` | List actions |
| | `plugin.action.invoke` | `{ action_id, context }` |
| | `plugin.pane.open` | `{ plugin_id, entrypoint, placement }` |
| **Notification** | `notification.show` | `{ title, body, position, sound }` |

## Exporting Live Schema
Run:
```bash
herdr api schema --json > herdr-api.schema.json
```
