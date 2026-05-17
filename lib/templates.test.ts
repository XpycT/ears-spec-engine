/**
 * Tests for lib/templates.ts — Template rendering and dependency analysis.
 *
 * Run with: node --import tsx lib/templates.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	renderRequirements,
	renderDesign,
	renderTasks,
	analyzeDependencies,
	renderClarifyingQuestions,
} from "./templates.js";
import type { UserStory, SpecTask } from "./types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStory(overrides: Partial<UserStory> = {}): UserStory {
	return {
		id: "S1",
		title: "User Authentication",
		asA: "visitor",
		wantTo: "log in securely",
		soThat: "I can access my account",
		requirements: [
			{
				id: "REQ-001",
				pattern: "event-driven",
				statement:
					"WHEN a user submits credentials, THE SYSTEM SHALL validate the token.",
				storyId: "S1",
			},
			{
				id: "REQ-002",
				pattern: "ubiquitous",
				statement: "THE SYSTEM SHALL hash passwords using bcrypt.",
				storyId: "S1",
			},
		],
		...overrides,
	};
}

function makeTask(overrides: Partial<SpecTask> = {}): SpecTask {
	return {
		id: "T-001",
		title: "Setup project",
		description: "Initialize the project structure",
		requirementIds: ["REQ-001"],
		dependencies: [],
		parallel: true,
		...overrides,
	};
}

// ─── renderRequirements ──────────────────────────────────────────────────────

describe("renderRequirements", () => {
	it("includes project name in heading", () => {
		const md = renderRequirements("MyApp", [makeStory()]);
		assert.ok(md.startsWith("# MyApp — Requirements"));
	});

	it("includes story table of contents", () => {
		const md = renderRequirements("MyApp", [makeStory()]);
		assert.ok(md.includes("Table of Stories"));
		assert.ok(md.includes("S1"));
	});

	it("renders each story with As a / I want / So that", () => {
		const md = renderRequirements("MyApp", [makeStory()]);
		assert.ok(md.includes("**As a** visitor"));
		assert.ok(md.includes("**I want** log in securely"));
		assert.ok(md.includes("**So that** I can access my account"));
	});

	it("renders acceptance criteria section", () => {
		const md = renderRequirements("MyApp", [makeStory()]);
		assert.ok(md.includes("Acceptance Criteria (EARS)"));
		assert.ok(md.includes("REQ-001"));
		assert.ok(md.includes("REQ-002"));
	});

	it("skips acceptance criteria section when story has no requirements", () => {
		const story = makeStory({ requirements: [] });
		const md = renderRequirements("MyApp", [story]);
		assert.ok(!md.includes("Acceptance Criteria (EARS)"));
	});

	it("renders multiple stories", () => {
		const stories = [
			makeStory({ id: "S1", title: "Auth" }),
			makeStory({ id: "S2", title: "Data" }),
		];
		const md = renderRequirements("MyApp", stories);
		assert.ok(md.includes("S1: Auth"));
		assert.ok(md.includes("S2: Data"));
	});
});

// ─── renderDesign ────────────────────────────────────────────────────────────

describe("renderDesign", () => {
	it("includes project name in heading", () => {
		const md = renderDesign("MyApp", []);
		assert.ok(md.startsWith("# MyApp — Design"));
	});

	it("includes component architecture diagram", () => {
		const md = renderDesign("MyApp", []);
		assert.ok(md.includes("Component Architecture"));
		assert.ok(md.includes("[System Boundary]"));
	});

	it("renders custom sections", () => {
		const md = renderDesign("MyApp", [
			{ title: "Data Models", content: "User: { id, name, email }" },
		]);
		assert.ok(md.includes("Data Models"));
		assert.ok(md.includes("User: { id, name, email }"));
	});

	it("includes decisions log", () => {
		const md = renderDesign("MyApp", []);
		assert.ok(md.includes("Decisions Log"));
	});
});

// ─── renderTasks ─────────────────────────────────────────────────────────────

describe("renderTasks", () => {
	it("includes project name in heading", () => {
		const md = renderTasks("MyApp", [makeTask()]);
		assert.ok(md.startsWith("# MyApp — Tasks"));
	});

	it("renders task details", () => {
		const md = renderTasks("MyApp", [makeTask()]);
		assert.ok(md.includes("T-001"));
		assert.ok(md.includes("Setup project"));
	});

	it("renders requirement traceability", () => {
		const md = renderTasks("MyApp", [makeTask()]);
		assert.ok(md.includes("REQ-001"));
	});

	it("renders dependency list", () => {
		const task = makeTask({ dependencies: ["T-000"] });
		const md = renderTasks("MyApp", [task]);
		assert.ok(md.includes("T-000"));
	});

	it("marks parallel tasks", () => {
		const tasks = [makeTask({ id: "T-001", parallel: true })];
		const analysis = analyzeDependencies(tasks);
		const md = renderTasks("MyApp", tasks, analysis);
		assert.ok(md.includes("[P]"), `Expected [P] in output, got:\n${md}`);
	});

	it("renders execution waves when analysis provided", () => {
		const analysis = analyzeDependencies([
			makeTask({ id: "T-001", dependencies: [] }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
		]);
		const md = renderTasks(
			"MyApp",
			[
				makeTask({ id: "T-001", dependencies: [] }),
				makeTask({ id: "T-002", dependencies: ["T-001"] }),
			],
			analysis,
		);
		assert.ok(md.includes("Execution Plan"));
		assert.ok(md.includes("Wave"));
	});

	it("omits execution plan when no analysis provided", () => {
		const md = renderTasks("MyApp", [makeTask()]);
		assert.ok(!md.includes("Execution Plan"));
	});
});

// ─── analyzeDependencies ────────────────────────────────────────────────────

describe("analyzeDependencies", () => {
	it("produces a single wave for independent tasks", () => {
		const tasks = [
			makeTask({ id: "T-001", dependencies: [] }),
			makeTask({ id: "T-002", dependencies: [] }),
			makeTask({ id: "T-003", dependencies: [] }),
		];
		const result = analyzeDependencies(tasks);
		assert.equal(result.waves.length, 1);
		assert.equal(result.waves[0].length, 3);
	});

	it("creates sequential waves for a linear chain", () => {
		const tasks = [
			makeTask({ id: "T-001", dependencies: [] }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
			makeTask({ id: "T-003", dependencies: ["T-002"] }),
		];
		const result = analyzeDependencies(tasks);
		assert.equal(result.waves.length, 3);
		assert.equal(result.waves[0][0].id, "T-001");
		assert.equal(result.waves[1][0].id, "T-002");
		assert.equal(result.waves[2][0].id, "T-003");
	});

	it("computes critical path through a linear chain", () => {
		const tasks = [
			makeTask({ id: "T-001", dependencies: [] }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
			makeTask({ id: "T-003", dependencies: ["T-002"] }),
		];
		const result = analyzeDependencies(tasks);
		assert.deepEqual(result.criticalPath, ["T-001", "T-002", "T-003"]);
	});

	it("handles diamond dependencies correctly", () => {
		// T-001 → T-002, T-003 → T-004
		const tasks = [
			makeTask({ id: "T-001", dependencies: [] }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
			makeTask({ id: "T-003", dependencies: ["T-001"] }),
			makeTask({ id: "T-004", dependencies: ["T-002", "T-003"] }),
		];
		const result = analyzeDependencies(tasks);
		// Wave 0: T-001, Wave 1: T-002 + T-003, Wave 2: T-004
		assert.equal(result.waves.length, 3);
		assert.equal(result.waves[0].length, 1);
		assert.equal(result.waves[1].length, 2);
		assert.equal(result.waves[2].length, 1);
	});

	it("handles cycles by force-scheduling remaining tasks", () => {
		// T-001 → T-002 → T-001 (cycle)
		const tasks = [
			makeTask({ id: "T-001", dependencies: ["T-002"] }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
		];
		const result = analyzeDependencies(tasks);
		// Should produce waves with both tasks (cycle is broken)
		assert.ok(result.waves.length >= 1);
		const totalTasks = result.waves.flat().length;
		assert.equal(totalTasks, 2);
	});

	it("handles empty task list", () => {
		const result = analyzeDependencies([]);
		assert.equal(result.waves.length, 0);
		assert.equal(result.criticalPath.length, 0);
	});

	it("computes critical path for diamond with unequal branches", () => {
		// Short branch: T-001 → T-003
		// Long branch:  T-001 → T-002 → T-003
		const tasks = [
			makeTask({ id: "T-001", dependencies: [] }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
			makeTask({ id: "T-003", dependencies: ["T-001", "T-002"] }),
		];
		const result = analyzeDependencies(tasks);
		// Critical path should be T-001 → T-002 → T-003 (length 3)
		assert.ok(result.criticalPath.length >= 3);
		assert.ok(result.criticalPath.includes("T-002"));
	});
});

// ─── renderClarifyingQuestions ────────────────────────────────────────────────

describe("renderClarifyingQuestions", () => {
	it("always includes scope and edge case questions", () => {
		const questions = renderClarifyingQuestions("simple feature");
		assert.ok(questions.some((q) => q.includes("Scope")));
		assert.ok(questions.some((q) => q.includes("Edge")));
	});

	it("detects auth-related keywords", () => {
		const questions = renderClarifyingQuestions(
			"user login and authentication",
		);
		assert.ok(questions.some((q) => q.includes("Authentication")));
	});

	it("detects data-related keywords", () => {
		const questions = renderClarifyingQuestions(
			"database storage and CRUD operations",
		);
		assert.ok(questions.some((q) => q.includes("Data")));
	});

	it("detects UI-related keywords", () => {
		const questions = renderClarifyingQuestions(
			"new page and UI form components",
		);
		assert.ok(questions.some((q) => q.includes("UI")));
	});

	it("detects integration-related keywords", () => {
		const questions = renderClarifyingQuestions(
			"webhook integration with third-party API",
		);
		assert.ok(questions.some((q) => q.includes("Integration")));
	});

	it("detects realtime-related keywords", () => {
		const questions = renderClarifyingQuestions(
			"real-time notifications via WebSocket",
		);
		assert.ok(questions.some((q) => q.includes("Real-time")));
	});

	it("returns at minimum 2 questions (scope + edge cases)", () => {
		const questions = renderClarifyingQuestions("minimal feature");
		assert.ok(
			questions.length >= 2,
			`Expected at least 2 questions, got ${questions.length}`,
		);
	});
});
