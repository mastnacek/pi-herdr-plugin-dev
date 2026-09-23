import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffoldHerdrPlugin, validateHerdrManifest } from "../src/scaffold.js";

test("validateHerdrManifest detects valid and invalid manifests", () => {
  const valid = `
id = "example.test"
name = "Test"
version = "0.1.0"
min_herdr_version = "0.7.0"
`;
  const res1 = validateHerdrManifest(valid);
  assert.equal(res1.valid, true);
  assert.equal(res1.errors.length, 0);

  const missingName = `
id = "example.test"
version = "0.1.0"
min_herdr_version = "0.7.0"
`;
  const res2 = validateHerdrManifest(missingName);
  assert.equal(res2.valid, false);
  assert.match(res2.errors[0], /name/);

  const invalidId = `
id = "example/test with spaces"
name = "Test"
version = "0.1.0"
min_herdr_version = "0.7.0"
`;
  const res3 = validateHerdrManifest(invalidId);
  assert.equal(res3.valid, false);
  assert.match(res3.errors[0], /Invalid 'id'/);
});

test("scaffoldHerdrPlugin creates Rust, TypeScript and Bash plugins", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "herdr-test-"));

  try {
    // 1. TypeScript
    const tsTarget = path.join(tmpDir, "ts-plugin");
    const tsRes = scaffoldHerdrPlugin({
      targetDir: tsTarget,
      id: "acme.ts-tool",
      name: "TS Tool",
      language: "typescript",
    });
    assert.ok(fs.existsSync(path.join(tsTarget, "herdr-plugin.toml")));
    assert.ok(fs.existsSync(path.join(tsTarget, "package.json")));
    assert.ok(fs.existsSync(path.join(tsTarget, "src", "index.ts")));
    assert.ok(tsRes.filesCreated.includes("src/index.ts"));

    // 2. Rust
    const rustTarget = path.join(tmpDir, "rust-plugin");
    const rustRes = scaffoldHerdrPlugin({
      targetDir: rustTarget,
      id: "acme.rust-tool",
      name: "Rust Tool",
      language: "rust",
    });
    assert.ok(fs.existsSync(path.join(rustTarget, "herdr-plugin.toml")));
    assert.ok(fs.existsSync(path.join(rustTarget, "Cargo.toml")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "main.rs")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "shared", "mod.rs")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "shared", "client.rs")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "shared", "context.rs")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "slices", "mod.rs")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "slices", "dashboard", "mod.rs")));
    assert.ok(fs.existsSync(path.join(rustTarget, "src", "slices", "notify", "mod.rs")));
    assert.ok(rustRes.filesCreated.includes("src/main.rs"));

    // 3. Bash
    const bashTarget = path.join(tmpDir, "bash-plugin");
    const bashRes = scaffoldHerdrPlugin({
      targetDir: bashTarget,
      id: "acme.bash-tool",
      name: "Bash Tool",
      language: "bash",
    });
    assert.ok(fs.existsSync(path.join(bashTarget, "herdr-plugin.toml")));
    assert.ok(fs.existsSync(path.join(bashTarget, "action.sh")));
    assert.ok(bashRes.filesCreated.includes("action.sh"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
