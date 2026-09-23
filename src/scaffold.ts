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
    scaffoldRust(dir, opts, filesCreated);
  } else {
    scaffoldBash(dir, opts, filesCreated);
  }

  const readme = `# ${opts.name}\n\n${opts.description ?? "Herdr plugin."}\n\n## Local Testing\n\`\`\`bash\nherdr plugin link .\nherdr plugin action list --plugin ${opts.id}\n\`\`\`\n`;
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
    body = `[[build]]
command = ["cargo", "build", "--release"]

[[actions]]
id = "hello"
title = "Hello Action"
contexts = ["workspace"]
command = ["target/release/${opts.id.replace(/[^a-zA-Z0-9_-]/g, "_")}"]
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

function scaffoldRust(dir: string, opts: ScaffoldOptions, filesCreated: string[]): void {
  const binName = opts.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cargoToml = `[package]
name = "${binName}"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
  fs.writeFileSync(path.join(dir, "Cargo.toml"), cargoToml, "utf8");
  filesCreated.push("Cargo.toml");

  const srcDir = path.join(dir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  const mainRs = `use std::env;
use std::process::Command;

fn main() {
    let herdr_bin = env::var("HERDR_BIN_PATH").unwrap_or_else(|_| "herdr".to_string());
    let pane_id = env::var("HERDR_PANE_ID").unwrap_or_else(|_| "unknown".to_string());

    println!("Rust plugin invoked from pane: {}", pane_id);

    let _ = Command::new(herdr_bin)
        .args(["notification", "show", "${opts.name}", "--body", "Action executed from Rust!"])
        .status();
}
`;
  fs.writeFileSync(path.join(srcDir, "main.rs"), mainRs, "utf8");
  filesCreated.push("src/main.rs");
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
