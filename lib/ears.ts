/**
 * EARS (Easy Approach to Requirements Syntax) notation engine.
 *
 * Implements the 5 canonical EARS patterns:
 * 1. Ubiquitous  - "The system shall <response>"
 * 2. Event-driven - "When <trigger>, the system shall <response>"
 * 3. State-driven - "While <state>, the system shall <response>"
 * 4. Optional    - "Where <feature>, the system shall <response>"
 * 5. Complex     - Combines conditions and/or temporal constraints
 */

import type { EarsPattern, EarsRequirement, AnalysisIssue } from "./types.js";

/** EARS pattern definitions */
export const EARS_PATTERNS: Record<EarsPattern, {
  name: string;
  description: string;
  template: string;
  examples: string[];
}> = {
  "ubiquitous": {
    name: "Ubiquitous",
    description: "Active at all times — the most basic system rule. No trigger needed.",
    template: "<response>",
    examples: [
      "The SYSTEM SHALL log all write operations to an immutable audit trail.",
      "The SYSTEM SHALL validate user input before persisting any data.",
      "The SYSTEM SHALL hash passwords using bcrypt with cost factor 12.",
    ],
  },
  "event-driven": {
    name: "Event-Driven",
    description: "Triggered by a specific event or action.",
    template: "WHEN <trigger>, the SYSTEM SHALL <response>",
    examples: [
      "WHEN a payment webhook is received, the SYSTEM SHALL verify the HMAC signature before processing.",
      "WHEN a user submits a password reset request, the SYSTEM SHALL generate a one-time token with 15-minute TTL.",
      "WHEN a file is uploaded, the SYSTEM SHALL scan it for malware before persisting.",
    ],
  },
  "state-driven": {
    name: "State-Driven",
    description: "Active while the system is in a specific state.",
    template: "WHILE <state condition>, the SYSTEM SHALL <response>",
    examples: [
      "WHILE the migration script is running, the SYSTEM SHALL queue incoming writes to a dead-letter buffer.",
      "WHILE the subscription is in \"past_due\" status, the SYSTEM SHALL downgrade the user to read-only access.",
      "WHILE the system is in maintenance mode, the SYSTEM SHALL return HTTP 503 with a maintenance page.",
    ],
  },
  "optional": {
    name: "Optional",
    description: "Applies only when a specific feature is enabled (feature flag).",
    template: "WHERE <feature>, the SYSTEM SHALL <response>",
    examples: [
      "WHERE the enterprise SSO module is enabled, the SYSTEM SHALL validate tokens against the configured SAML IdP.",
      "WHERE the caching layer is active, the SYSTEM SHALL invalidate cache entries on any write to the underlying entity.",
      "WHERE dark mode is enabled, the SYSTEM SHALL render UI components using the dark theme color palette.",
    ],
  },
  "complex": {
    name: "Complex",
    description: "Combines multiple conditions and/or temporal constraints.",
    template: "<temporal or compound condition>, the SYSTEM SHALL <response>",
    examples: [
      "WITHIN 500ms of receiving a search query, the SYSTEM SHALL return ranked results or a timeout error.",
      "WHEN bulk import completes AND the validation report contains zero errors, the SYSTEM SHALL automatically promote the data to production.",
      "WHEN a user has 3+ failed login attempts WITHIN 5 minutes, the SYSTEM SHALL lock the account and send an alert email.",
    ],
  },
};

/**
 * Formats a single requirement into EARS markdown.
 * Converts pattern keywords to UPPERCASE for readability.
 */
export function formatRequirement(req: EarsRequirement): string {
  const pattern = EARS_PATTERNS[req.pattern];
  const formatted = req.statement
    .replace(/^the\s+system\s+shall/i, "THE SYSTEM SHALL")
    .replace(/^when\s+/i, "WHEN ")
    .replace(/^while\s+/i, "WHILE ")
    .replace(/^where\s+/i, "WHERE ")
    .replace(/^within\s+/i, "WITHIN ")
    .replace(/,\s+the\s+system\s+shall\s+/i, ", the SYSTEM SHALL ");
  return `- **${req.id}** [${pattern.name}] ${formatted}`;
}

/**
 * Renders a complete requirements document to markdown.
 */
export function renderRequirementsMd(
  title: string,
  stories: Array<{
    id: string;
    title: string;
    asA: string;
    wantTo: string;
    soThat: string;
    requirements: EarsRequirement[];
  }>,
): string {
  const lines: string[] = [];
  lines.push(`# ${title} — Requirements`);
  lines.push("");
  lines.push("> Generated with EARS Spec Engine — Keywords in UPPERCASE");
  lines.push("> Patterns: Ubiquitous · Event-Driven · State-Driven · Optional · Complex");
  lines.push("> Keywords: THE SYSTEM SHALL · WHEN · WHILE · WHERE · WITHIN");
  lines.push("");

  for (const story of stories) {
    lines.push(`## ${story.id}: ${story.title}`);
    lines.push("");
    lines.push(`**As a** ${story.asA},`);
    lines.push(`**I want** ${story.wantTo},`);
    lines.push(`**So that** ${story.soThat}.`);
    lines.push("");
    lines.push("### Acceptance Criteria (EARS)");
    lines.push("");

    for (const req of story.requirements) {
      lines.push(formatRequirement(req));
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Validates that an EARS requirement follows its pattern's grammar.
 * Returns null if valid, or an error message if invalid.
 */
export function validateEarsGrammar(req: EarsRequirement): string | null {
  const statement = req.statement.trim();

  switch (req.pattern) {
    case "ubiquitous":
      if (!/^THE SYSTEM SHALL\s+/.test(statement)) {
        return `Ubiquitous requirement "${req.id}" must start with "THE SYSTEM SHALL ..." (UPPERCASE required). Got: "${statement.slice(0, 60)}..."`;
      }
      break;

    case "event-driven":
      if (!/^WHEN\s+/.test(statement)) {
        return `Event-driven requirement "${req.id}" must start with "WHEN <trigger>..." (UPPERCASE keyword). Got: "${statement.slice(0, 60)}..."`;
      }
      if (!/,\s+THE SYSTEM SHALL\s+/.test(statement)) {
        return `Event-driven requirement "${req.id}" must contain ", THE SYSTEM SHALL ..." after the trigger (UPPERCASE required). Got: "${statement.slice(0, 80)}..."`;
      }
      break;

    case "state-driven":
      if (!/^WHILE\s+/.test(statement)) {
        return `State-driven requirement "${req.id}" must start with "WHILE <state>..." (UPPERCASE keyword). Got: "${statement.slice(0, 60)}..."`;
      }
      if (!/,\s+THE SYSTEM SHALL\s+/.test(statement)) {
        return `State-driven requirement "${req.id}" must contain ", THE SYSTEM SHALL ..." after the state condition (UPPERCASE required). Got: "${statement.slice(0, 80)}..."`;
      }
      break;

    case "optional":
      if (!/^WHERE\s+/.test(statement)) {
        return `Optional requirement "${req.id}" must start with "WHERE <feature>..." (UPPERCASE keyword). Got: "${statement.slice(0, 60)}..."`;
      }
      if (!/,\s+THE SYSTEM SHALL\s+/.test(statement)) {
        return `Optional requirement "${req.id}" must contain ", THE SYSTEM SHALL ..." after the feature (UPPERCASE required). Got: "${statement.slice(0, 80)}..."`;
      }
      break;

    case "complex":
      if (!/WITHIN\s+\d+m?s/i.test(statement) && !/WHEN\s+.+AND\s+/i.test(statement) && !/WHEN\s+.+WITHIN\s+/i.test(statement)) {
        return `Complex requirement "${req.id}" should contain temporal constraints ("WITHIN Nms/Ns") or compound conditions ("WHEN X AND Y"). Got: "${statement.slice(0, 80)}..."`;
      }
      if (!/,\s+THE SYSTEM SHALL\s+/.test(statement)) {
        return `Complex requirement "${req.id}" must contain ", THE SYSTEM SHALL ..." (UPPERCASE required). Got: "${statement.slice(0, 80)}..."`;
      }
      break;
  }

  return null;
}

/**
 * Detects potential conflicts between two requirements.
 * Returns null if no conflict, or a description of the conflict.
 */
export function detectConflict(a: EarsRequirement, b: EarsRequirement): string | null {
  const aLower = a.statement.toLowerCase();
  const bLower = b.statement.toLowerCase();

  // Extract the action parts (after "the system shall" / "THE SYSTEM SHALL")
  const actionRegex = /(?:the\s+)?system\s+shall\s+(.+)$/i;
  const aMatch = aLower.match(actionRegex)?.[1]?.trim();
  const bMatch = bLower.match(actionRegex)?.[1]?.trim();
  if (!aMatch || !bMatch) return null;

  // Opposite-semantic pairs (allow/reject, allow/deny, create/delete, etc.)
  const opposites: Array<[Set<string>, Set<string>]> = [
    [new Set(["allow", "permit", "accept"]), new Set(["reject", "deny", "block", "refuse"])],
    [new Set(["create", "insert", "add"]), new Set(["delete", "remove", "drop"])],
    [new Set(["enable", "activate"]), new Set(["disable", "deactivate"])],
    [new Set(["grant"]), new Set(["revoke"])],
  ];

  for (const [allowSet, rejectSet] of opposites) {
    const aAllows = [...allowSet].some((w) => aMatch.includes(w));
    const bRejects = [...rejectSet].some((w) => bMatch.includes(w));
    const bAllows = [...allowSet].some((w) => bMatch.includes(w));
    const aRejects = [...rejectSet].some((w) => aMatch.includes(w));

    if ((aAllows && bRejects) || (aRejects && bAllows)) {
      // Check if they operate on the same object
      const extractObject = (action: string): string => {
        const words = action.split(/\s+/);
        // Return everything after the verb (skip allow/reject/etc)
        const idx = words.length > 1 ? 1 : 0;
        return words.slice(idx).join(" ");
      };
      const aObj = extractObject(aMatch);
      const bObj = extractObject(bMatch);

      // If objects overlap significantly, it's a conflict
      if (aObj && bObj && (aObj === bObj || aObj.includes(bObj) || bObj.includes(aObj))) {
        return `Requirements "${a.id}" and "${b.id}" contradict: one permits what the other forbids regarding "${aObj.length < bObj.length ? aObj : bObj}"`;
      }
    }
  }

  // Same trigger, different responses
  const aTrigger = aLower.match(/^when\s+(.+?),\s+the system shall/)?.[1];
  const bTrigger = bLower.match(/^when\s+(.+?),\s+the system shall/)?.[1];
  if (aTrigger && bTrigger && aTrigger === bTrigger && aMatch !== bMatch) {
    return `Requirements "${a.id}" and "${b.id}" share the same trigger "${aTrigger}" but specify different responses`;
  }

  return null;
}

/**
 * Detects ambiguous language in a requirement statement.
 */
export function detectAmbiguity(req: EarsRequirement): string[] {
  const issues: string[] = [];
  const statement = req.statement.toLowerCase();
  const ambiguousTerms = [
    { term: "etc", fix: "be explicit about all cases" },
    { term: "and/or", fix: "use 'AND' or 'OR' explicitly" },
    { term: "appropriate", fix: "define what 'appropriate' means specifically" },
    { term: "as needed", fix: "define the condition that triggers the action" },
    { term: "timely", fix: "specify a concrete time bound (e.g., 'within 500ms')" },
    { term: "efficient", fix: "define measurable performance criteria" },
    { term: "user-friendly", fix: "describe specific UX behavior" },
    { term: "properly", fix: "describe the correct behavior explicitly" },
    { term: "various", fix: "enumerate all cases instead of saying 'various'" },
    { term: "sometimes", fix: "define the condition explicitly" },
  ];

  for (const { term, fix } of ambiguousTerms) {
    if (statement.includes(term)) {
      issues.push(`"${req.id}": Contains ambiguous term "${term}" — ${fix}`);
    }
  }

  return issues;
}

/**
 * Analyzes a set of requirements and returns detected issues.
 */
export function analyzeRequirements(requirements: EarsRequirement[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Grammar validation
  for (const req of requirements) {
    const grammarError = validateEarsGrammar(req);
    if (grammarError) {
      issues.push({
        type: "incompleteness",
        severity: "medium",
        description: grammarError,
        requirementIds: [req.id],
        suggestion: `Rewrite "${req.id}" to follow the ${EARS_PATTERNS[req.pattern].template} pattern.`,
      });
    }
  }

  // Conflict detection (pairwise)
  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      const conflict = detectConflict(requirements[i], requirements[j]);
      if (conflict) {
        issues.push({
          type: "conflict",
          severity: "high",
          description: conflict,
          requirementIds: [requirements[i].id, requirements[j].id],
          suggestion: "Review both requirements and reconcile the contradiction. One may need to be scoped with a 'Where' condition.",
        });
      }
    }
  }

  // Ambiguity detection
  for (const req of requirements) {
    const ambiguities = detectAmbiguity(req);
    for (const amb of ambiguities) {
      issues.push({
        type: "ambiguity",
        severity: "low",
        description: amb,
        requirementIds: [req.id],
        suggestion: "Replace the ambiguous term with an explicit, measurable condition.",
      });
    }
  }

  // Check for missing edge cases (incompleteness heuristics)
  const allStatements = requirements.map((r) => r.statement.toLowerCase()).join(" ");
  const missingPatterns: Array<{ pattern: string; issue: string; severity: "medium" | "low" }> = [
    { pattern: "error", issue: "No error handling requirement found", severity: "medium" },
    { pattern: "invalid", issue: "No validation for invalid input specified", severity: "medium" },
    { pattern: "empty", issue: "No handling for empty/null states specified", severity: "low" },
    { pattern: "unauthorized", issue: "No unauthorized access scenario specified", severity: "medium" },
    { pattern: "timeout", issue: "No timeout behavior specified", severity: "low" },
  ];

  for (const { pattern, issue, severity } of missingPatterns) {
    if (!allStatements.includes(pattern)) {
      const reqIds = requirements.map((r) => r.id);
      issues.push({
        type: "incompleteness",
        severity,
        description: issue,
        requirementIds: reqIds,
        suggestion: `Add a requirement covering the "${pattern}" scenario using the appropriate EARS pattern.`,
      });
    }
  }

  return issues;
}

/**
 * Formats analysis results to markdown.
 */
export function formatAnalysisReport(issues: AnalysisIssue[]): string {
  if (issues.length === 0) {
    return `## Requirements Analysis\n\n✅ **No issues found.** All requirements pass EARS grammar validation with no conflicts or ambiguities.\n`;
  }

  const lines: string[] = [];
  lines.push(`## Requirements Analysis\n`);

  const bySeverity: Record<string, AnalysisIssue[]> = { high: [], medium: [], low: [] };
  for (const issue of issues) {
    bySeverity[issue.severity]?.push(issue);
  }

  if (bySeverity.high.length > 0) {
    lines.push("### 🔴 High Severity\n");
    for (const issue of bySeverity.high) {
      lines.push(`- **${issue.type}**: ${issue.description}`);
      lines.push(`  - Affects: ${issue.requirementIds.join(", ")}`);
      lines.push(`  - Suggestion: ${issue.suggestion}`);
      lines.push("");
    }
  }

  if (bySeverity.medium.length > 0) {
    lines.push("### 🟡 Medium Severity\n");
    for (const issue of bySeverity.medium) {
      lines.push(`- **${issue.type}**: ${issue.description}`);
      lines.push(`  - Suggestion: ${issue.suggestion}`);
      lines.push("");
    }
  }

  if (bySeverity.low.length > 0) {
    lines.push("### 🔵 Low Severity\n");
    for (const issue of bySeverity.low) {
      lines.push(`- ${issue.description}`);
      lines.push(`  - Suggestion: ${issue.suggestion}`);
      lines.push("");
    }
  }

  lines.push(`---\n${issues.length} issue(s) found.\n`);

  return lines.join("\n");
}
