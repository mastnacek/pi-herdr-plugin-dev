import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import fs from "node:fs";
import path from "node:path";
import { checkFileLines, formatLineLimitCheck } from "./src/line-monitor.js";
import { scaffoldHerdrPlugin, validateHerdrManifest } from "./src/scaffold.js";

/** Hard per-file line limit for monitored source files (src/line-monitor.ts). */
const MAX_FILE_LINES = 400;

export default function (pi: ExtensionAPI): void {
  /** Unsubscribers from every `pi.on()`; drained on session_shutdown. */
  const unsubscribers: Array<() => void> = [];
  const track = (result: unknown): void => {
    if (typeof result === "function") unsubscribers.push(result as () => void);
  };

  // 0. Source file line limit — prompt guideline + edit/write rejection
  track(
    pi.on("before_agent_start", (event) => {
      if (!event.systemPromptOptions?.promptGuidelines) return;
      event.systemPromptOptions.promptGuidelines.push(
        `SOURCE FILE LENGTH LIMIT: Source code files (.ts, .js, .rs, .go, .py, …) must stay at or below ${MAX_FILE_LINES} lines ` +
          `(soft target ${Math.floor(MAX_FILE_LINES * 0.75)}). If an edit or write is rejected with '[Line limit exceeded]', ` +
          "do NOT retry the same file unchanged — extract cohesive sections (classes, function groups, constants, types) " +
          "into new modules in the same folder and import them, then re-run the edit.",
      );
    }),
  );

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
  // 1. Tool: herdr_scaffold_plugin
  pi.registerTool({
    name: "herdr_scaffold_plugin",
    label: "Herdr: Scaffold Plugin",
    description: "Generate a complete starter template for a Herdr multiplexer plugin in Rust, TypeScript, or Bash.",
    promptSnippet: "Use herdr_scaffold_plugin to create a new Herdr plugin project.",
    promptGuidelines: [
      "Call herdr_scaffold_plugin when user wants to scaffold or initialize a new Herdr plugin.",
    ],
    parameters: Type.Object({
      targetDir: Type.String({ description: "Target directory path for the plugin" }),
      id: Type.String({ description: "Unique plugin identifier, e.g. 'my-org.my-tool'" }),
      name: Type.String({ description: "Human readable plugin name, e.g. 'My Tool'" }),
      language: StringEnum(["rust", "typescript", "bash"] as const, {
        description: "Implementation language for the plugin",
      }),
      description: Type.Optional(Type.String({ description: "Short description of the plugin" })),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const result = scaffoldHerdrPlugin({
          targetDir: params.targetDir,
          id: params.id,
          name: params.name,
          language: params.language,
          description: params.description,
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully created Herdr plugin '${params.name}' (${params.id}) in ${params.targetDir}\nFiles created:\n- ${result.filesCreated.join("\n- ")}\n\nNext steps:\n1. cd ${params.targetDir}\n2. herdr plugin link .`,
            },
          ],
          details: { ...result, targetDir: params.targetDir, id: params.id },
        };
      } catch (err: unknown) {
        throw new Error(`Failed to scaffold Herdr plugin: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  // 2. Tool: herdr_validate_manifest
  pi.registerTool({
    name: "herdr_validate_manifest",
    label: "Herdr: Validate Manifest",
    description: "Validate a herdr-plugin.toml file against Herdr plugin requirements.",
    promptSnippet: "Use herdr_validate_manifest to verify a herdr-plugin.toml manifest.",
    promptGuidelines: [
      "Call herdr_validate_manifest when inspecting or auditing a Herdr plugin manifest.",
    ],
    parameters: Type.Object({
      path: Type.String({ description: "Path to herdr-plugin.toml or directory containing it" }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        let manifestPath = path.resolve(params.path);
        if (fs.existsSync(manifestPath) && fs.statSync(manifestPath).isDirectory()) {
          manifestPath = path.join(manifestPath, "herdr-plugin.toml");
        }

        if (!fs.existsSync(manifestPath)) {
          throw new Error(`Manifest not found at: ${manifestPath}`);
        }

        const content = fs.readFileSync(manifestPath, "utf8");
        const validation = validateHerdrManifest(content);

        if (!validation.valid) {
          return {
            content: [
              {
                type: "text",
                text: `Manifest validation failed with ${validation.errors.length} error(s):\n- ${validation.errors.join("\n- ")}`,
              },
            ],
            details: { valid: false, errors: validation.errors, path: manifestPath },
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Manifest at ${manifestPath} is valid for Herdr.`,
            },
          ],
          details: { valid: true, errors: [], path: manifestPath },
        };
      } catch (err: unknown) {
        throw new Error(`Validation error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  // 3. Slash command: /herdr-plugin
  pi.registerCommand("herdr-plugin", {
    description: "Manage and scaffold Herdr plugins (scaffold | validate | docs)",
    getArgumentCompletions: (prefix) => {
      const tokens = prefix.trimStart().split(/\s+/);
      const trailingSpace = prefix.endsWith(" ");

      if (tokens.length === 0 || (tokens.length === 1 && !trailingSpace)) {
        const query = tokens[0]?.toLowerCase() ?? "";
        const commands = [
          { key: "scaffold", desc: "Scaffold a new Herdr plugin" },
          { key: "validate", desc: "Validate herdr-plugin.toml in current directory" },
          { key: "docs", desc: "Show local Herdr plugin documentation" },
        ];

        return commands
          .filter((c) => c.key.startsWith(query))
          .map((c) => ({
            value: `${c.key} `,
            label: c.key,
            description: c.desc,
          }));
      }

      if (tokens[0] === "scaffold" && (tokens.length === 1 || (tokens.length === 2 && !trailingSpace))) {
        const langs = ["rust", "typescript", "bash"];
        const q = tokens[1]?.toLowerCase() ?? "";
        return langs
          .filter((l) => l.startsWith(q))
          .map((l) => ({
            value: `scaffold ${l}`,
            label: l,
            description: `Scaffold a Herdr plugin in ${l}`,
          }));
      }

      return null;
    },
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const sub = parts[0]?.toLowerCase();

      if (sub === "validate") {
        const manifestPath = path.resolve("herdr-plugin.toml");
        if (!fs.existsSync(manifestPath)) {
          if (ctx.hasUI) {
            ctx.ui.notify("No herdr-plugin.toml found in current directory.", "error");
          }
          return;
        }
        const validation = validateHerdrManifest(fs.readFileSync(manifestPath, "utf8"));
        if (validation.valid) {
          if (ctx.hasUI) {
            ctx.ui.notify("herdr-plugin.toml is valid!", "info");
          }
        } else {
          if (ctx.hasUI) {
            ctx.ui.notify(`Invalid manifest: ${validation.errors.join("; ")}`, "error");
          }
        }
        return;
      }

      if (sub === "docs") {
        if (ctx.hasUI) {
          ctx.ui.notify("Herdr docs available in skills/herdr-plugin-dev/references/", "info");
        }
        return;
      }

      if (sub === "scaffold") {
        const lang = (parts[1]?.toLowerCase() as "rust" | "typescript" | "bash") || "typescript";
        const dir = parts[2] || "./my-herdr-plugin";
        const id = parts[3] || "custom.herdr-tool";
        scaffoldHerdrPlugin({
          targetDir: dir,
          id,
          name: "Custom Herdr Tool",
          language: lang,
          description: "Scaffolded with pi-herdr-plugin-dev",
        });
        if (ctx.hasUI) {
          ctx.ui.notify(`Scaffolded ${lang} plugin in ${dir}`, "info");
        }
        return;
      }

      if (ctx.hasUI) {
        ctx.ui.notify("Usage: /herdr-plugin scaffold <rust|typescript|bash> [dir] [id] | validate | docs", "info");
      }
    },
  });

  // Lifecycle: release listeners so /reload cannot accumulate duplicates.
  pi.on("session_shutdown", () => {
    while (unsubscribers.length > 0) {
      unsubscribers.pop()?.();
    }
  });
}
