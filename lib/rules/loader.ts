import type { RuleSet } from "@/lib/types";
import supabaseV1 from "./rulesets/supabase-v1.json";

const RULESETS: Record<string, RuleSet> = {
  "supabase-v1": supabaseV1 as RuleSet,
};

/** The currently active ruleset for external/monitor scans. */
export const ACTIVE_RULESET_ID = "supabase-v1";

export function getActiveRuleSet(): RuleSet {
  return RULESETS[ACTIVE_RULESET_ID];
}

export function getRuleSet(id: string): RuleSet | undefined {
  return RULESETS[id];
}

export function allRuleSets(): RuleSet[] {
  return Object.values(RULESETS);
}
