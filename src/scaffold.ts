import fs from "node:fs";
import path from "node:path";

export interface ScaffoldOptions {
  targetDir: string;
  id: string;
  name: string;
  language: "rust" | "typescript" | "bash";
  description?: string;
}

export function scaffoldHerdrPlugin(opts: ScaffoldOptions): { filesCreated: string[] } {
  const dir = path.resolve(opts.targetDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filesCreated: string[] = [];

  const manifest = generateManifest(opts);
  const manifestPath = path.join(dir, "herdr-plugin.toml");
  fs.writeFileSync(manifestPath, manifest, "utf8");
  filesCreated.push("herdr-plugin.toml");

  const gitignore = "dist/\nnode_modules/\ntarget/\n.env\n";
  fs.writeFileSync(path.join(dir, ".gitignore"), gitignore, "utf8");
  filesCreated.push(".gitignore");

  if (opts.language === "typescript") {
    scaffoldTypeScript(dir, opts, filesCreated);
  } else if (opts.language === "rust") {
    scaffoldRustVsa(dir, opts, filesCreated);
  } else {
    scaffoldBash(dir, opts, filesCreated);
  }

  const readme = `# ${opts.name}\n\n${opts.description ?? "Herdr plugin."}\n\n## Architecture (VSA)\nThis plugin follows Vertical Slice Architecture (VSA):\n- \`src/main.rs\`: Composition root & CLI dispatch\n- \`src/shared/\`: Kernel / shared types and Herdr client\n- \`src/slices/\`: Isolated feature slices\n\n## Local Testing\n\`\`\`bash\nherdr plugin link .\nherdr plugin action list --plugin ${opts.id}\n\`\`\`\n`;
  fs.writeFileSync(path.join(dir, "README.md"), readme, "utf8");
  filesCreated.push("README.md");

  return { filesCreated };
}

function generateManifest(opts: ScaffoldOptions): string {
  const desc = opts.description ? `description = "${opts.description}"\n` : "";
  let body = "";

  if (opts.language === "typescript") {
    body = `[[build]]
command = ["npm", "ci"]

[[build]]
command = ["npm", "run", "build"]

[[actions]]
id = "hello"
title = "Hello Action"
contexts = ["workspace"]
command = ["node", "dist/index.js"]
`;
  } else if (opts.language === "rust") {
    const binName = opts.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    body = `[[build]]
command = ["cargo", "build", "--release"]

[[actions]]
id = "notify"
title = "Quick Notify"
contexts = ["workspace"]
command = ["target/release/${binName}", "notify"]

[[panes]]
id = "dashboard"
title = "${opts.name} Dashboard"
placement = "popup"
width = "70%"
height = 16
command = ["target/release/${binName}", "dashboard"]
`;
  } else {
    body = `[[actions]]
id = "hello"
title = "Hello Action"
contexts = ["workspace"]
command = ["sh", "action.sh"]
platforms = ["linux", "macos"]
`;
  }

  return `id = "${opts.id}"
name = "${opts.name}"
version = "0.1.0"
min_herdr_version = "0.7.0"
${desc}platforms = ["linux", "macos", "windows"]

${body}`;
}

function scaffoldTypeScript(dir: string, opts: ScaffoldOptions, filesCreated: string[]): void {
  const pkg = {
    name: opts.id.replace(/[^a-zA-Z0-9_-]/g, "-"),
    version: "0.1.0",
    type: "module",
    scripts: {
      build: "tsc",
      watch: "tsc -w",
    },
    devDependencies: {
      "@types/node": "^22.0.0",
      typescript: "^5.5.0",
    },
  };
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf8");
  filesCreated.push("package.json");

  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      outDir: "dist",
      rootDir: "src",
      strict: true,
      skipLibCheck: true,
    },
    include: ["src/**/*"],
  };
  fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n", "utf8");
  filesCreated.push("tsconfig.json");

  const srcDir = path.join(dir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  const indexTs = `import { spawnSync } from "node:child_process";

const herdrBin = process.env.HERDR_BIN_PATH ?? "herdr";
const rawContext = process.env.HERDR_PLUGIN_CONTEXT_JSON;
const context = rawContext ? JSON.parse(rawContext) : {};

console.log("Invoked action from pane:", process.env.HERDR_PANE_ID);

// Example: notify Herdr
spawnSync(herdrBin, ["notification", "show", "${opts.name}", "--body", "Action executed!"], {
  stdio: "inherit",
});
`;
  fs.writeFileSync(path.join(srcDir, "index.ts"), indexTs, "utf8");
  filesCreated.push("src/index.ts");
}

function scaffoldRustVsa(dir: string, opts: ScaffoldOptions, filesCreated: string[]): void {
  const binName = opts.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cargoToml = `[package]
name = "${binName}"
version = "0.1.0"
edition = "2021"

[dependencies]
ratatui = { version = "0.30", features = ["all-widgets"] }
crossterm = { version = "0.28", features = ["event-stream"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
  fs.writeFileSync(path.join(dir, "Cargo.toml"), cargoToml, "utf8");
  filesCreated.push("Cargo.toml");

  const srcDir = path.join(dir, "src");
  const sharedDir = path.join(srcDir, "shared");
  const slicesDir = path.join(srcDir, "slices");
  const dashboardDir = path.join(slicesDir, "dashboard");
  const notifyDir = path.join(slicesDir, "notify");

  fs.mkdirSync(sharedDir, { recursive: true });
  fs.mkdirSync(dashboardDir, { recursive: true });
  fs.mkdirSync(notifyDir, { recursive: true });

  // 1. src/main.rs (Composition Root)
  const mainRs = `mod shared;
mod slices;

use std::env;
use std::io;

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("dashboard");

    match command {
        "dashboard" => slices::dashboard::run_popup()?,
        "notify" => slices::notify::run_action()?,
        unknown => eprintln!("Unknown command: {}", unknown),
    }

    Ok(())
}
`;
  fs.writeFileSync(path.join(srcDir, "main.rs"), mainRs, "utf8");
  filesCreated.push("src/main.rs");

  // 2. src/shared/mod.rs
  const sharedMod = `pub mod client;
pub mod context;
`;
  fs.writeFileSync(path.join(sharedDir, "mod.rs"), sharedMod, "utf8");
  filesCreated.push("src/shared/mod.rs");

  // 3. src/shared/client.rs
  const sharedClient = `use std::env;
use std::process::Command;

pub struct HerdrClient {
    bin: String,
}

impl HerdrClient {
    pub fn new() -> Self {
        Self {
            bin: env::var("HERDR_BIN_PATH").unwrap_or_else(|_| "herdr".to_string()),
        }
    }

    pub fn notify(&self, title: &str, body: &str) {
        let _ = Command::new(&self.bin)
            .args(["notification", "show", title, "--body", body])
            .status();
    }
}
`;
  fs.writeFileSync(path.join(sharedDir, "client.rs"), sharedClient, "utf8");
  filesCreated.push("src/shared/client.rs");

  // 4. src/shared/context.rs
  const sharedContext = `use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize, Serialize, Default)]
pub struct HerdrContext {
    pub workspace_id: Option<String>,
    pub tab_id: Option<String>,
    pub pane_id: Option<String>,
    pub invocation_source: Option<String>,
}

impl HerdrContext {
    pub fn from_env() -> Self {
        match env::var("HERDR_PLUGIN_CONTEXT_JSON") {
            Ok(json_str) => serde_json::from_str(&json_str).unwrap_or_default(),
            Err(_) => HerdrContext::default(),
        }
    }
}
`;
  fs.writeFileSync(path.join(sharedDir, "context.rs"), sharedContext, "utf8");
  filesCreated.push("src/shared/context.rs");

  // 5. src/slices/mod.rs
  const slicesMod = `pub mod dashboard;
pub mod notify;
`;
  fs.writeFileSync(path.join(slicesDir, "mod.rs"), slicesMod, "utf8");
  filesCreated.push("src/slices/mod.rs");

  // 6. src/slices/notify/mod.rs
  const notifyMod = `use crate::shared::client::HerdrClient;
use crate::shared::context::HerdrContext;
use std::env;
use std::io;

pub fn run_action() -> io::Result<()> {
    let client = HerdrClient::new();
    let ctx = HerdrContext::from_env();
    let pane_id = env::var("HERDR_PANE_ID").unwrap_or_else(|_| "unknown".to_string());

    let body = format!("Pane: {} | WS: {:?}", pane_id, ctx.workspace_id);
    client.notify("${opts.name}", &body);
    println!("[Notify Slice] Notified: {}", body);
    Ok(())
}
`;
  fs.writeFileSync(path.join(notifyDir, "mod.rs"), notifyMod, "utf8");
  filesCreated.push("src/slices/notify/mod.rs");

  // 7. src/slices/dashboard/mod.rs (Ratatui Popup)
  const dashboardMod = `use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    style::{Color, Style},
    widgets::{Block, Clear, Paragraph},
    Terminal,
};
use std::env;
use std::io::{self, stdout};

pub fn run_popup() -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let pane_id = env::var("HERDR_PANE_ID").unwrap_or_else(|_| "unknown".to_string());

    loop {
        terminal.draw(|f| {
            let area = f.area();
            let block = Block::bordered()
                .title(" ${opts.name} (Press 'q' to exit) ")
                .border_style(Style::default().fg(Color::Cyan));
            let content = Paragraph::new(format!("Host Pane: {}\\nReady for agent operations.\\n[Vertical Slice Architecture]", pane_id))
                .block(block);

            f.render_widget(Clear, area);
            f.render_widget(content, area);
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
`;
  fs.writeFileSync(path.join(dashboardDir, "mod.rs"), dashboardMod, "utf8");
  filesCreated.push("src/slices/dashboard/mod.rs");
}

function scaffoldBash(dir: string, opts: ScaffoldOptions, filesCreated: string[]): void {
  const sh = `#!/usr/bin/env sh
HERDR="\${HERDR_BIN_PATH:-herdr}"
echo "Bash plugin executed from pane: \${HERDR_PANE_ID:-unknown}"
"$HERDR" notification show "${opts.name}" --body "Action executed from Bash!"
`;
  fs.writeFileSync(path.join(dir, "action.sh"), sh, "utf8");
  filesCreated.push("action.sh");
}

export function validateHerdrManifest(manifestContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const hasField = (field: string): boolean => {
    const lines = manifestContent.split("\n");
    return lines.some((l) => {
      const trimmed = l.trim();
      return (
        trimmed.startsWith(`${field} =`) ||
        trimmed.startsWith(`${field}=`) ||
        trimmed.startsWith(`${field}  =`)
      );
    });
  };

  const requiredFields = ["id", "name", "version", "min_herdr_version"];
  for (const field of requiredFields) {
    if (!hasField(field)) {
      errors.push(`Missing required top-level field: '${field}'`);
    }
  }

  const idMatch = manifestContent.match(/^\s*id\s*=\s*["']([^"']+)["']/m);
  if (idMatch && !/^[a-zA-Z0-9._:-]+$/.test(idMatch[1])) {
    errors.push(`Invalid 'id' format: '${idMatch[1]}'. Allowed chars: letters, digits, '.', ':', '_', '-'`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
