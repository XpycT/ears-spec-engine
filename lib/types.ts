/**
 * Type definitions for the EARS Spec Engine extension.
 */

/** EARS requirement pattern types */
export type EarsPattern = "ubiquitous" | "event-driven" | "state-driven" | "optional" | "complex";

/** A single EARS requirement */
export interface EarsRequirement {
  id: string;
  pattern: EarsPattern;
  statement: string;
  storyId: string;
}

/** A user story containing EARS requirements */
export interface UserStory {
  id: string;
  title: string;
  asA: string;
  wantTo: string;
  soThat: string;
  requirements: EarsRequirement[];
}

/** A requirements document */
export interface RequirementsDocument {
  title: string;
  stories: UserStory[];
}

/** A design document section */
export interface DesignSection {
  title: string;
  content: string;
}

/** A design document */
export interface DesignDocument {
  title: string;
  sections: DesignSection[];
}

/** A task with dependencies */
export interface SpecTask {
  id: string;
  title: string;
  description: string;
  requirementIds: string[];
  dependencies: string[];
  parallel: boolean;
}

/** Task dependency graph analysis result */
export interface DependencyAnalysis {
  waves: SpecTask[][];
  criticalPath: string[];
}

/** A requirements analysis issue */
export interface AnalysisIssue {
  type: "conflict" | "ambiguity" | "incompleteness" | "redundancy";
  severity: "high" | "medium" | "low";
  description: string;
  requirementIds: string[];
  suggestion: string;
}

/** Spec engine state */
export interface SpecEngineState {
  projectRoot: string;
  currentSpecsDir: string;
  requirements?: RequirementsDocument;
  design?: DesignDocument;
  tasks?: SpecTask[];
  lastAnalysis?: AnalysisIssue[];
}
