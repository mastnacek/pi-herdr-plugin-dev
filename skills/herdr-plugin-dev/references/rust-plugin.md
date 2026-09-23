# Rust & Ratatui Herdr Plugin Architecture

Herdr plugins MUST be written in Rust using Ratatui for terminal interfaces and popups.

## 1. Mandatory MCP Knowledge Base Rule

Before writing or editing any Ratatui code, consult the local Knowledge Base:
- Tool: `knowledge_base_kb_search`
- Collection: `"ratatui"`
- Never use hallucinated or obsolete APIs (e.g. outdated layout constraints or border builders). Verify via `kb_search` and `kb_read_source`.

## 2. Directory Structure

```text
my-herdr-plugin/
├── herdr-plugin.toml
├── Cargo.toml
└── src/
    ├── main.rs
    ├── herdr.rs
    └── ui/
        ├── mod.rs
        └── popup.rs
```

## 3. Recommended `Cargo.toml` Dependencies

```toml
[package]
name = "my-herdr-plugin"
version = "0.1.0"
edition = "2021"

[dependencies]
ratatui = { version = "0.30", features = ["all-widgets"] }
crossterm = { version = "0.28", features = ["event-stream"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## 4. Manifest Pattern with Popup Pane (`herdr-plugin.toml`)

```toml
id = "acme.agent-dashboard"
name = "Agent Dashboard"
version = "0.1.0"
min_herdr_version = "0.7.0"
platforms = ["linux", "macos", "windows"]

[[build]]
command = ["cargo", "build", "--release"]

[[actions]]
id = "open-dashboard"
title = "Open Agent Dashboard"
contexts = ["workspace"]
command = ["target/release/my_herdr_plugin", "action"]

[[panes]]
id = "dashboard-popup"
title = "Agent Dashboard"
placement = "popup"
width = "80%"
height = 24
command = ["target/release/my_herdr_plugin", "popup"]
```

## 5. Typical Ratatui Popup Implementation Pattern

```rust
use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style, Stylize},
    widgets::{Block, Borders, Clear, Paragraph},
    Terminal,
};
use std::io::{self, stdout};

pub fn run_popup() -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    loop {
        terminal.draw(|f| {
            let area = f.area();
            let block = Block::bordered()
                .title(" Herdr Agent Dashboard (q to quit) ")
                .border_style(Style::default().fg(Color::Cyan));
            f.render_widget(Clear, area); // Clean terminal under popup
            f.render_widget(block, area);
        })?;

        if let Event::Key(key) = event::read()? {
            if key.code == KeyCode::Char('q') || key.code == KeyCode::Esc {
                break;
            }
        }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    Ok(())
}
```
