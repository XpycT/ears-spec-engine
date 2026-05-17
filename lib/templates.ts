/**
 * Template renderer for EARS spec engine documents.
 * Generates requirements.md, design.md, and tasks.md.
 */

import type { UserStory, SpecTask, DependencyAnalysis } from "./types.js";
import { formatRequirement } from "./ears.js";

/**
 * Renders a complete requirements.md document.
 */
export function renderRequirements(
	projectName: string,
	stories: UserStory[],
): string {
	const lines: string[] = [];
	lines.push(`# ${projectName} — Requirements`);
	lines.push("");
	lines.push("> Spec-Driven Development · EARS Notation (UPPERCASE keywords)");
	lines.push("");
	lines.push("## Table of Stories");
	lines.push("");
	for (const story of stories) {
		lines.push(
			`- [${story.id}](${story.id.toLowerCase().replace(/\s+/g, "-")}.md) — ${story.title}`,
		);
	}
	lines.push("");
	lines.push("---");
	lines.push("");

	for (const story of stories) {
		lines.push(`## ${story.id}: ${story.title}`);
		lines.push("");
		lines.push(`**As a** ${story.asA},`);
		lines.push(`**I want** ${story.wantTo},`);
		lines.push(`**So that** ${story.soThat}.`);
		lines.push("");

		if (story.requirements.length > 0) {
			lines.push("### Acceptance Criteria (EARS)");
			lines.push("");
			for (const req of story.requirements) {
				lines.push(formatRequirement(req));
			}
			lines.push("");
		}
	}

	return lines.join("\n");
}

/**
 * Renders a design.md document.
 */
export function renderDesign(
	projectName: string,
	sections: Array<{ title: string; content: string }>,
): string {
	const lines: string[] = [];
	lines.push(`# ${projectName} — Design`);
	lines.push("");
	lines.push("## Component Architecture");
	lines.push("");
	lines.push("```");
	lines.push("[System Boundary]");
	lines.push("  │");
	lines.push("  ├─ [Frontend]");
	lines.push("  │    ├─ Components");
	lines.push("  │    ├─ State Management");
	lines.push("  │    └─ Routing");
	lines.push("  │");
	lines.push("  ├─ [API Layer]");
	lines.push("  │    ├─ REST Endpoints");
	lines.push("  │    ├─ WebSocket / SSE");
	lines.push("  │    └─ Authentication");
	lines.push("  │");
	lines.push("  ├─ [Business Logic]");
	lines.push("  │    ├─ Services");
	lines.push("  │    ├─ Domain Models");
	lines.push("  │    └─ Validation");
	lines.push("  │");
	lines.push("  ├─ [Data Layer]");
	lines.push("  │    ├─ Database");
	lines.push("  │    ├─ Cache");
	lines.push("  │    └─ External APIs");
	lines.push("  │");
	lines.push("  └─ [Infrastructure]");
	lines.push("       ├─ CI/CD Pipeline");
	lines.push("       ├─ Monitoring");
	lines.push("       └─ Deploy Targets");
	lines.push("```");
	lines.push("");

	for (const section of sections) {
		lines.push(`## ${section.title}`);
		lines.push("");
		lines.push(section.content);
		lines.push("");
	}

	lines.push("## Decisions Log");
	lines.push("");
	lines.push("| Decision | Option Chosen | Rationale |");
	lines.push("|----------|--------------|----------|");
	lines.push("| ADR-001 | TBD | TBD |");
	lines.push("");

	return lines.join("\n");
}

/**
 * Renders a tasks.md document with dependency tracking.
 */
export function renderTasks(
	projectName: string,
	tasks: SpecTask[],
	analysis?: DependencyAnalysis,
): string {
	const lines: string[] = [];
	lines.push(`# ${projectName} — Tasks`);
	lines.push("");
	lines.push("> Generated from requirements + design documents");
	lines.push("");

	if (analysis && analysis.waves.length > 0) {
		lines.push("## Execution Plan");
		lines.push("");
		lines.push(
			"Tasks are organized into execution **waves** based on dependencies.\nWithin each wave, tasks can run in parallel.\n",
		);
		lines.push("");
		for (let w = 0; w < analysis.waves.length; w++) {
			const wave = analysis.waves[w];
			lines.push(
				`### Wave ${w}${w === 0 ? " (Foundation)" : w === analysis.waves.length - 1 ? " (Final)" : ""}`,
			);
			lines.push("");
			for (const task of wave) {
				const tags = task.parallel ? " `[P]`" : "";
				lines.push(`- ${task.id}${tags} — ${task.title}`);
			}
			lines.push("");
		}
	}

	lines.push("## Task Breakdown");
	lines.push("");

	for (const task of tasks) {
		lines.push(`### ${task.id}: ${task.title}`);
		lines.push("");
		if (task.description) {
			lines.push(task.description);
			lines.push("");
		}
		if (task.requirementIds.length > 0) {
			lines.push(`- **Requires:** ${task.requirementIds.join(", ")}`);
		}
		if (task.dependencies.length > 0) {
			lines.push(`- **Depends on:** ${task.dependencies.join(", ")}`);
		}
		lines.push(`- **Parallel:** ${task.parallel ? "Yes" : "No"}`);
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Analyzes task dependency graph and produces execution waves (Kiro Parallel Tasks equivalent).
 *
 * Uses Kahn's algorithm for topological sorting, then computes the critical path
 * (longest chain of dependent tasks) by dynamic programming on the DAG.
 */
export function analyzeDependencies(tasks: SpecTask[]): DependencyAnalysis {
	const taskMap = new Map(tasks.map((t) => [t.id, t]));
	const scheduled = new Set<string>();
	const waves: SpecTask[][] = [];

	// ── Build adjacency list: dep → [dependents] ──────────────────────────
	const dependents = new Map<string, string[]>();
	for (const task of tasks) {
		for (const depId of task.dependencies) {
			const list = dependents.get(depId) ?? [];
			list.push(task.id);
			dependents.set(depId, list);
		}
	}

	// ── Build execution waves via topological layering ─────────────────────
	// Tasks whose dependencies are all already scheduled go into the next wave.
	// Cycles are broken by force-scheduling remaining tasks.
	while (scheduled.size < tasks.length) {
		const wave: SpecTask[] = [];
		for (const task of tasks) {
			if (scheduled.has(task.id)) continue;
			const depsMet = task.dependencies.every(
				(depId) => !taskMap.has(depId) || scheduled.has(depId),
			);
			if (depsMet) {
				wave.push(task);
			}
		}
		if (wave.length === 0) {
			// Break dependency cycles by force-scheduling remaining tasks
			for (const task of tasks) {
				if (!scheduled.has(task.id)) wave.push(task);
			}
		}
		for (const task of wave) scheduled.add(task.id);
		waves.push(wave);
	}

	// ── Compute critical path via longest-path DP on the DAG ─────────────────
	// dist[id] = length of the longest path ending at task `id`
	// parent[id] = predecessor on that longest path (for reconstruction)
	const dist = new Map<string, number>();
	const parent = new Map<string, string | null>();

	// Process tasks in topological order (已有的 scheduled order from waves)
	// We already built `scheduled` in topo order; reconstruct that order.
	const topoOrder: string[] = [];
	for (const wave of waves) {
		for (const task of wave) {
			topoOrder.push(task.id);
		}
	}

	for (const id of topoOrder) {
		const task = taskMap.get(id)!;
		if (task.dependencies.length === 0) {
			dist.set(id, 1);
			parent.set(id, null);
		} else {
			let best = 0;
			let bestDep: string | null = null;
			for (const depId of task.dependencies) {
				const d = dist.get(depId) ?? 1; // treat unknown deps as length 1
				if (d > best) {
					best = d;
					bestDep = depId;
				}
			}
			dist.set(id, best + 1);
			parent.set(id, bestDep);
		}
	}

	// Find the task with the longest path and reconstruct the path
	let maxDist = 0;
	let endTask: string | null = null;
	for (const [id, d] of dist) {
		if (d > maxDist) {
			maxDist = d;
			endTask = id;
		}
	}

	const criticalPath: string[] = [];
	if (endTask !== null) {
		const visited = new Set<string>();
		let cur: string | null = endTask;
		while (cur !== null && !visited.has(cur)) {
			visited.add(cur);
			criticalPath.unshift(cur);
			cur = parent.get(cur) ?? null;
		}
	}

	return { waves, criticalPath };
}

/**
 * Renders clarifying questions for Quick Plan mode.
 * Returns at minimum 3 questions (scope + edge cases are always included).
 */
export function renderClarifyingQuestions(description: string): string[] {
	const questions: string[] = [];

	// Infer domain from description
	const hasAuth =
		/login|auth|user|password|sign.?in|oauth|role|permission/i.test(
			description,
		);
	const hasData = /database|store|persist|save|data|crud|record/i.test(
		description,
	);
	const hasUI = /page|screen|view|ui|button|form|modal|component/i.test(
		description,
	);
	const hasExternal = /integrat|webhook|third.?party|api/i.test(description);
	const hasRealtime =
		/real.?time|websocket|stream|live|notification|push/i.test(description);

	if (hasAuth) {
		questions.push(
			"**Authentication & Authorization:** What roles/permissions exist? Is SSO/OAuth required?",
		);
	}
	if (hasData) {
		questions.push(
			"**Data Storage:** Which database technology are you targeting? Any specific schema constraints?",
		);
	}
	if (hasUI) {
		questions.push(
			"**UI Framework:** Are there specific UI libraries or design system constraints?",
		);
	}
	if (hasExternal) {
		questions.push(
			"**External Integrations:** Do you have API specs for the services you're integrating with?",
		);
	}
	if (hasRealtime) {
		questions.push(
			"**Real-time Requirements:** What are the latency and throughput expectations? Is WebSocket/SSE required?",
		);
	}

	// Always ask about scope and edge cases
	questions.push(
		"**Scope & Priority:** What is the minimum viable scope? Which features are must-haves vs. nice-to-have?",
	);
	questions.push(
		"**Edge Cases:** Any specific error scenarios, rate limits, or failure modes to handle?",
	);

	return questions;
}
