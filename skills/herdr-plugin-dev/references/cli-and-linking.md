# Herdr CLI & Local Plugin Linking

## 1. Local Development Cycle

1. **Link Local Directory**:
   ```bash
   herdr plugin link /absolute/path/to/my-plugin
   # Or link current working directory:
   herdr plugin link .
   ```

2. **Verify Registration**:
   ```bash
   herdr plugin list
   ```

3. **Check Action Registration**:
   ```bash
   herdr plugin action list --plugin <plugin-id>
   ```

4. **Invoke Action Manually**:
   ```bash
   herdr plugin action invoke <plugin-id>.<action-id>
   ```

5. **Test Terminal Pane / Popup**:
   ```bash
   herdr plugin pane open --plugin <plugin-id> --entrypoint <pane-id>
   ```

6. **Inspect Execution Logs**:
   ```bash
   herdr plugin log list --plugin <plugin-id>
   ```

7. **Unlink When Done**:
   ```bash
   herdr plugin unlink <plugin-id>
   ```

## 2. Publishing & GitHub Marketplace

1. Publish repository to GitHub (e.g. `github.com/my-org/herdr-plugin-layout`).
2. Add topic `herdr-plugin` to GitHub repository settings.
3. Test remote install:
   ```bash
   herdr plugin install my-org/herdr-plugin-layout
   ```
