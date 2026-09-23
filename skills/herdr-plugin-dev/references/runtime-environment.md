# Herdr Runtime Environment & Lifecycle

## 1. Execution Working Directory

All runtime commands are spawned with the plugin root folder as `cwd` (`HERDR_PLUGIN_ROOT`).

## 2. Injected Environment Variables

| Variable | Description |
| --- | --- |
| `HERDR_BIN_PATH` | Path to running Herdr binary. Always use this to invoke CLI portably. |
| `HERDR_SOCKET_PATH` | Path to server socket (Unix socket) or named pipe (Windows). |
| `HERDR_ENV` | Value `1` when running inside Herdr. |
| `HERDR_PLUGIN_ID` | The ID declared in `herdr-plugin.toml`. |
| `HERDR_PLUGIN_ROOT` | Path to plugin checkout. **Read-only; do not write state here!** |
| `HERDR_PLUGIN_CONFIG_DIR` | Dedicated directory for user settings & configs. |
| `HERDR_PLUGIN_STATE_DIR` | Dedicated directory for durable plugin state. |
| `HERDR_PLUGIN_CONTEXT_JSON` | Serialized JSON containing invocation details. |
| `HERDR_WORKSPACE_ID` | Active or target workspace ID (e.g. `w1`). |
| `HERDR_TAB_ID` | Active or target tab ID (e.g. `w1:t1`). |
| `HERDR_PANE_ID` | Active or target pane ID (e.g. `w1:p1`). |
| `HERDR_PLUGIN_ACTION_ID` | ID of the action being invoked. |
| `HERDR_PLUGIN_EVENT` | Event name that triggered this run (e.g. `startup`, `worktree.created`). |
| `HERDR_PLUGIN_EVENT_JSON` | Event payload JSON. |
| `HERDR_PLUGIN_ENTRYPOINT_ID` | Pane entrypoint ID. |
| `HERDR_PLUGIN_CLICKED_URL` | Clicked URL for link handlers. |
| `HERDR_PLUGIN_LINK_HANDLER_ID` | ID of matched link handler. |

## 3. Storage & State Contract

1. **Config (`HERDR_PLUGIN_CONFIG_DIR`)**:
   - Location for user preferences, `.env` credentials, custom config files.
   - Herdr seeds this directory on install/link.
   - Files persist across updates.

2. **State (`HERDR_PLUGIN_STATE_DIR`)**:
   - Location for cache, databases (SQLite), log files, or session layout memories.
   - Plugin controls its own schema and cleanup.

3. **Never write to `HERDR_PLUGIN_ROOT`**:
   - For GitHub-installed plugins, `HERDR_PLUGIN_ROOT` is replaced on update/reinstall.
