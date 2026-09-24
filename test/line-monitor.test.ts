/**
 * Line monitor tests — per-file source length checks backing the
 * edit/write tool_result rejection hook.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkFileLines, countLines, formatLineLimitCheck } from "../src/line-monitor.js";

function tmpFile(name: string, lines: number): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "herdr-line-monitor-"));
  const filePath = path.join(dir, name);
  const body = Array.from({ length: lines }, (_, i) => `line ${i}`).join("\n") + "\n";
  fs.writeFileSync(filePath, body, "utf8");
  return filePath;
}

test("countLines counts physical lines without trailing-newline artifact", () => {
  assert.equal(countLines(""), 0);
  assert.equal(countLines("a\nb\n"), 2);
  assert.equal(countLines("a\r\nb\r\n"), 2);
});

test("file over the hard limit is rejected with split instructions", () => {
  const check = checkFileLines(tmpFile("big.rs", 401), 400);
  assert.equal(check.checked, true);
  assert.equal(check.level, "exceeded");
  const notice = formatLineLimitCheck(check);
  assert.ok(notice?.includes("Line limit exceeded"));
  assert.ok(notice?.includes("Do NOT retry the same oversized file unchanged"));
});

test("file between soft target and hard limit gets an advisory", () => {
  const check = checkFileLines(tmpFile("medium.go", 350), 400);
  assert.equal(check.level, "warn");
  assert.ok(formatLineLimitCheck(check)?.includes("advisory"));
});

test("small file and non-source files produce no notice", () => {
  assert.equal(checkFileLines(tmpFile("small.ts", 100), 400).level, "ok");
  assert.equal(checkFileLines(tmpFile("notes.md", 900), 400).checked, false);
  assert.equal(formatLineLimitCheck(checkFileLines(tmpFile("small.ts", 100), 400)), null);
});
