# TypeScript / Node.js Herdr Plugin Guide

## 1. Directory Structure

```text
my-ts-plugin/
├── herdr-plugin.toml
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── herdr-client.ts
    └── actions/
        └── dev-split.ts
```

## 2. Manifest (`herdr-plugin.toml`)

```toml
id = "acme.dev-tools"
name = "Dev Tools"
version = "0.1.0"
min_herdr_version = "0.7.0"
platforms = ["linux", "macos", "windows"]

[[build]]
command = ["npm", "ci"]

[[build]]
command = ["npm", "run", "build"]

[[actions]]
id = "dev-split"
title = "Split Workspace For Dev"
command = ["node", "dist/actions/dev-split.js"]
```

## 3. Package Configuration (`package.json`)

```json
{
  "name": "herdr-plugin-dev-tools",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0"
  }
}
```

## 4. Helper Client (`src/herdr-client.ts`)

```typescript
import { spawnSync, type SpawnSyncReturns } from "node:child_process";

export interface HerdrContext {
  workspace_id?: string;
  tab_id?: string;
  pane_id?: string;
  invocation_source?: string;
  agent?: {
    name?: string;
    kind?: string;
    status?: string;
  };
}

export class HerdrClient {
  private readonly bin: string;

  constructor() {
    this.bin = process.env.HERDR_BIN_PATH ?? "herdr";
  }

  public getContext(): HerdrContext {
    const raw = process.env.HERDR_PLUGIN_CONTEXT_JSON;
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public run<T = unknown>(args: string[]): T {
    const res: SpawnSyncReturns<string> = spawnSync(this.bin, [...args, "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (res.status !== 0) {
      throw new Error(`herdr ${args.join(" ")} failed: ${res.stderr || res.stdout}`);
    }

    try {
      return JSON.parse(res.stdout);
    } catch {
      return res.stdout as unknown as T;
    }
  }

  public splitPane(direction: "right" | "down", cwd?: string): { pane_id: string } {
    const args = ["pane", "split", "--direction", direction];
    if (cwd) args.push("--cwd", cwd);
    const resp = this.run<{ result: { pane: { pane_id: string } } }>(args);
    return resp.result.pane;
  }

  public notify(title: string, body?: string): void {
    const args = ["notification", "show", title];
    if (body) args.push("--body", body);
    this.run(args);
  }
}
```

## 5. Action Script (`src/actions/dev-split.ts`)

```typescript
import { HerdrClient } from "../herdr-client.js";

async function main(): Promise<void> {
  const herdr = new HerdrClient();
  const ctx = herdr.getContext();

  // Split current pane to the right
  const newPane = herdr.splitPane("right");

  // Send notification
  herdr.notify("Layout Applied", `Opened sibling pane: ${newPane.pane_id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
