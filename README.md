# EARS Spec Engine

**EARS Spec-Driven Development** — generate requirements in EARS (Easy Approach to Requirements Syntax) notation, design documents, and dependency-tracked tasks directly inside pi. Inspired by Amazon Kiro Spec-Driven Development.

[![npm](https://img.shields.io/npm/v/ears-spec-engine)](https://www.npmjs.com/package/ears-spec-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PI Package](https://img.shields.io/badge/pi-package-blueviolet)](https://pi.dev/packages/ears-spec-engine)

```bash
pi install npm:ears-spec-engine
```

## Features

This extension adds three LLM-callable tools and five user commands for a complete SDD workflow:

### 🛠️ Tools (LLM)

| Tool                | Purpose                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ears_validate`     | EARS grammar validation against the 5 canonical patterns (Ubiquitous, Event-Driven, State-Driven, Optional, Complex) |
| `ears_analyze`      | Analyze requirements for logical conflicts, ambiguous language, and incompleteness (missing edge cases)              |
| `ears_analyze_deps` | Analyze task dependencies, build execution waves, and compute the critical path                                      |

### ⌨️ Commands (user)

| Command            | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `/ears:quick-plan` | Fast-track: clarifying questions + generate all 3 documents in one pass |
| `/ears:spec`       | Phase 1: generate EARS requirements from a feature description          |
| `/ears:analyze`    | Analyze existing requirements (from file or session state)              |
| `/ears:design`     | Phase 2: generate a design document                                     |
| `/ears:tasks`      | Phase 3: generate a task breakdown with dependency analysis             |
| `/ears:status`     | Show current spec engine state                                          |

### 🧩 Nested Skill

The extension automatically registers the `ears-spec` skill, accessible via `/ears-spec`.

## Installation

```bash
# Global install
pi install npm:ears-spec-engine

# Project-local install
pi install -l npm:ears-spec-engine
```

## Usage

### Quick Start (all phases in one pass)

```
/ears:quick-plan <feature description>
```

### Step-by-Step Mode

1. **Requirements**: `/ears:spec <feature description>` — generates user stories + EARS acceptance criteria
2. **Design**: `/ears:design` — architecture, data models, API contracts, error handling
3. **Tasks**: `/ears:tasks` — task breakdown with dependencies and execution waves

### Check Status

```
/ears:status
```

## Example

Running `/ears:spec user authentication` produces this structure:

```
.ears-spec/user-authentication/
├── requirements.md    # User stories + EARS acceptance criteria
├── design.md          # Architecture, data flow, diagrams
└── tasks.md           # Implementation tasks with dependencies
```

### The Five EARS Patterns

| Pattern          | Template                                       | Example                                                                                          |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Ubiquitous**   | `THE SYSTEM SHALL <response>`                  | `THE SYSTEM SHALL hash passwords using bcrypt with cost factor 12.`                              |
| **Event-Driven** | `WHEN <trigger>, the SYSTEM SHALL <response>`  | `WHEN a payment webhook is received, the SYSTEM SHALL verify the HMAC signature.`                |
| **State-Driven** | `WHILE <state>, the SYSTEM SHALL <response>`   | `WHILE the system is in maintenance mode, the SYSTEM SHALL return HTTP 503.`                     |
| **Optional**     | `WHERE <feature>, the SYSTEM SHALL <response>` | `WHERE the enterprise SSO module is enabled, the SYSTEM SHALL validate tokens against SAML IdP.` |
| **Complex**      | `<condition>, the SYSTEM SHALL <response>`     | `WITHIN 500ms of receiving a query, the SYSTEM SHALL return ranked results.`                     |

### Grammar Rules

- ✅ **SHALL** is mandatory (not `should`, `will`, `must`)
- ✅ **UPPERCASE** keywords: `WHEN`, `WHILE`, `WHERE`, `WITHIN`, `THE SYSTEM SHALL`
- ❌ Banned ambiguous terms: `appropriate`, `timely`, `efficient`, `user-friendly`, `properly`, `various`

## Development

```bash
# Clone
git clone git@github.com:XpycT/ears-spec-engine.git
cd ears-spec-engine

# Install dependencies
npm install

# Run tests
npm test
```

All tests use Node's built-in `node:test` runner:

```
npm test
# 68 tests — 12 suites, all pass
```

## Architecture

```
ears-spec-engine/
├── index.ts           # Extension entry point (tool and command registration)
├── lib/
│   ├── types.ts       # TypeScript type definitions
│   ├── ears.ts        # EARS validation, conflict detection, analysis
│   └── templates.ts   # Document rendering and dependency graph analysis
├── skills/
│   └── ears-spec/
│       └── SKILL.md   # Nested skill definition
├── package.json
├── tsconfig.json
└── README.md
```

## Why

Spec-Driven Development with EARS notation enables:

1. **Testable requirements** — formal grammar eliminates ambiguity
2. **Automated quality checks** — tools validate grammar, detect conflicts, and find gaps
3. **Implementation planning** — tasks with explicit dependencies and execution waves
4. **Requirement traceability** — every task links back to a requirement ID

## License

MIT
