/**
 * before_tool_call hook — the most critical interception point.
 *
 * Called BEFORE every tool execution. The Plugin must:
 * 1. Classify the tool
 * 2. Redact sensitive parameters
 * 3. Send event to Sidecar for policy evaluation
 * 4. Execute the decision: allow / block / require_approval
 */

import type { ToolCallContext } from '../types.js';
import { SidecarClient } from '../client/sidecarClient.js';
import { classifyTool, baseToolRisk } from '../utils/classifyTool.js';
import { summarizeParams } from '../utils/summarize.js';

export interface BeforeToolCallResult {
  action: 'allow' | 'block' | 'require_approval';
  reason: string;
  approvalId?: string;
}

export async function beforeToolCall(
  ctx: ToolCallContext,
  client: SidecarClient,
): Promise<BeforeToolCallResult> {
  const category = classifyTool(ctx.toolName);
  const { summary, redacted } = summarizeParams(ctx.toolName, ctx.toolParams);

  // Compute basic risk indicators
  const riskScore = baseToolRisk(category) + (ctx.sessionHasUntrustedInput ? 20 : 0);
  const riskLabels: string[] = [];
  if (ctx.sessionHasUntrustedInput) riskLabels.push('untrusted_input_in_session');

  // Submit to Sidecar for policy evaluation
  const decision = await client.submitEvent({
    event_type: 'before_tool_call',
    tool_name: ctx.toolName,
    tool_category: category,
    input_provenance: ctx.inputProvenance,
    params_summary: summary,
    params_redacted: redacted,
    session_id: ctx.sessionId,
    agent_id: ctx.agentId,
    run_id: ctx.runId,
    risk_score: riskScore,
    risk_labels: riskLabels,
    content_uploaded: false,
  });

  // Execute the Sidecar's decision
  switch (decision.decision) {
    case 'block':
      return { action: 'block', reason: decision.reason };

    case 'require_approval': {
      // Create approval request via Sidecar
      const approval = await client.requestApproval({
        approval_id: '', // Sidecar generates this
        event_id: decision.event_id || '',
        tool_name: ctx.toolName,
        params_summary: summary,
        risk_score: riskScore,
        risk_labels: riskLabels,
        reason: decision.reason,
        session_id: ctx.sessionId,
        run_id: ctx.runId,
      });

      // Long-poll for admin decision
      const result = await client.waitApproval(approval.approval_id);
      if (result.status === 'approved') {
        return { action: 'allow', reason: 'Approved by admin', approvalId: approval.approval_id };
      }
      return { action: 'block', reason: result.decision_reason || 'Denied by admin' };
    }

    default:
      return { action: 'allow', reason: decision.reason || 'Allowed by policy' };
  }
}
