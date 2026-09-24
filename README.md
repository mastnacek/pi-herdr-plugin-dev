# pi-herdr-plugin-dev

Pi Agent extension and skill for authoring, scaffolding, testing, and debugging **Herdr** plugins in **Rust**, **TypeScript**, and **Bash**.

## Features

- **Agent Skill (`herdr-plugin-dev`)**: Progressive disclosure guide covering manifest rules, runtime env variables, socket API, and templates for Rust and TypeScript plugins.
- **Custom Tools**:
  - `herdr_scaffold_plugin`: Generate complete starter projects for Rust, TypeScript, or Bash plugins.
  - `herdr_validate_manifest`: Validate any `herdr-plugin.toml` against Herdr constraints.
- **Slash Command (`/herdr-plugin`)**:
  - `/herdr-plugin scaffold <rust|typescript|bash>`
  - `/herdr-plugin validate`
  - `/herdr-plugin docs`
- **Per-File Line Limit Monitor:** Source files edited via `edit`/`write` are checked against a hard limit (400 lines, soft advisory at 300). Oversized files are rejected with mandatory split instructions so the agent must decompose them logically. Dependency/build/lock files are exempt; `.md`/`.txt` docs are never gated.
- **Consult-Before-Edit Gate (hard enforcement):** `edit`/`write` on source files inside a Herdr plugin project (directory with `herdr-plugin.toml`) is **blocked** until the bundled Herdr documentation has been read this session — the `herdr-plugin-dev` skill (`SKILL.md`) or `docs/herdr/*.md`. Files outside Herdr projects are never gated.
- **Offline Herdr Documentation**: Bundled under `docs/herdr/` (plugins, CLI reference, socket API).

## Installation

Add to your Pi settings (`~/.pi/agent/settings.json`):

```json
{
  "packages": [
    "git:github.com/mastnacek/pi-herdr-plugin-dev"
  ]
}
```

## Quick Start: Creating a Herdr Plugin

### 1. Scaffold a new Rust plugin
Ask your Pi agent:
> "Scaffold a new Rust plugin for Herdr in ./my-rust-plugin with id acme.fast-tools"

Or run slash command:
```bash
/herdr-plugin scaffold rust ./my-rust-plugin acme.fast-tools
```

### 2. Scaffold a TypeScript plugin
```bash
/herdr-plugin scaffold typescript ./my-ts-plugin acme.ts-tools
```

### 3. Link and Test with Herdr
```bash
cd ./my-rust-plugin
herdr plugin link .
herdr plugin action list --plugin acme.fast-tools
herdr plugin action invoke acme.fast-tools.hello
```

## License

MIT
