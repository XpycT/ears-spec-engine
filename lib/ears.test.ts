/**
 * Tests for lib/ears.ts — EARS validation, conflict detection,
 * ambiguity detection, analysis, and formatting.
 *
 * Run with: node --import tsx lib/ears.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	validateEarsGrammar,
	detectConflict,
	detectAmbiguity,
	analyzeRequirements,
	formatAnalysisReport,
	formatRequirement,
	EARS_PATTERNS,
} from "./ears.js";
import type { EarsRequirement, EarsPattern } from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function req(
	id: string,
	pattern: EarsPattern,
	statement: string,
	storyId = "S1",
): EarsRequirement {
	return { id, pattern, statement, storyId };
}

// ─── validateEarsGrammar ─────────────────────────────────────────────────────

describe("validateEarsGrammar", () => {
	it("accepts a valid ubiquitous requirement", () => {
		const result = validateEarsGrammar(
			req("REQ-001", "ubiquitous", "THE SYSTEM SHALL log all operations."),
		);
		assert.equal(result, null);
	});

	it("rejects ubiquitous requirement without THE SYSTEM SHALL", () => {
		const result = validateEarsGrammar(
			req("REQ-001", "ubiquitous", "The system should log all operations."),
		);
		assert.ok(result !== null, "Expected an error for missing THE SYSTEM SHALL");
		assert.ok(result!.includes("THE SYSTEM SHALL"));
	});

	it("accepts a valid event-driven requirement", () => {
		const result = validateEarsGrammar(
			req("REQ-002", "event-driven", "WHEN a user logs in, THE SYSTEM SHALL validate the token."),
		);
		assert.equal(result, null);
	});

	it("rejects event-driven without WHEN prefix", () => {
		const result = validateEarsGrammar(
			req("REQ-002", "event-driven", "THE SYSTEM SHALL validate the token."),
		);
		assert.ok(result !== null);
		assert.ok(result!.includes("WHEN"));
	});

	it("rejects event-driven without THE SYSTEM SHALL response", () => {
		const result = validateEarsGrammar(
			req("REQ-002", "event-driven", "WHEN a user logs in, the system should validate"),
		);
		assert.ok(result !== null);
		assert.ok(result!.includes("THE SYSTEM SHALL"));
	});

	it("accepts a valid state-driven requirement", () => {
		const result = validateEarsGrammar(
			req("REQ-003", "state-driven", "WHILE the migration runs, THE SYSTEM SHALL queue writes."),
		);
		assert.equal(result, null);
	});

	it("rejects state-driven without WHILE prefix", () => {
		const result = validateEarsGrammar(
			req("REQ-003", "state-driven", "THE SYSTEM SHALL queue writes."),
		);
		assert.ok(result !== null);
	});

	it("accepts a valid optional requirement", () => {
		const result = validateEarsGrammar(
			req("REQ-004", "optional", "WHERE dark mode is enabled, THE SYSTEM SHALL render dark UI."),
		);
		assert.equal(result, null);
	});

	it("rejects optional without WHERE prefix", () => {
		const result = validateEarsGrammar(
			req("REQ-004", "optional", "THE SYSTEM SHALL render dark UI."),
		);
		assert.ok(result !== null);
	});

	it("accepts a valid complex requirement with WITHIN", () => {
		const result = validateEarsGrammar(
			req("REQ-005", "complex", "WITHIN 500ms of query, THE SYSTEM SHALL return results."),
		);
		assert.equal(result, null);
	});

	it("accepts a valid complex requirement with WHEN ... AND", () => {
		const result = validateEarsGrammar(
			req("REQ-005", "complex", "WHEN import completes AND report has zero errors, THE SYSTEM SHALL promote data."),
		);
		assert.equal(result, null);
	});

	it("rejects complex requirement without temporal or compound conditions", () => {
		const result = validateEarsGrammar(
			req("REQ-005", "complex", "THE SYSTEM SHALL process data."),
		);
		assert.ok(result !== null);
		assert.ok(result!.includes("WITHIN") || result!.includes("WHEN"));
	});
});

// ─── detectConflict ──────────────────────────────────────────────────────────

describe("detectConflict", () => {
	it("detects allow/deny conflict on same object", () => {
		const a = req("R1", "ubiquitous", "THE SYSTEM SHALL allow guest access to public data.");
		const b = req("R2", "ubiquitous", "THE SYSTEM SHALL deny guest access to public data.");
		const result = detectConflict(a, b);
		assert.ok(result !== null, "Expected a conflict to be detected");
		assert.ok(result!.includes("R1"));
		assert.ok(result!.includes("R2"));
	});

	it("detects create/delete conflict on same object", () => {
		const a = req("R1", "ubiquitous", "THE SYSTEM SHALL create audit records on login.");
		const b = req("R2", "ubiquitous", "THE SYSTEM SHALL delete audit records on login.");
		const result = detectConflict(a, b);
		assert.ok(result !== null, "Expected a create/delete conflict");
	});

	it("detects enable/disable conflict", () => {
		const a = req("R1", "ubiquitous", "THE SYSTEM SHALL enable notifications for all users.");
		const b = req("R2", "ubiquitous", "THE SYSTEM SHALL disable notifications for all users.");
		const result = detectConflict(a, b);
		assert.ok(result !== null, "Expected an enable/disable conflict");
	});

	it("returns null for unrelated requirements", () => {
		const a = req("R1", "ubiquitous", "THE SYSTEM SHALL log every request.");
		const b = req("R2", "ubiquitous", "THE SYSTEM SHALL hash passwords with bcrypt.");
		const result = detectConflict(a, b);
		assert.equal(result, null);
	});

	it("detects same trigger with different responses", () => {
		const a = req("R1", "event-driven", "WHEN a user submits form, THE SYSTEM SHALL process the data.");
		const b = req("R2", "event-driven", "WHEN a user submits form, THE SYSTEM SHALL reject the data.");
		const result = detectConflict(a, b);
		assert.ok(result !== null, "Expected same-trigger conflict");
		assert.ok(result!.includes("same trigger"));
	});

	it("returns null for opposite verbs on different objects", () => {
		const a = req("R1", "ubiquitous", "THE SYSTEM SHALL allow admin access to settings.");
		const b = req("R2", "ubiquitous", "THE SYSTEM SHALL deny guest access to reports.");
		const result = detectConflict(a, b);
		// Different objects, different subjects — should NOT flag as conflict
		assert.equal(result, null);
	});
});

// ─── detectAmbiguity ─────────────────────────────────────────────────────────

describe("detectAmbiguity", () => {
	it("detects 'appropriate' as ambiguous", () => {
		const result = detectAmbiguity(
			req("R1", "ubiquitous", "THE SYSTEM SHALL take appropriate action."),
		);
		assert.ok(result.length > 0);
		assert.ok(result[0].includes("appropriate"));
	});

	it("detects 'timely' as ambiguous", () => {
		const result = detectAmbiguity(
			req("R1", "ubiquitous", "THE SYSTEM SHALL respond in a timely manner."),
		);
		assert.ok(result.length > 0);
		assert.ok(result[0].includes("timely"));
	});

	it("detects multiple ambiguous terms", () => {
		const result = detectAmbiguity(
			req("R1", "ubiquitous", "THE SYSTEM SHALL efficiently process various data properly, etc."),
		);
		assert.ok(result.length >= 3, `Expected at least 3 ambiguities, got ${result.length}`);
	});

	it("returns empty array for clear requirement", () => {
		const result = detectAmbiguity(
			req("R1", "ubiquitous", "THE SYSTEM SHALL hash passwords using bcrypt with cost 12."),
		);
		assert.equal(result.length, 0);
	});
});

// ─── analyzeRequirements ─────────────────────────────────────────────────────

describe("analyzeRequirements", () => {
	it("returns grammar issues for invalid EARS requirements", () => {
		const issues = analyzeRequirements([
			req("R1", "ubiquitous", "The system should log operations."),
		]);
		const grammarIssues = issues.filter((i) => i.type === "incompleteness");
		assert.ok(grammarIssues.length > 0, "Expected grammar errors to be categorized as incompleteness");
	});

	it("detects conflicts between requirements", () => {
		const issues = analyzeRequirements([
			req("R1", "ubiquitous", "THE SYSTEM SHALL allow guest access to public data."),
			req("R2", "ubiquitous", "THE SYSTEM SHALL deny guest access to public data."),
		]);
		const conflicts = issues.filter((i) => i.type === "conflict");
		assert.ok(conflicts.length > 0, "Expected conflict between allow/deny");
	});

	it("detects ambiguous language", () => {
		const issues = analyzeRequirements([
			req("R1", "ubiquitous", "THE SYSTEM SHALL handle requests in a timely manner."),
		]);
		const ambiguities = issues.filter((i) => i.type === "ambiguity");
		assert.ok(ambiguities.length > 0, "Expected ambiguity for 'timely'");
	});

	it("reports incompleteness when error handling is missing", () => {
		const issues = analyzeRequirements([
			req("R1", "ubiquitous", "THE SYSTEM SHALL process all payments."),
		]);
		const incompleteness = issues.filter((i) => i.type === "incompleteness");
		// Should flag missing error, invalid, unauthorized
		assert.ok(incompleteness.length >= 2, `Expected incompleteness issues, got ${incompleteness.length}`);
	});

	it("returns no grammar issues for fully valid requirements", () => {
		const issues = analyzeRequirements([
			req("R1", "ubiquitous", "THE SYSTEM SHALL log all operations."),
			req("R2", "event-driven", "WHEN an error occurs, THE SYSTEM SHALL send an alert."),
		]);
		const grammarIssues = issues.filter(
			(i) => i.type === "incompleteness" && i.requirementIds.length === 1,
		);
		assert.equal(grammarIssues.length, 0, "No grammar errors for valid requirements");
	});
});

// ─── formatAnalysisReport ─────────────────────────────────────────────────────

describe("formatAnalysisReport", () => {
	it("produces success message for empty issues", () => {
		const report = formatAnalysisReport([]);
		assert.ok(report.includes("No issues found"));
	});

	it("produces severity sections for non-empty issues", () => {
		const report = formatAnalysisReport([
			{
				type: "conflict",
				severity: "high",
				description: "R1 contradicts R2",
				requirementIds: ["R1", "R2"],
				suggestion: "Resolve the contradiction.",
			},
			{
				type: "ambiguity",
				severity: "low",
				description: "R1 uses 'timely'",
				requirementIds: ["R1"],
				suggestion: "Define the time bound.",
			},
		]);
		assert.ok(report.includes("High Severity"));
		assert.ok(report.includes("Low Severity"));
	});
});

// ─── formatRequirement ───────────────────────────────────────────────────────

describe("formatRequirement", () => {
	it("uppercases THE SYSTEM SHALL in ubiquitous requirements", () => {
		const result = formatRequirement(
			req("REQ-001", "ubiquitous", "the system shall validate all user input."),
		);
		assert.ok(result.includes("THE SYSTEM SHALL"), `Expected uppercase, got: ${result}`);
	});

	it("uppercases WHEN in event-driven requirements", () => {
		const result = formatRequirement(
			req("REQ-002", "event-driven", "when a user logs in, the system shall validate the token."),
		);
		assert.ok(result.includes("WHEN "), `Expected uppercase WHEN, got: ${result}`);
		assert.ok(result.includes("the SYSTEM SHALL"), `Expected SYSTEM SHALL after trigger, got: ${result}`);
	});

	it("uppercases WHILE in state-driven requirements", () => {
		const result = formatRequirement(
			req("REQ-003", "state-driven", "while the migration runs, the system shall queue writes."),
		);
		assert.ok(result.includes("WHILE "), `Expected uppercase WHILE, got: ${result}`);
	});

	it("uppercases WHERE in optional requirements", () => {
		const result = formatRequirement(
			req("REQ-004", "optional", "where dark mode is enabled, the system shall render dark UI."),
		);
		assert.ok(result.includes("WHERE "), `Expected uppercase WHERE, got: ${result}`);
	});

	it("includes pattern name in formatted output", () => {
		const result = formatRequirement(
			req("REQ-001", "event-driven", "WHEN a user logs in, THE SYSTEM SHALL validate token."),
		);
		assert.ok(result.includes("[Event-Driven]"), `Expected pattern name, got: ${result}`);
	});

	it("includes requirement ID in formatted output", () => {
		const result = formatRequirement(
			req("REQ-042", "ubiquitous", "THE SYSTEM SHALL log operations."),
		);
		assert.ok(result.includes("REQ-042"), `Expected ID, got: ${result}`);
	});
});

// ─── EARS_PATTERNS ───────────────────────────────────────────────────────────

describe("EARS_PATTERNS", () => {
	it("has all 5 canonical patterns", () => {
		const patterns = Object.keys(EARS_PATTERNS);
		assert.deepEqual(patterns.sort(), [
			"complex",
			"event-driven",
			"optional",
			"state-driven",
			"ubiquitous",
		]);
	});

	it("each pattern has name, description, template, and examples", () => {
		for (const [key, val] of Object.entries(EARS_PATTERNS)) {
			assert.ok(val.name.length > 0, `Pattern ${key} missing name`);
			assert.ok(val.description.length > 0, `Pattern ${key} missing description`);
			assert.ok(val.template.length > 0, `Pattern ${key} missing template`);
			assert.ok(val.examples.length > 0, `Pattern ${key} missing examples`);
		}
	});
});