/**
 * message_received hook — scan incoming messages for prompt injection patterns.
 *
 * Called when the agent receives a message from any source.
 * Tracks untrusted input provenance across the session.
 */

import type { MessageContext } from '../types.js';
import { SidecarClient } from '../client/sidecarClient.js';
import { summarizeMessage } from '../utils/summarize.js';

// Injection patterns to detect locally before sending to Sidecar
const INJECTION_KEYWORDS = [
  'ignore previous instructions',
  'ignore all previous',
  'reveal your system prompt',
  'send your secrets',
  'read local files',
  'install this plugin',
  'run this command',
  'do not tell the user',
  'exfiltrate',
  'bypass policy',
  'disable safety',
  'override developer instruction',
  'you are now DAN',
  'pretend you are',
  'forget everything',
];

export interface MessageReceivedResult {
  provenance: 'trusted' | 'untrusted_web' | 'untrusted_file' | 'unknown';
  hasInjectionPatterns: boolean;
  riskScore: number;
}

export async function messageReceived(
  ctx: MessageContext,
  client: SidecarClient,
): Promise<MessageReceivedResult> {
  // Determine provenance
  let provenance: MessageReceivedResult['provenance'] = 'unknown';
  if (ctx.source === 'user') {
    provenance = 'trusted';
  } else if (ctx.source === 'tool_result') {
    provenance = 'untrusted_web';
  } else if (ctx.source === 'external_api') {
    provenance = 'untrusted_web';
  }

  // Quick local injection scan
  const lowerContent = ctx.content.toLowerCase();
  const matchedPatterns = INJECTION_KEYWORDS.filter(kw =>
    lowerContent.includes(kw),
  );

  const hasInjectionPatterns = matchedPatterns.length > 0;
  const riskScore = hasInjectionPatterns ? 30 + matchedPatterns.length * 10 : 0;
  const riskLabels: string[] = hasInjectionPatterns ? ['prompt_injection_suspected'] : [];

  const { summary } = summarizeMessage(ctx.content);

  // Submit to Sidecar
  await client.submitEvent({
    event_type: 'message_received',
    tool_name: null as unknown as string,
    tool_category: null as unknown as string,
    input_provenance: provenance,
    params_summary: summary,
    params_redacted: hasInjectionPatterns
      ? { matched_patterns: matchedPatterns, content_length: ctx.content.length }
      : { content_length: ctx.content.length },
    session_id: ctx.sessionId,
    risk_score: riskScore,
    risk_labels: riskLabels,
    content_uploaded: false,
  });

  return { provenance, hasInjectionPatterns, riskScore };
}
