/**
 * Guard hooks — source-file line limit + Herdr-docs-before-edit gates.
 *
 * Extracted from index.ts so the composition root stays thin and the package
 * follows the reference architecture (src/ modules + hooks/ subfolder,
 * mirroring pi-plugin-dev).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { checkFileLines, formatLineLimitCheck } from "../line-monitor.js";
import {
  buildHerdrDocsGateReason,
  isGatedHerdrEditTarget,
  isHerdrDocsPath,
} from "../source-gate.js";

/** Hard per-file line limit for monitored source files. */
export const MAX_FILE_LINES = 400;

export interface GuardHookHandle {
  /** Clears session gate state (call from session_start). */
  reset(): void;
}

/**
 * Registers the before_agent_start guidelines, the docs gate on `tool_call`
 * and the line-limit rejection on `tool_result`.
 *
 * `track` stores every unsubscribe so the composition root keeps a single
 * drain point for session_shutdown.
 */
export function registerGuardHooks(
  pi: ExtensionAPI,
  track: (result: unknown) => void,
): GuardHookHandle {
  /** True once bundled Herdr docs were read this session (docs gate state). */
  let herdrDocsRead = false;

  track(
    pi.on("before_agent_start", (event) => {
      if (!event.systemPromptOptions?.promptGuidelines) return;
      event.systemPromptOptions.promptGuidelines.push(
        `SOURCE FILE LENGTH LIMIT: Source code files (.ts, .js, .rs, .go, .py, …) must stay at or below ${MAX_FILE_LINES} lines ` +
          `(soft target ${Math.floor(MAX_FILE_LINES * 0.75)}). If an edit or write is rejected with '[Line limit exceeded]', ` +
          "do NOT retry the same file unchanged — extract cohesive sections (classes, function groups, constants, types) " +
          "into new modules in the same folder and import them, then re-run the edit.",
      );
      event.systemPromptOptions.promptGuidelines.push(
        "HERDR DOCS BEFORE EDIT (ENFORCED): when editing source files inside a Herdr plugin project (directory with herdr-plugin.toml), " +
          "the edit is rejected until the Herdr documentation has been read this session — " +
          "the herdr-plugin-dev skill (SKILL.md) or the bundled 'docs/herdr/*.md'. If an edit is rejected with " +
          "'HERDR DOCS BEFORE EDIT', read the docs first, then retry.",
      );
    }),
  );

  track(
    pi.on("session_start", () => {
      herdrDocsRead = false; // new session → docs gate re-arms
    }),
  );

  // Consult-before-edit gate — Herdr docs must be read before editing plugin source
  track(
    pi.on("tool_call", (event) => {
      const rawName = event.toolName || "";
      const baseToolName = rawName.includes("__") ? rawName.split("__").pop()! : rawName;
      const input = event.input as { path?: string; file?: string } | undefined;
      const docPath =
        typeof input?.path === "string" ? input.path : typeof input?.file === "string" ? input.file : undefined;

      // Record doc reads from any read-ish tool before any early return.
      if (docPath && baseToolName !== "edit" && baseToolName !== "write" && isHerdrDocsPath(path.resolve(docPath))) {
        herdrDocsRead = true;
      }

      if (baseToolName !== "edit" && baseToolName !== "write") return;
      if (herdrDocsRead) return;

      const targetPath = docPath;
      if (!targetPath) return;
      const resolved = path.resolve(targetPath);
      if (!isGatedHerdrEditTarget(resolved)) return;

      return { block: true, reason: buildHerdrDocsGateReason(resolved) };
    }),
  );

  // Source file line limit — edit/write rejection
  track(
    pi.on("tool_result", (event) => {
      const rawName = event.toolName || "";
      const baseToolName = rawName.includes("__") ? rawName.split("__").pop()! : rawName;
      if (baseToolName !== "edit" && baseToolName !== "write") return;
      if (event.isError) return;

      const targetPath = (event.input as { path?: string } | undefined)?.path;
      if (!targetPath) return;

      const check = checkFileLines(path.resolve(targetPath), MAX_FILE_LINES);
      const notice = formatLineLimitCheck(check);
      if (!notice) return;

      if (check.level === "exceeded") {
        return {
          content: [...event.content, { type: "text", text: notice }],
          isError: true,
        };
      }
      return { content: [...event.content, { type: "text", text: notice }] };
    }),
  );

  return {
    reset: () => {
      herdrDocsRead = false;
    },
  };
}
