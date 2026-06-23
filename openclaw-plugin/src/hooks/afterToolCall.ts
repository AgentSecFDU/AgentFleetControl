/**
 * after_tool_call hook — inspect tool results for sensitive data leakage.
 *
 * Called AFTER a tool executes. Checks for:
 * - Secrets in the output
 * - Suspicious content
 * - Large data transfers
 */

import type { ToolResultContext } from '../types.js';
import { SidecarClient } from '../client/sidecarClient.js';
import { classifyTool } from '../utils/classifyTool.js';
import { summarizeResult } from '../utils/summarize.js';

export async function afterToolCall(
  ctx: ToolResultContext,
  client: SidecarClient,
): Promise<void> {
  const category = classifyTool(ctx.toolName);
  const { summary, size, isSensitive } = summarizeResult(ctx.result);

  const riskLabels: string[] = [];
  if (isSensitive) riskLabels.push('secret_detected_in_output');
  if (size > 10_000) riskLabels.push('large_data_transfer');

  // Report to Sidecar (fire-and-forget, no blocking)
  await client.submitEvent({
    event_type: 'after_tool_call',
    tool_name: ctx.toolName,
    tool_category: category,
    params_summary: summary,
    params_redacted: { result_size: size, is_error: ctx.isError },
    session_id: ctx.sessionId,
    agent_id: ctx.agentId,
    run_id: ctx.runId,
    risk_score: isSensitive ? 40 : (size > 10_000 ? 20 : 0),
    risk_labels: riskLabels,
    content_uploaded: false,
  });
}
