---
name: ears-spec
description: >
  EARS Spec-Driven Development — Generate requirements in EARS notation
  (Easy Approach to Requirements Syntax), design docs, and dependency-tracked
  tasks. Use when user asks to spec out a feature, write EARS requirements,
  or run the Kiro-inspired spec-driven workflow.
allowed-tools: read write edit bash
---

# EARS Spec-Driven Development

This skill implements the Kiro-inspired Spec-Driven Development workflow using
**EARS (Easy Approach to Requirements Syntax)** notation — a formal grammar for
writing unambiguous, testable software requirements.

## The Five EARS Patterns

Every requirement MUST follow one of these five canonical patterns:

| Pattern | Template | When to Use |
|---------|----------|-------------|
| **Ubiquitous** | `THE SYSTEM SHALL <response>` | Always-active rules (logging, validation basics, security) |
| **Event-Driven** | `WHEN <trigger>, the SYSTEM SHALL <response>` | Reactive behavior (webhooks, user actions, system events) |
| **State-Driven** | `WHILE <state condition>, the SYSTEM SHALL <response>` | State-dependent behavior (maintenance mode, subscription status) |
| **Optional** | `WHERE <feature>, the SYSTEM SHALL <response>` | Feature-flagged behavior (SSO module, caching layer) |
| **Complex** | `<temporal or compound condition>, the SYSTEM SHALL <response>` | Combined conditions (timeouts, compound triggers) |

### Grammar Rules (UPPERCASE Keywords)

1. **Ubiquitous**: MUST start with `THE SYSTEM SHALL`. No additional conditions.
2. **Event-Driven**: MUST start with `WHEN <trigger>`, then `, the SYSTEM SHALL <response>`.
3. **State-Driven**: MUST start with `WHILE <state>`, then `, the SYSTEM SHALL <response>`.
4. **Optional**: MUST start with `WHERE <feature>`, then `, the SYSTEM SHALL <response>`.
5. **Complex**: MUST include a temporal constraint (`WITHIN Nms`) or compound condition (`WHEN X AND Y`), then `, the SYSTEM SHALL <response>`.

Anti-patterns to avoid:
- ❌ `the system should...` — MUST use `THE SYSTEM SHALL`
- ❌ `the system will...` — MUST use `THE SYSTEM SHALL`
- ❌ Lowercase keywords — always write THE SYSTEM SHALL, WHEN, WHILE, WHERE, WITHIN in UPPERCASE
- ❌ "We need to..." — MUST be a user story, not a requirement
- ❌ Vague terms: "appropriate", "timely", "efficient", "user-friendly", "properly", "various"

## Workflow: 3-Document System

Follow this workflow in order:

### Phase 1: Requirements (`/ears:spec`)

1. Ask clarifying questions (2-4) to understand scope, constraints, edge cases
2. Generate user stories in format: "As a <role>, I want <goal>, So that <reason>"
3. For EACH story, generate EARS acceptance criteria — at minimum one requirement
4. Validate grammar with the `ears_validate` tool
5. Analyze requirements with `ears_analyze` to detect conflicts/ambiguities
6. Present to user for approval

### Phase 2: Design (`/ears:design`)

1. Based on approved requirements, generate design document covering:
   - Component architecture (text-based diagram)
   - Data models and API contracts
   - Error handling and validation strategy
   - Testing approach
2. Present to user for approval

### Phase 3: Tasks (`/ears:tasks`)

1. Based on requirements + design, generate task breakdown
2. Each task MUST trace back to requirement IDs
3. Identify task dependencies explicitly
4. Mark parallelizable tasks with `[P]`
5. Use `ears_analyze_deps` to generate execution waves
6. Present to user for approval

### Quick Plan Mode (Fast Track)

For well-understood features, merge Phase 1-3:
1. Ask 2-4 clarifying questions upfront
2. Generate requirements + design + tasks in one pass
3. User reviews the combined output

## File Structure

When a session starts, create this structure under a spec directory:

```
.ears-spec/<feature-name>/
├── requirements.md    # User stories + EARS acceptance criteria
├── design.md          # Architecture, data flow, diagrams
└── tasks.md           # Implementation tasks with dependencies
```

## Terminology

| Term | Meaning |
|------|---------|
| **EARS** | Easy Approach to Requirements Syntax — 5 canonical requirement patterns |
| **SDD** | Spec-Driven Development — specifications are the primary artifact |
| **User Story** | "As a X, I want Y, So that Z" — describes a feature from user perspective |
| **Acceptance Criteria** | Specific, testable conditions that satisfy the story, expressed in EARS |
| **Spec** | The complete requirements document for a feature |
| **Execution Wave** | A set of independent tasks that can run in parallel |
| **Critical Path** | The longest chain of dependent tasks that determines total implementation time |
