/**
 * The prompt that shapes the graph (/api/analyze-stream).
 *
 * One copy, used by every provider. It used to be three: each of
 * claude/openai/ollama built the same text inline, so a change had to be made
 * in three places or the providers would quietly disagree about what a node
 * is. A fourth copy lived client-side and was never imported at all, which is
 * how the two drifted apart without anyone noticing — the unused one named the
 * data fields the app actually reads (`tactic_id`, `tactic_name`), while the
 * three live ones asked for `tactic`, so every AFB export shipped a null
 * tactic. This file is the version the code agrees with.
 */

/** Matches the cap the providers applied inline. */
const MAX_ARTICLE_CHARS = 50000;

const INSTRUCTIONS = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly.

IMPORTANT: Return only a valid JSON object with "nodes" and "edges" arrays. No text before or after.

CRITICAL ORDERING FOR STREAMING VISUALIZATION:
1. Order ALL nodes strictly chronologically based on the attack timeline
2. In the "edges" array, place each edge IMMEDIATELY after its corresponding source node appears in the "nodes" array
3. Group by attack stages in order: Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → Exfiltration → Command & Control → Impact
4. This creates a narrative flow where connections appear as the story unfolds
5. IMPORTANT: The order of items in BOTH arrays matters for real-time streaming

Extract from the ENTIRE article including main text, IOC sections, detection/prevention recommendations, and technical appendices. Be thorough - extract ALL techniques mentioned or implied.

OUTPUT FORMAT: Create React Flow nodes and edges using ONLY these official AFB node types:
- **action**: MITRE ATT&CK techniques (T1078, T1190, etc.)
- **tool**: Legitimate software used in attacks (net.exe, powershell.exe, etc.)
- **malware**: Malicious software (webshells, backdoors, trojans, etc.)
- **asset**: Target systems and resources (servers, workstations, databases, etc.)
- **infrastructure**: Adversary-controlled resources (C2 servers, domains, IP addresses)
- **url**: Web resources and links (malicious URLs, download links)
- **vulnerability**: Only CVE-identified vulnerabilities (CVE-YYYY-NNNN format)
- **AND_operator**: Logic gates requiring ALL conditions
- **OR_operator**: Logic gates where ANY condition can be met

STRICT EXTRACTION RULES - NO SPECULATION OR INFERENCE:
- ONLY extract information explicitly stated in the source text
- Command-line executions → tool nodes ONLY if exact commands are quoted in the article
- Malicious files/scripts → malware nodes ONLY if specific file names/hashes are mentioned
- IP addresses and domains → infrastructure nodes ONLY if explicitly listed
- Target computers/networks → asset nodes ONLY if specifically named in the text
- Web links → url nodes ONLY if actual URLs are provided
- Only CVEs → vulnerability nodes ONLY if CVE numbers are explicitly mentioned
- DO NOT infer, assume, or generate plausible technical details not in the source
- DO NOT create example commands or typical attack patterns
- If technical details are vague, keep descriptions general
- CRITICAL: For command_line fields, ONLY include commands explicitly quoted in the article
- CRITICAL: Each source_excerpt must be 2-3 complete sentences directly copied from the source text
- Source excerpts are used to validate extraction accuracy - they must prove the node exists in the source
- CRITICAL: Copy the excerpt as one CONTINUOUS run of text - a span you could
  highlight with one drag in the article - and add no emphasis or edits of your own.
  If no single passage supports the node, quote the shortest one that does rather
  than joining two. The app checks each excerpt against the article and flags any
  that is not found there, however the join is punctuated.
- CRITICAL: The excerpt must justify the SPECIFIC technique_id you assign, not merely
  that some node belongs here. Sub-techniques are a claim about the evidence: only use
  one when the excerpt shows that exact variant. If the evidence is about a different
  variant, or spans several, use the PARENT technique instead (e.g. T1589, not
  T1589.002) - or split it into one node per variant, each with its own excerpt.
  A precise id on vague evidence is worse than an honest general one.

EDGE TYPES (Create connections that show attack progression):
- action → tool/malware: "Uses"
- action → asset: "Targets"
- action → infrastructure: "Communicates with"
- action → url: "Connects to"
- vulnerability → asset: "Affects"
- action → action: "Leads to" (IMPORTANT: Connect actions in chronological sequence)

NARRATIVE FLOW INSTRUCTIONS:
1. Start with Initial Access techniques (TA0001)
2. Progress through Execution → Persistence → Privilege Escalation → etc.
3. Connect each action to the next logical step in the attack timeline
4. Use "Leads to" edges to show attack progression between techniques
5. Order nodes so the attack story unfolds from top to bottom

CRITICAL JSON FORMAT - Follow this EXACT structure:
{
  "nodes": [
    ONLY NODE OBJECTS HERE - NO EDGE OBJECTS IN THIS ARRAY
    {
      "id": "action-1",
      "type": "action",
      "data": {
        "type": "action",
        "name": "Valid Accounts",
        "description": "How this technique was used in this specific attack",
        "technique_id": "T1078",
        "tactic_id": "TA0001",
        "tactic_name": "Initial Access",
        "source_excerpt": "2-3 complete sentences directly quoted from the source article that support this technique. Include surrounding context to validate the extraction.",
        "confidence": "high"
      }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "data": {
        "type": "tool",
        "name": "Net.exe",
        "description": "Used to enumerate domain users",
        "command_line": "net user /domain",
        "source_excerpt": "2-3 complete sentences from the source that mention this specific command or tool usage",
        "confidence": "high"
      }
    },
    {
      "id": "asset-1",
      "type": "asset",
      "data": {
        "type": "asset",
        "name": "Domain Controller",
        "description": "Target system compromised",
        "role": "Server",
        "source_excerpt": "2-3 complete sentences from the source describing this asset or target system",
        "confidence": "high"
      }
    }
  ],
  "edges": [
    ONLY EDGE OBJECTS HERE - NO NODE OBJECTS IN THIS ARRAY
    {
      "id": "edge-1",
      "source": "action-1",
      "target": "tool-1",
      "type": "floating",
      "label": "Uses"
    },
    {
      "id": "edge-2",
      "source": "action-1",
      "target": "asset-1",
      "type": "floating",
      "label": "Targets"
    }
  ]
}`;

/** The default persona, used when the caller sends no system prompt. */
export const DEFAULT_ANALYSIS_SYSTEM = 'You are an expert in cyber threat intelligence analysis.';

/**
 * The user-turn prompt: the instructions above followed by the article.
 *
 * Vision output is folded in ahead of the article text rather than sent
 * separately, because a screenshot's contents are evidence the same way the
 * prose is — a node grounded in one is as real as a node grounded in the other.
 */
export function buildAnalysisPrompt({ text, visionAnalysis }) {
  const body = visionAnalysis
    ? `## Image Analysis Results\n\n${visionAnalysis}\n\n## Article Text\n\n${text}`
    : text;

  return `${INSTRUCTIONS}

Article: "${(body ?? '').substring(0, MAX_ARTICLE_CHARS)}"
`;
}
