/**
 * Prompt Injection detection module per PRD §10.3 and Milestone M6.
 * Detects adversarial prompt injection attempts, system prompt probing,
 * instruction overrides, roleplay markers, and jailbreak attempts
 * in English, Hindi, and Hinglish.
 *
 * Designed to return a diagnostic result ({ hasInjection, matches })
 * without throwing errors or silently blocking.
 */

export interface InjectionScanResult {
  hasInjection: boolean;
  matches: string[];
}

interface InjectionRule {
  name: string;
  pattern: RegExp;
}

const INJECTION_RULES: InjectionRule[] = [
  // Instruction override / ignore previous
  {
    name: "ignore_previous",
    pattern:
      /\b(?:ignore|forget|discard)\s+(?:all\s+)?(?:previous|prior|above)\s*(?:instructions|prompts|rules|commands|context)?\b/i,
  },
  {
    name: "disregard_above",
    pattern:
      /\bdisregard\s+(?:all\s+)?(?:above|previous|prior)\s*(?:instructions|prompts|rules|commands)?\b/i,
  },
  {
    name: "override_instructions",
    pattern:
      /\boverride\s+(?:all\s+)?(?:system|safety|active)?\s*(?:instructions|rules|guardrails|policies)\b/i,
  },

  // System prompt probing
  {
    name: "system_prompt_probe",
    pattern:
      /\b(?:print|show|reveal|display|output|tell\s+me)\s+(?:the\s+)?(?:system\s+)?(?:prompt|instructions|rules)\b/i,
  },
  {
    name: "system_prompt_mention",
    pattern: /\bsystem\s+prompt\b/i,
  },
  {
    name: "print_system_instructions",
    pattern: /\bprint\s+system\s+instructions\b/i,
  },

  // Role manipulation and persona hijacking
  {
    name: "you_are_now",
    pattern: /\byou\s+are\s+now\b/i,
  },
  {
    name: "dan_mode",
    pattern: /\b(?:dan\s+mode|do\s+anything\s+now|jailbreak(?:\s+mode)?)\b/i,
  },
  {
    name: "roleplay_act_as",
    pattern: /\b(?:act\s+as\s+(?:a|an)?|pretend\s+(?:to\s+be|you\s+are)|role-?play\s+as)\b/i,
  },
  {
    name: "developer_mode",
    pattern: /\b(?:developer\s+mode|unrestricted\s+mode|god\s+mode)\b/i,
  },

  // Delimiters & structured tag injection
  {
    name: "structured_tag_delimiter",
    pattern:
      /(?:\[(?:system|instruction|admin)\]|<\/?(?:system|instruction|prompt)>|```(?:system|prompt)|###\s*instruction:?)/i,
  },
  {
    name: "roleplay_speaker_marker",
    pattern: /(?:^|\n)\s*(?:assistant|system|human):\s+/i,
  },

  // Hindi and Hinglish equivalents
  {
    name: "hindi_ignore_instructions",
    pattern:
      /\b(?:pehle\s+ke\s+nirdesh|pichhle\s+nirdesh|sabhi\s+nirdesh)\s+(?:ko\s+)?(?:bhul|bhula)\s+jao\b/i,
  },
  {
    name: "hindi_ignore_devanagari",
    pattern: /(?:पहले\s+के\s+निर्देश|पिछले\s+निर्देश|सभी\s+निर्देश)\s+(?:को\s+)?(?:भूल|भुला)\s+जाओ/u,
  },
  {
    name: "hindi_system_prompt_batao",
    pattern: /\b(?:system\s+prompt|apna\s+prompt)\s+(?:batao|dikhao|print\s+karo)\b/i,
  },
  {
    name: "hindi_system_prompt_devanagari",
    pattern: /(?:सिस्टम\s+प्रॉम्प्ट|अपना\s+प्रॉम्प्ट)\s+(?:बताओ|दिखाओ)/u,
  },
  {
    name: "hindi_you_are_now",
    pattern: /\b(?:tum\s+ab\s+se|aap\s+ab\s+se)\b/i,
  },
  {
    name: "hindi_you_are_now_devanagari",
    pattern: /(?:तुम\s+अब\s+से|आप\s+अब\s+से)/u,
  },
  {
    name: "hindi_ignore_karo",
    pattern: /\b(?:nirdesh|rules?)\s+ignore\s+karo\b/i,
  },
];

/**
 * Scans the provided text for prompt injection patterns.
 * Returns { hasInjection: boolean, matches: string[] }.
 */
export function scanInjection(text: string): InjectionScanResult {
  if (!text) {
    return { hasInjection: false, matches: [] };
  }

  const matches: string[] = [];

  for (const rule of INJECTION_RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      matches.push(match[0]);
    }
  }

  return {
    hasInjection: matches.length > 0,
    matches,
  };
}
