/**
 * EARS Spec Engine — pi extension
 *
 * Implements the Kiro-inspired Spec-Driven Development workflow with
 * EARS (Easy Approach to Requirements Syntax) notation.
 *
 * Features:
 * - /ears:quick-plan — Fast-track: clarify + generate all 3 docs in one pass
 * - /ears:spec      — Phase 1: Generate EARS requirements from a prompt
 * - /ears:analyze   — Analyze requirements for conflicts/ambiguities
 * - /ears:design    — Phase 2: Generate design document from requirements
 * - /ears:tasks     — Phase 3: Generate task breakdown with dependency analysis
 * - /ears:status    — Show current spec engine state
 * - ears_validate   — Tool: validate EARS grammar
 * - ears_analyze    — Tool: analyze requirements for issues
 * - ears_analyze_deps — Tool: analyze task dependency graph
 *
 * Nested skill: ears-spec — loaded via resources_discover
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const EXT_DIR = dirname(fileURLToPath(import.meta.url));

import type { EarsPattern, SpecEngineState } from "./lib/types.js";
import {
	EARS_PATTERNS,
	analyzeRequirements,
	formatAnalysisReport,
	validateEarsGrammar,
} from "./lib/ears.js";
import {
	renderClarifyingQuestions,
	analyzeDependencies,
} from "./lib/templates.js";

export default function earsSpecEngine(pi: ExtensionAPI): void {
	// ─── State ──────────────────────────────────────────────────────────────────
	const state: SpecEngineState = {
		projectRoot: process.cwd(),
		currentSpecsDir: "",
	};

	/** Find an existing specs directory by scanning .ears-spec/ */
	async function findSpecsDir(): Promise<string | null> {
		const earsDir = path.join(state.projectRoot, ".ears-spec");
		try {
			const entries = await fs.readdir(earsDir);
			const subdirs: string[] = [];
			for (const entry of entries) {
				const full = path.join(earsDir, entry);
				const stat = await fs.stat(full).catch(() => null);
				if (stat?.isDirectory()) subdirs.push(entry);
			}
			if (subdirs.length === 1) {
				state.currentSpecsDir = path.join(earsDir, subdirs[0]!);
				return state.currentSpecsDir;
			}
			if (subdirs.length > 1) {
				// Multiple spec dirs — return null to let command resolve ambiguity
				return null;
			}
		} catch {
			// .ears-spec directory doesn't exist yet
		}
		return null;
	}

	// ─── Register the nested skill ──────────────────────────────────────────────
	pi.on("resources_discover", async (_event, _ctx) => {
		return {
			skillPaths: [join(EXT_DIR, "skills")],
		};
	});

	// ─── Helper: update widget ────────────────────────────────────────────────
	function updateStatusWidget(ctx: ExtensionContext): void {
		if (state.requirements) {
			const totalReqs = state.requirements.stories.reduce(
				(s, st) => s + st.requirements.length,
				0,
			);
			const parts: string[] = [];
			parts.push(
				`📋 ${state.requirements.stories.length} stories, ${totalReqs} EARS reqs`,
			);
			if (state.lastAnalysis && state.lastAnalysis.length > 0) {
				const high = state.lastAnalysis.filter(
					(a) => a.severity === "high",
				).length;
				const medium = state.lastAnalysis.filter(
					(a) => a.severity === "medium",
				).length;
				parts.push(
					ctx.ui.theme.fg(
						high > 0 ? "error" : medium > 0 ? "warning" : "muted",
						`${high + medium} issue(s)`,
					),
				);
			}
			ctx.ui.setWidget("ears-spec", parts);
		} else {
			ctx.ui.setWidget("ears-spec", undefined);
		}
	}

	// ─── Custom Tools ──────────────────────────────────────────────────────────

	/**
	 * ears_validate — Validate EARS grammar for a list of requirements.
	 */
	pi.registerTool({
		name: "ears_validate",
		label: "EARS Validate",
		description:
			"Validate one or more EARS requirements against the 5 canonical patterns (Ubiquitous, Event-Driven, State-Driven, Optional, Complex). Returns grammar errors and pattern usage report.",
		promptSnippet: "Validate EARS requirements grammar",
		promptGuidelines: [
			"Use ears_validate after writing EARS requirements to check pattern compliance before presenting to the user.",
			"Use ears_validate before saving requirements.md to catch grammar errors early.",
		],
		parameters: Type.Object({
			requirements: Type.Array(
				Type.Object({
					id: Type.String({ description: "Requirement ID (e.g., REQ-001)" }),
					pattern: Type.Enum({
						ubiquitous: "ubiquitous",
						"event-driven": "event-driven",
						"state-driven": "state-driven",
						optional: "optional",
						complex: "complex",
					}),
					statement: Type.String({
						description: "The full EARS requirement statement",
					}),
				}),
				{ description: "Array of EARS requirements to validate" },
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const results: Array<{ id: string; valid: boolean; error?: string }> = [];
			const patternCount: Record<string, number> = {};

			for (const req of params.requirements) {
				const pattern = req.pattern as EarsPattern;
				patternCount[pattern] = (patternCount[pattern] || 0) + 1;
				const error = validateEarsGrammar({ ...req, pattern, storyId: req.id });
				results.push({ id: req.id, valid: !error, error: error || undefined });
			}

			// Check pattern diversity
			const patternSummary = Object.entries(patternCount)
				.map(([p, c]) => `${p}: ${c}`)
				.join(", ");

			const invalid = results.filter((r) => !r.valid);
			const report =
				invalid.length === 0
					? `✅ All ${results.length} requirements pass EARS grammar validation.\nPattern distribution: ${patternSummary}`
					: `❌ ${invalid.length}/${results.length} requirements have grammar errors:\n${invalid
							.map((r) => `  - ${r.id}: ${r.error}`)
							.join("\n")}\n\nPattern distribution: ${patternSummary}`;

			return {
				content: [{ type: "text", text: report }],
				details: { results, patternCount },
			};
		},
	});

	/**
	 * ears_analyze — Analyze requirements for conflicts and ambiguities.
	 */
	pi.registerTool({
		name: "ears_analyze",
		label: "EARS Analyze",
		description:
			"Analyze EARS requirements for logical conflicts, ambiguous language, incompleteness (missing edge cases), and redundancy. Produces a severity-ranked report.",
		promptSnippet: "Analyze EARS requirements for issues",
		promptGuidelines: [
			"Use ears_analyze after writing requirements to catch logical conflicts (two requirements contradicting each other), ambiguous terms ('appropriate', 'timely', etc.), and missing edge cases (error handling, validation, empty states).",
			"Always run ears_analyze before presenting requirements to the user for approval.",
		],
		parameters: Type.Object({
			requirements: Type.Array(
				Type.Object({
					id: Type.String(),
					pattern: Type.Enum({
						ubiquitous: "ubiquitous",
						"event-driven": "event-driven",
						"state-driven": "state-driven",
						optional: "optional",
						complex: "complex",
					}),
					statement: Type.String(),
					storyId: Type.String({
						description: "Story ID this requirement belongs to",
					}),
				}),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const typedReqs = params.requirements.map((r) => ({
				...r,
				pattern: r.pattern as EarsPattern,
			}));
			const issues = analyzeRequirements(typedReqs);

			const report = formatAnalysisReport(issues);
			return {
				content: [{ type: "text", text: report }],
				details: { issueCount: issues.length, issues },
			};
		},
	});

	/**
	 * ears_analyze_deps — Analyze task dependencies and generate execution waves.
	 */
	pi.registerTool({
		name: "ears_analyze_deps",
		label: "EARS Analyze Dependencies",
		description:
			"Analyze a list of spec tasks, build a dependency graph, and return optimal execution waves (parallel-friendly groups) and the critical path. Each wave can run independently; tasks within a wave that are marked as parallel can run concurrently.",
		promptSnippet: "Analyze task dependencies for parallel execution",
		promptGuidelines: [
			"Use ears_analyze_deps after creating the tasks list to find which tasks can run in parallel. Each wave represents tasks that can be executed together.",
			"The critical path is the longest chain of dependent tasks — this determines the minimum total implementation time.",
		],
		parameters: Type.Object({
			tasks: Type.Array(
				Type.Object({
					id: Type.String({ description: "Task identifier (e.g., T-001)" }),
					title: Type.String({ description: "Short task title" }),
					description: Type.String({ description: "Task description" }),
					requirementIds: Type.Array(Type.String()),
					dependencies: Type.Array(Type.String(), {
						description: "IDs of tasks this task depends on",
					}),
					parallel: Type.Boolean({
						description: "Whether this task can run in parallel with siblings",
					}),
				}),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const analysis = analyzeDependencies(params.tasks);

			const lines: string[] = [];
			lines.push(`## Dependency Analysis\n`);
			lines.push(`**Execution Waves:** ${analysis.waves.length}\n`);
			for (let w = 0; w < analysis.waves.length; w++) {
				const wave = analysis.waves[w];
				lines.push(
					`### Wave ${w}${w === 0 ? " (Foundation)" : w === analysis.waves.length - 1 ? " (Final)" : ""}`,
				);
				for (const task of wave) {
					const p = task.parallel ? " [P]" : "";
					lines.push(`- ${task.id}${p} — ${task.title}`);
				}
				lines.push("");
			}

			lines.push(`**Critical Path:** ${analysis.criticalPath.join(" → ")}`);
			lines.push(`**Minimum Waves (parallel):** ${analysis.waves.length}`);
			lines.push(`**Minimum Waves (serial):** ${params.tasks.length}`);

			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: {
					waves: analysis.waves.length,
					criticalPath: analysis.criticalPath,
				},
			};
		},
	});

	// ─── Commands ──────────────────────────────────────────────────────────────

	/**
	 * /ears:quick-plan — Fast-track: clarify + generate all 3 docs in one pass
	 */
	pi.registerCommand("ears:quick-plan", {
		description:
			"Quick Plan mode — clarify requirements, then generate requirements, design, and tasks in one pass (Kiro Quick Plan equivalent)",
		handler: async (args, ctx) => {
			if (!args || args.trim().length === 0) {
				ctx.ui.notify(
					"Usage: /ears:quick-plan <feature description>",
					"warning",
				);
				return;
			}

			pi.sendMessage(
				{
					customType: "ears-spec-quick-plan",
					content: `[EARS QUICK PLAN MODE]

I need to spec out: **${args.trim()}**

Before generating, let me ask clarifying questions.

${renderClarifyingQuestions(args.trim())
	.map((q, i) => `${i + 1}. ${q}`)
	.join("\n")}

After I get your answers, I will generate:
1. **requirements.md** — User stories with EARS acceptance criteria
2. **design.md** — Architecture, data flow, and design decisions
3. **tasks.md** — Task breakdown with dependency tracking

**IMPORTANT: Choose a short English kebab-case name (2-4 words) for this feature directory.** For example, for "добавь открытие файла в веббраузере после скачивания" use "open-file-in-browser". Create the directory \`.ears-spec/ENGLISH-SLUG/\` before saving files.`,
					display: true,
				},
				{ triggerTurn: true },
			);
		},
	});

	/**
	 * /ears:spec — Phase 1: Generate EARS requirements
	 */
	pi.registerCommand("ears:spec", {
		description:
			"Phase 1: Generate EARS requirements document from a feature description",
		handler: async (args, ctx) => {
			if (!args || args.trim().length === 0) {
				ctx.ui.notify("Usage: /ears:spec <feature description>", "warning");
				return;
			}

			pi.sendMessage(
				{
					customType: "ears-spec-requirements",
					content: `[EARS REQUIREMENTS PHASE]

Generate a **requirements.md** document for: **${args.trim()}**

## Instructions

1. First, ask 2-4 clarifying questions about scope, constraints, and edge cases
2. After answers, create user stories (As a... I want... So that...)
3. For EACH story, write 2-5 EARS acceptance criteria using these patterns:

Available patterns (UPPERCASE keywords):
${Object.values(EARS_PATTERNS)
	.map((val) => `- **${val.name}**: ${val.template}`)
	.join("\n")}

4. Run the \`ears_validate\` tool to check grammar
5. Run the \`ears_analyze\` tool to detect conflicts/ambiguities
6. Present the requirements.md for user approval, then save it

**IMPORTANT: Choose a short English kebab-case name (2-4 words) for this feature directory.** For example, for "добавь открытие файла в веббраузере после скачивания" use "open-file-in-browser". Create the directory \`.ears-spec/ENGLISH-SLUG/\` before saving files.

Use this format for each requirement (UPPERCASE keywords):
- **REQ-NNN** [PatternName] WHEN/WHILE/WHERE ..., the SYSTEM SHALL ...

Follow EARS grammar rules:
- **SHALL** is MANDATORY (not "should", "will", "must", "need to")
- **Keywords are UPPERCASE**: WHEN, WHILE, WHERE, WITHIN, SHALL, THE SYSTEM SHALL
- Each pattern has a specific keyword prefix in UPPERCASE
- No ambiguous terms (appropriate, timely, efficient, etc.)`,
					display: true,
				},
				{ triggerTurn: true },
			);
		},
	});

	/**
	 * /ears:analyze — Analyze requirements (from file or state)
	 */
	pi.registerCommand("ears:analyze", {
		description:
			"Analyze existing requirements for conflicts, ambiguities, and completeness. Reads from the spec directory if no state is loaded.",
		handler: async (_args, ctx) => {
			// Try to load from file if state is empty
			if (!state.requirements && !state.currentSpecsDir) {
				// Auto-discover specs directory
				await findSpecsDir();
			}
			if (!state.requirements && state.currentSpecsDir) {
				try {
					const reqPath = path.join(state.currentSpecsDir, "requirements.md");
					await fs.access(reqPath);
					// If requirements.md exists, tell the user to use ears_analyze tool
					ctx.ui.notify(
						`Found requirements.md at ${reqPath}. Use the \`ears_analyze\` tool with the parsed requirements to get a full analysis.`,
						"info",
					);
					return;
				} catch {
					ctx.ui.notify(
						"No requirements loaded and no requirements.md found. Create them first with /ears:spec",
						"warning",
					);
					return;
				}
			}

			if (!state.requirements) {
				ctx.ui.notify(
					"No requirements loaded. Create them first with /ears:spec",
					"warning",
				);
				return;
			}

			const allReqs = state.requirements.stories.flatMap((s) => s.requirements);
			const analysis = analyzeRequirements(allReqs);
			state.lastAnalysis = analysis;

			const report = formatAnalysisReport(analysis);
			pi.sendMessage(
				{
					customType: "ears-analysis-report",
					content: report,
					display: true,
				},
				{ triggerTurn: false },
			);

			updateStatusWidget(ctx);
			ctx.ui.notify(
				`Found ${analysis.length} issue(s) — ${analysis.filter((a) => a.severity === "high").length} high`,
				analysis.length > 0 ? "warning" : "info",
			);
		},
	});

	/**
	 * /ears:design — Phase 2: Generate design document
	 */
	pi.registerCommand("ears:design", {
		description:
			"Phase 2: Generate a design document from the approved requirements",
		handler: async (_args, ctx) => {
			if (!state.currentSpecsDir) {
				await findSpecsDir();
			}
			if (!state.currentSpecsDir) {
				ctx.ui.notify(
					"No specs directory. Start with /ears:spec first",
					"warning",
				);
				return;
			}

			pi.sendMessage(
				{
					customType: "ears-spec-design",
					content: `[EARS DESIGN PHASE]

Based on the approved requirements, generate a **design.md** document.

Cover these sections:
1. **Component Architecture** — system boundary diagram
2. **Data Models** — entities, relationships, field types
3. **API Contracts** — endpoints, request/response shapes
4. **Data Flow** — how data moves through the system
5. **Error Handling** — error states, recovery mechanisms
6. **Validation Strategy** — input validation rules
7. **Testing Approach** — unit, integration, e2e strategy

Save to: ${state.currentSpecsDir}/design.md

Present for user approval after generation.`,
					display: true,
				},
				{ triggerTurn: true },
			);
		},
	});

	/**
	 * /ears:tasks — Phase 3: Generate task breakdown
	 */
	pi.registerCommand("ears:tasks", {
		description:
			"Phase 3: Generate task breakdown with dependency analysis from requirements + design",
		handler: async (_args, ctx) => {
			if (!state.currentSpecsDir) {
				await findSpecsDir();
			}
			if (!state.currentSpecsDir) {
				ctx.ui.notify(
					"No specs directory. Complete /ears:spec first",
					"warning",
				);
				return;
			}

			pi.sendMessage(
				{
					customType: "ears-spec-tasks",
					content: `[EARS TASKS PHASE]

Based on the approved requirements and design, generate a **tasks.md** document.

Requirements:
1. Each task MUST trace back to one or more requirement IDs
2. Explicitly list dependencies between tasks
3. Mark parallelizable tasks with [P]
4. Run \`ears_analyze_deps\` to validate the dependency graph
5. Include execution waves (groups of tasks that can run in parallel)

Save to: ${state.currentSpecsDir}/tasks.md

Present for user approval after generation.`,
					display: true,
				},
				{ triggerTurn: true },
			);
		},
	});

	/**
	 * /ears:status — Show current spec engine state
	 */
	pi.registerCommand("ears:status", {
		description:
			"Show current EARS spec engine state — loaded requirements, design, tasks",
		handler: async (_args, ctx) => {
			const parts: string[] = [];
			parts.push("📋 **EARS Spec Engine Status**\n");

			// Determine the specs directory: from state or by scanning .ears-spec/
			let specsDir: string | undefined = state.currentSpecsDir || undefined;
			if (!specsDir) {
				specsDir = (await findSpecsDir()) ?? undefined;
			}

			if (specsDir) {
				parts.push(`- Specs directory: \`${specsDir}\``);
			}

			// Check file existence on disk for reliable status reporting
			const files = {
				requirements: false,
				design: false,
				tasks: false,
			};
			if (specsDir) {
				for (const name of Object.keys(files) as Array<keyof typeof files>) {
					const filePath = path.join(specsDir, `${name}.md`);
					try {
						await fs.access(filePath);
						files[name] = true;
					} catch {
						// File doesn't exist
					}
				}
			}

			// Report Requirements status
			if (state.requirements) {
				const totalReqs = state.requirements.stories.reduce(
					(s, st) => s + st.requirements.length,
					0,
				);
				parts.push(
					`- ✅ Requirements: ${state.requirements.stories.length} stories, ${totalReqs} EARS requirements`,
				);
			} else if (files.requirements) {
				parts.push("- ✅ Requirements: file exists on disk");
			} else {
				parts.push("- ⏳ Requirements: not yet generated");
			}

			// Report Design status
			if (state.design) {
				parts.push(`- ✅ Design: ${state.design.sections.length} sections`);
			} else if (files.design) {
				parts.push("- ✅ Design: file exists on disk");
			} else {
				parts.push("- ⏳ Design: not yet generated");
			}

			// Report Tasks status
			if (state.tasks) {
				parts.push(`- ✅ Tasks: ${state.tasks.length} tasks`);
			} else if (files.tasks) {
				parts.push("- ✅ Tasks: file exists on disk");
			} else {
				parts.push("- ⏳ Tasks: not yet generated");
			}

			if (state.lastAnalysis && state.lastAnalysis.length > 0) {
				const high = state.lastAnalysis.filter(
					(a) => a.severity === "high",
				).length;
				const med = state.lastAnalysis.filter(
					(a) => a.severity === "medium",
				).length;
				parts.push(
					`- 🔍 Analysis: ${state.lastAnalysis.length} issue(s) (${high} high, ${med} medium)`,
				);
			}

			ctx.ui.notify(parts.join("\n"), "info");
		},
	});

	// ─── Intercept tool results to update state ────────────────────────────────
	pi.on("tool_result", async (event, ctx) => {
		// Track when ears_analyze is called
		if (event.toolName === "ears_analyze") {
			const details = event.details as Record<string, unknown> | undefined;
			if (details && Array.isArray(details.issues)) {
				state.lastAnalysis = details.issues as SpecEngineState["lastAnalysis"];
				updateStatusWidget(ctx);
			}
		}
	});

	// ─── Save/Load state on session events ─────────────────────────────────────
	pi.on("session_start", async (_event, ctx) => {
		for (const entry of ctx.sessionManager.getEntries()) {
			if (
				entry.type === "custom" &&
				(entry as { customType?: string }).customType === "ears-spec-state"
			) {
				const data = (entry as { data?: SpecEngineState }).data;
				if (data) {
					state.projectRoot = data.projectRoot;
					state.currentSpecsDir = data.currentSpecsDir;
					state.lastAnalysis = data.lastAnalysis;
				}
			}
		}
		updateStatusWidget(ctx);
	});

	pi.on("turn_end", async (_event, ctx) => {
		pi.appendEntry("ears-spec-state", {
			projectRoot: state.projectRoot,
			currentSpecsDir: state.currentSpecsDir,
			lastAnalysis: state.lastAnalysis,
		});
		updateStatusWidget(ctx);
	});
}
