# Rust Herdr Plugin Guide

Rust is the ideal language for Herdr plugins when you want high performance, zero runtime dependencies, or standalone binary distribution.

## 1. Directory Structure

```text
my-rust-plugin/
├── herdr-plugin.toml
├── Cargo.toml
└── src/
    ├── main.rs
    └── herdr.rs
```

## 2. Manifest (`herdr-plugin.toml`)

```toml
id = "acme.fast-tools"
name = "Fast Tools"
version = "0.1.0"
min_herdr_version = "0.7.0"
platforms = ["linux", "macos", "windows"]

[[build]]
command = ["cargo", "build", "--release"]

[[actions]]
id = "split-bench"
title = "Split Benchmark Pane"
command = ["target/release/fast-tools", "action", "split-bench"]

[[panes]]
id = "stats"
title = "Live Stats"
placement = "popup"
width = "80%"
height = 24
command = ["target/release/fast-tools", "pane", "stats"]
```

## 3. Cargo Configuration (`Cargo.toml`)

```toml
[package]
name = "fast-tools"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## 4. Helper Module (`src/herdr.rs`)

```rust
use std::env;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Default)]
pub struct HerdrContext {
    pub workspace_id: Option<String>,
    pub tab_id: Option<String>,
    pub pane_id: Option<String>,
    pub invocation_source: Option<String>,
}

pub struct HerdrClient {
    bin_path: String,
}

impl HerdrClient {
    pub fn new() -> Self {
        let bin_path = env::var("HERDR_BIN_PATH").unwrap_or_else(|_| "herdr".to_string());
        Self { bin_path }
    }

    pub fn context() -> HerdrContext {
        match env::var("HERDR_PLUGIN_CONTEXT_JSON") {
            Ok(json_str) => serde_json::from_str(&json_str).unwrap_or_default(),
            Err(_) => HerdrContext::default(),
        }
    }

    pub fn run_json(&self, args: &[&str]) -> Result<serde_json::Value, String> {
        let mut cmd = Command::new(&self.bin_path);
        cmd.args(args);
        cmd.arg("--json");

        let output = cmd.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Command failed: {stderr}"));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str(&stdout).map_err(|e| format!("JSON decode error: {e}"))
    }

    pub fn notify(&self, title: &str, body: Option<&str>) -> Result<(), String> {
        let mut args = vec!["notification", "show", title];
        if let Some(b) = body {
            args.push("--body");
            args.push(b);
        }
        self.run_json(&args).map(|_| ())
    }
}
```

## 5. Main Entrypoint (`src/main.rs`)

```rust
mod herdr;

use herdr::HerdrClient;
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    let herdr = HerdrClient::new();
    let ctx = HerdrClient::context();

    if args.len() >= 3 && args[1] == "action" && args[2] == "split-bench" {
        println!("Invoked from pane: {:?}", ctx.pane_id);
        let _ = herdr.notify("Rust Plugin Action", Some("Action split-bench executed."));
    } else {
        println!("Usage: fast-tools <action|pane> <id>");
    }
}
```
