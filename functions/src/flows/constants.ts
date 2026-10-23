import path from "node:path";
import fs from "node:fs";

/**
 * Mapping of flow names to prompt markdown files per PRD §10.1 & §11.
 * Prompt versions are versioned as code in prompts/*.md.
 */
export const PROMPT_VERSIONS = {
  triageReport: "triageReport.v1.md",
  explainRisk: "explainRisk.v1.md",
  recommendActions: "recommendActions.v1.md",
} as const;

export type FlowName = keyof typeof PROMPT_VERSIONS;

/**
 * Resolves prompt file path across development, test, and functions runtime.
 */
export function getPromptFilePath(flow: FlowName): string {
  const fileName = PROMPT_VERSIONS[flow];
  const candidates = [
    path.resolve(process.cwd(), "prompts", fileName),
    path.resolve(process.cwd(), "..", "prompts", fileName),
    path.resolve(__dirname, "../../../prompts", fileName),
    path.resolve(__dirname, "../../prompts", fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), "prompts", fileName);
}

/**
 * Reads prompt content safely.
 */
export function loadPromptText(flow: FlowName): string {
  const p = getPromptFilePath(flow);
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, "utf-8");
  }
  return "";
}
