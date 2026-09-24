/**
 * Herdr consult-before-edit gate tests — Herdr project detection, docs-path
 * recognition and block-reason building. Gate state lives in index.ts.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildHerdrDocsGateReason,
  findHerdrRoot,
  isGatedHerdrEditTarget,
  isHerdrDocsPath,
} from "../src/source-gate.js";

function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "herdr-gate-"));
  fs.writeFileSync(path.join(dir, "herdr-plugin.toml"), "id = \"x\"\n", "utf8");
  return dir;
}

test("findHerdrRoot walks up to herdr-plugin.toml and stops at filesystem root", () => {
  const root = tmpProject();
  const src = path.join(root, "src", "plugin.ts");
  fs.mkdirSync(path.dirname(src), { recursive: true });
  fs.writeFileSync(src, "export {}\n", "utf8");
  assert.equal(findHerdrRoot(src), root);
  assert.equal(findHerdrRoot(path.join(os.tmpdir(), "definitely-missing.ts")), null);
});

test("isHerdrDocsPath recognizes docs/herdr and herdr-plugin-dev skill files", () => {
  assert.equal(isHerdrDocsPath("D:\\proj\\docs\\herdr\\socket-api.md"), true);
  assert.equal(isHerdrDocsPath("D:\\x\\skills\\herdr-plugin-dev\\SKILL.md"), true);
  assert.equal(isHerdrDocsPath("D:\\x\\skills\\herdr-plugin-dev\\references\\api.md"), true);
  assert.equal(isHerdrDocsPath("D:\\proj\\README.md"), false);
  assert.equal(isHerdrDocsPath("D:\\proj\\src\\plugin.ts"), false);
});

test("gate applies only to source files inside a Herdr project", () => {
  const root = tmpProject();
  const src = path.join(root, "plugin.ts");
  fs.writeFileSync(src, "export {}\n", "utf8");
  assert.equal(isGatedHerdrEditTarget(src), true);
  assert.equal(isGatedHerdrEditTarget(path.join(root, "README.md")), false);
  assert.equal(isGatedHerdrEditTarget(path.join(os.tmpdir(), "random.ts")), false);
  const nested = path.join(root, "node_modules", "dep.ts");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  assert.equal(isGatedHerdrEditTarget(nested), false);
});

test("block reason is actionable and self-describing", () => {
  const reason = buildHerdrDocsGateReason("C:\\p\\plugin.rs");
  assert.match(reason, /HERDR DOCS BEFORE EDIT/);
  assert.match(reason, /docs\/herdr/);
  assert.match(reason, /SKILL\.md/);
});
