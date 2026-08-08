export const DIRECT_FLOW_PROMPT = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly.

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
- CRITICAL: Copy the excerpt as one CONTINUOUS run of text. Never weld two separate
  passages together with "..." and never add emphasis or edits of your own. The app
  checks each excerpt against the article and flags any that is not found there.
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
}

Article text:
`;

export function createDirectFlowContinuationPrompt(chunkIndex: number, totalChunks: number): string {
  return `Continue analyzing the article for attack techniques. This is part ${chunkIndex + 1} of ${totalChunks}.
      
IMPORTANT: Return additional nodes and edges in the same JSON format. 
Increment node IDs from where the previous chunk left off (e.g., if last was "action-5", start with "action-6").

Article text (continuation):
`;
}