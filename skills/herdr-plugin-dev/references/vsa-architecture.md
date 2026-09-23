# Vertical Slice Architecture (VSA) for Herdr Plugins

In alignment with our Pi plugins architecture (`pi-architecture-watcher`, `pi-solodev-adr`), Herdr plugins MUST be structured using Vertical Slice Architecture (VSA).

## 1. Principles of VSA in Rust

1. **Feature Cohesion over Technical Layering:**
   - Traditional architecture splits code into `models/`, `views/`, `controllers/`.
   - VSA groups code around **features/slices**. A slice owns its widgets, data fetching, state, and handlers.

2. **Inviolable Slice Isolation:**
   - **Slices never import each other directly.**
   - All shared contracts, Herdr client wrappers, and types live in `src/shared/`.
   - `src/main.rs` is the **composition root** that parses CLI arguments and invokes the appropriate slice.

## 2. Standard Rust Directory Layout

```text
herdr-plugin/
├── herdr-plugin.toml           # Manifest declaring actions and panes
├── Cargo.toml
└── src/
    ├── main.rs                 # Composition root & CLI dispatch
    ├── shared/                 # Kernel / Shared (No knowledge of slices)
    │   ├── mod.rs
    │   ├── client.rs           # Herdr CLI subprocess wrapper
    │   ├── context.rs          # HERDR_PLUGIN_CONTEXT_JSON deserializer
    │   └── terminal.rs         # Crossterm terminal setup/teardown helpers
    └── slices/                 # Feature Slices (Isolated)
        ├── mod.rs
        ├── dashboard/          # Feature 1: Interactive popup dashboard
        │   ├── mod.rs          # Slice entrypoint (e.g. pub fn run_popup())
        │   ├── state.rs        # Local slice state
        │   └── ui.rs           # Ratatui widgets & drawing loop
        └── dev_layout/         # Feature 2: Workspace split action
            ├── mod.rs          # Slice entrypoint (e.g. pub fn run_action())
            └── layout.rs       # Splitting logic
```

## 3. Composition Root Pattern (`src/main.rs`)

```rust
mod shared;
mod slices;

use std::env;
use std::io;

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("dashboard");

    match command {
        "dashboard" => slices::dashboard::run_popup()?,
        "dev-split" => slices::dev_layout::run_action()?,
        _ => eprintln!("Unknown command: {}", command),
    }

    Ok(())
}
```

## 4. Shared Kernel Pattern (`src/shared/`)

`src/shared/client.rs`:
```rust
use std::env;
use std::process::Command;
use serde_json::Value;

pub struct HerdrClient {
    bin_path: String,
}

impl HerdrClient {
    pub fn new() -> Self {
        let bin_path = env::var("HERDR_BIN_PATH").unwrap_or_else(|_| "herdr".to_string());
        Self { bin_path }
    }

    pub fn run_json(&self, args: &[&str]) -> Result<Value, String> {
        let mut cmd = Command::new(&self.bin_path);
        cmd.args(args);
        cmd.arg("--json");

        let output = cmd.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str(&stdout).map_err(|e| e.to_string())
    }

    pub fn notify(&self, title: &str, body: &str) {
        let _ = Command::new(&self.bin_path)
            .args(["notification", "show", title, "--body", body])
            .status();
    }
}
```

## 5. Slice Pattern (`src/slices/dashboard/`)

`src/slices/dashboard/mod.rs`:
- Implements the feature end-to-end.
- Imports `crate::shared::*`, **never** `crate::slices::dev_layout::*`.
- Calls MCP KB (`ratatui`) to ensure all widgets conform to latest documentation.
