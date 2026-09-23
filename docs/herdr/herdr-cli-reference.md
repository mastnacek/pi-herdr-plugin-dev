# Herdr CLI Reference

*Source: https://herdr.dev/docs/cli-reference/*

Herdr's CLI communicates with the background server over a local socket/named pipe API. Most commands output structured JSON.

## Core Commands

### Status & Server
```bash
herdr                         # Launch or attach TUI
herdr status                  # Print status summary
herdr status server           # Server status
herdr status client           # Client status
herdr --version               # Version
herdr api schema --json       # Export complete JSON schema for socket API
herdr server reload-config    # Reload configuration without restart
```

### Workspaces
```bash
herdr workspace list
herdr workspace create [--cwd PATH] [--label TEXT] [--env KEY=VALUE] [--no-focus]
herdr workspace get <workspace_id>
herdr workspace focus <workspace_id>
herdr workspace rename <workspace_id> <label>
herdr workspace close <workspace_id> [--group]
```

### Tabs
```bash
herdr tab list [--workspace <workspace_id>]
herdr tab create [--workspace <workspace_id>] [--cwd PATH] [--label TEXT] [--no-focus]
herdr tab get <tab_id>
herdr tab focus <tab_id>
herdr tab rename <tab_id> <label>
herdr tab close <tab_id>
```

### Panes
```bash
herdr pane list [--workspace <workspace_id>]
herdr pane current [--current]
herdr pane get <pane_id>
herdr pane layout [--pane ID|--current]
herdr pane split [<pane_id>|--current] --direction right|down [--cwd PATH] [--no-focus]
herdr pane swap --direction left|right|up|down [--current]
herdr pane resize --direction left|right|up|down [--amount 0.1] [--current]
herdr pane zoom [<pane_id>|--current] [--toggle|--on|--off]
herdr pane close <pane_id>

# Input & Output
herdr pane read <pane_id> [--source visible|recent|recent-unwrapped|detection] [--lines N] [--format text|ansi]
herdr pane run <pane_id> "<command>"           # Submits command + Enter atomically
herdr pane send-text <pane_id> "<text>"
herdr pane send-keys <pane_id> <key> [key ...] # Keys: enter, esc, ctrl+c, tab, etc.
herdr pane wait-output <pane_id> (--match TEXT | --regex PATTERN) [--lines N] [--timeout MS]
```

### Agents
```bash
herdr agent list
herdr agent get <target>
herdr agent start <name> --kind <kind> --pane <pane_id> [-- <agent-args...>]
# kinds: pi, claude, codex, gemini, cursor, devin, etc.
herdr agent prompt <target> "<prompt>" [--wait] [--timeout MS]
herdr agent wait <target> [--until idle|done|blocked|unknown] [--timeout MS]
herdr agent read <target> [--source recent-unwrapped] [--lines N]
herdr agent send-keys <target> <key>
herdr agent focus <target>
herdr agent rename <target> <name>
```

### Plugins Management
```bash
herdr plugin link <path>                   # Link local plugin directory for dev
herdr plugin unlink <plugin_id>            # Unregister local plugin
herdr plugin install <owner>/<repo>[/sub]  # Install from GitHub
herdr plugin uninstall <plugin_id>         # Uninstall and delete files
herdr plugin list [--json]                 # List installed/linked plugins
herdr plugin enable <plugin_id>
herdr plugin disable <plugin_id>
herdr plugin config-dir <plugin_id>        # Print config dir path
herdr plugin action list [--plugin <id>]   # List registered actions
herdr plugin action invoke <qualified_id>  # Invoke an action manually
herdr plugin pane open --plugin <id> --entrypoint <pane_id>
herdr plugin log list [--plugin <id>]      # View execution logs
```
