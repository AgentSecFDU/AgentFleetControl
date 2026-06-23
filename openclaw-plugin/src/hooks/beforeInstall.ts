/**
 * before_install hook — intercept plugin/skill installation.
 *
 * Called BEFORE a new skill or plugin is installed.
 * Checks source against allowlist and requires approval for untrusted sources.
 */

import type { InstallContext } from '../types.js';
import { SidecarClient } from '../client/sidecarClient.js';

// Known-safe registries
const TRUSTED_SOURCES = [
  'enterprise_registry',
  'local_allowlist',
  'openclaw-registry',
  'github.com/your-org/',  // Company GitHub org
];

export async function beforeInstall(
  ctx: InstallContext,
  client: SidecarClient,
): Promise<{ action: 'allow' | 'block' | 'require_approval'; reason: string }> {
  // Check if source is trusted
  const isTrusted = TRUSTED_SOURCES.some(s =>
    ctx.source.includes(s) || ctx.source === s,
  );

  // Check signature if available
  const hasSignature = !!ctx.signature;
  // In a real implementation, we'd verify the signature against a known public key

  const riskScore = isTrusted ? 10 : (hasSignature ? 30 : 50);
  const riskLabels: string[] = [];
  if (!isTrusted) riskLabels.push('untrusted_source');
  if (!hasSignature) riskLabels.push('unsigned_package');

  const decision = await client.submitEvent({
    event_type: 'before_install',
    tool_name: ctx.name,
    tool_category: ctx.type,
    params_summary: `Install ${ctx.type} "${ctx.name}" from ${ctx.source}`,
    params_redacted: {
      type: ctx.type,
      name: ctx.name,
      source: ctx.source,
      has_signature: hasSignature,
    },
    risk_score: riskScore,
    risk_labels: riskLabels,
    content_uploaded: false,
  });

  if (decision.decision === 'block') {
    return { action: 'block', reason: decision.reason };
  }

  if (decision.decision === 'require_approval' || (!isTrusted && !hasSignature)) {
    return {
      action: 'require_approval',
      reason: `Installation of "${ctx.name}" from ${ctx.source} requires admin approval`,
    };
  }

  return { action: 'allow', reason: 'Trusted source' };
}
