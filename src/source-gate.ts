/**
 * Consult-before-edit gate for Herdr plugin projects: an edit/write
 * `tool_call` on source files inside a Herdr plugin project (directory with
 * `herdr-plugin.toml`) is rejected (`block: true`) until the bundled Herdr
 * documentation or the herdr-plugin-dev skill has been read this session.
 *
 * Scope protection: files outside a Herdr plugin project are never gated, so
 * the extension can stay globally installed without nagging unrelated work.
 */

import fs from "node:fs";
import path from "node:path";
import { isMonitoredSourcePath } from "./line-monitor.js";

/** Max ancestor levels scanned for `herdr-plugin.toml`. */
const MAX_ANCESTOR_DEPTH = 10;

/**
 * Returns the Herdr plugin project root for a file (nearest ancestor —
 * including the file's own directory — containing `herdr-plugin.toml`),
 * or `null` when the file is not inside a Herdr plugin project.
 */
export function findHerdrRoot(filePath: string): string | null {
	let dir = path.dirname(path.resolve(filePath));
	for (let depth = 0; depth <= MAX_ANCESTOR_DEPTH; depth += 1) {
		if (fs.existsSync(path.join(dir, "herdr-plugin.toml"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}

/**
 * True when a read-ish tool call targets bundled Herdr documentation:
 * the `docs/herdr/` folder of any project, or any file inside the
 * `herdr-plugin-dev` skill directory (SKILL.md, references).
 */
export function isHerdrDocsPath(resolvedPath: string): boolean {
	const norm = resolvedPath.replace(/\\/g, "/").toLowerCase();
	if (norm.includes("/docs/herdr/")) return true;
	return norm.includes("herdr-plugin-dev") && norm.endsWith(".md");
}

/** True when the edit target is a Herdr source file the docs gate applies to. */
export function isGatedHerdrEditTarget(resolvedPath: string): boolean {
	if (!isMonitoredSourcePath(resolvedPath)) return false;
	return findHerdrRoot(resolvedPath) !== null;
}

/** Block reason for the Herdr docs gate. */
export function buildHerdrDocsGateReason(filePath: string): string {
	return [
		`HERDR DOCS BEFORE EDIT: '${path.basename(filePath)}' is Herdr plugin source, but no bundled Herdr documentation has been read this session.`,
		"Do NOT retry this edit unchanged — it will be rejected again.",
		"Mandatory step first: read the herdr-plugin-dev skill entry point (SKILL.md)",
		"or the bundled docs under this project ('docs/herdr/*.md' — manifest rules, socket API),",
		"then re-run this edit.",
	].join(" ");
}
