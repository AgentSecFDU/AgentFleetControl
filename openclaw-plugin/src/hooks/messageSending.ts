/**
 * message_sending hook — block outbound messages containing sensitive data.
 *
 * Called BEFORE the agent sends a message to an external recipient.
 * Checks for:
 * - External recipient (email, Slack, etc.)
 * - Sensitive content in the message body
 * - Data exfiltration patterns
 */

import type { MessageContext } from '../types.js';
import { SidecarClient } from '../client/sidecarClient.js';

const SENSITIVE_CONTENT_PATTERNS = [
  /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /AKIA[A-Z0-9]{16}/,  // AWS Access Key
];

export async function messageSending(
  ctx: MessageContext,
  client: SidecarClient,
): Promise<{ action: 'allow' | 'block'; reason: string }> {
  // Detect external recipient
  const isExternal = !!ctx.recipient || ctx.channel === 'email' || ctx.channel === 'slack';

  // Scan for sensitive content
  let hasSensitive = false;
  let matchedPattern = '';
  for (const pattern of SENSITIVE_CONTENT_PATTERNS) {
    const match = ctx.content.match(pattern);
    if (match) {
      hasSensitive = true;
      matchedPattern = match[0].slice(0, 20) + '...';
      break;
    }
  }

  // Check for pastebin/file sharing links
  const hasExfilLink = /(pastebin\.com|paste\.ee|hastebin\.com|termbin\.com|transfer\.sh|file\.io|webhook\.site)/i.test(ctx.content);

  const riskScore = (hasSensitive ? 50 : 0) + (hasExfilLink ? 30 : 0) + (isExternal ? 20 : 0);
  const riskLabels: string[] = [];
  if (hasSensitive) riskLabels.push('secret_detected');
  if (hasExfilLink) riskLabels.push('potential_exfiltration');
  if (isExternal) riskLabels.push('external_communication');

  const decision = await client.submitEvent({
    event_type: 'message_sending',
    tool_name: 'send_message',
    tool_category: 'message',
    params_summary: `Outbound message to ${ctx.recipient || ctx.channel || 'unknown'} (${ctx.content.length} chars)`,
    params_redacted: {
      recipient: ctx.recipient,
      channel: ctx.channel,
      has_sensitive: hasSensitive,
      has_exfil_link: hasExfilLink,
      content_length: ctx.content.length,
    },
    session_id: ctx.sessionId,
    risk_score: riskScore,
    risk_labels: riskLabels,
    content_uploaded: false,
  });

  if (decision.decision === 'block') {
    return { action: 'block', reason: decision.reason };
  }

  return { action: 'allow', reason: 'Allowed' };
}
