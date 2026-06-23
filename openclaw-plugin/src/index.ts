/**
 * FleetGuard Plugin for OpenClaw Gateway
 * =======================================
 *
 * Entry point — registers hooks with OpenClaw and orchestrates
 * the governance flow: intercept → evaluate → decide → enforce.
 *
 * Architecture:
 *   OpenClaw Hook → Plugin Hook Handler → SidecarClient → local Sidecar → Control Center
 *
 * Session state is tracked per-session to accumulate risk context
 * (e.g., if a session saw untrusted input, subsequent tool calls get higher risk scores).
 */

import { SidecarClient } from './client/sidecarClient.js';
import { beforeToolCall } from './hooks/beforeToolCall.js';
import { afterToolCall } from './hooks/afterToolCall.js';
import { messageReceived } from './hooks/messageReceived.js';
import { messageSending } from './hooks/messageSending.js';
import { beforeInstall } from './hooks/beforeInstall.js';
import type {
  ToolCallContext, ToolResultContext, MessageContext,
  InstallContext, SessionState,
} from './types.js';

// ── Plugin Configuration ──────────────────────────────────────────

const PLUGIN_NAME = 'fleetguard-openclaw-plugin';
const PLUGIN_VERSION = '0.1.0';
const SIDECAR_URL = process.env.FG_SIDECAR_URL || 'http://127.0.0.1:18900';

// ── Session Management ────────────────────────────────────────────

const sessions = new Map<string, SessionState>();

function getSession(sessionId: string): SessionState {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      hasUntrustedInput: false,
      pendingApprovals: new Set(),
      riskScore: 0,
    };
    sessions.set(sessionId, session);
  }
  return session;
}

// ── Plugin Lifecycle ──────────────────────────────────────────────

const client = new SidecarClient(SIDECAR_URL);

let pluginActive = true;

/**
 * Called by OpenClaw when the plugin is loaded.
 * Verifies Sidecar connectivity and reports plugin_loaded event.
 */
export async function onLoad(): Promise<void> {
  console.log(`[${PLUGIN_NAME}] v${PLUGIN_VERSION} loading...`);

  try {
    const status = await client.getStatus();
    console.log(`[${PLUGIN_NAME}] Sidecar connected: device=${status.device_id}, status=${status.status}`);
  } catch {
    console.warn(`[${PLUGIN_NAME}] ⚠️  Sidecar not reachable at ${SIDECAR_URL} — governance disabled`);
    pluginActive = false;
  }

  // Report plugin_loaded to Sidecar
  if (pluginActive) {
    await client.submitEvent({
      event_type: 'plugin_loaded',
      params_summary: `FleetGuard Plugin v${PLUGIN_VERSION} loaded`,
      risk_score: 0,
      risk_labels: [],
      content_uploaded: false,
    }).catch(() => {});
  }
}

/**
 * Called by OpenClaw when the plugin is unloaded.
 */
export async function onUnload(): Promise<void> {
  console.log(`[${PLUGIN_NAME}] Unloading...`);

  // Report unload
  await client.submitEvent({
    event_type: 'plugin_error',
    params_summary: 'Plugin unloaded',
    risk_score: 80,
    risk_labels: ['policy_drift_detected'],
    content_uploaded: false,
  }).catch(() => {});
}

// ── Hook Registrations ────────────────────────────────────────────

/**
 * Hook: before_tool_call
 *
 * Called before ANY tool is executed. This is the primary enforcement point.
 * Returns { allow: true } to proceed, or throws to block.
 */
export async function onBeforeToolCall(ctx: ToolCallContext): Promise<{ allow: boolean; reason: string }> {
  if (!pluginActive) return { allow: true, reason: 'Plugin inactive' };

  const session = getSession(ctx.sessionId);

  // Update context from session state
  ctx.sessionHasUntrustedInput = session.hasUntrustedInput;

  const result = await beforeToolCall(ctx, client);

  // Update session risk
  if (result.action === 'block') {
    session.riskScore += 50;
    return { allow: false, reason: result.reason };
  }

  if (result.action === 'require_approval' && result.approvalId) {
    session.pendingApprovals.add(result.approvalId);
  }

  return { allow: true, reason: result.reason };
}

/**
 * Hook: after_tool_call
 *
 * Called after a tool executes. Inspects results for sensitive data.
 * Fire-and-forget — does not block the agent.
 */
export async function onAfterToolCall(ctx: ToolResultContext): Promise<void> {
  if (!pluginActive) return;
  await afterToolCall(ctx, client);
}

/**
 * Hook: message_received
 *
 * Called when the agent receives a message. Scans for prompt injection
 * and tracks untrusted input provenance for the session.
 */
export async function onMessageReceived(ctx: MessageContext): Promise<{ provenance: string; hasInjection: boolean }> {
  if (!pluginActive) return { provenance: 'unknown', hasInjection: false };

  const result = await messageReceived(ctx, client);
  const session = getSession(ctx.sessionId);

  if (result.hasInjectionPatterns || result.provenance.startsWith('untrusted')) {
    session.hasUntrustedInput = true;
  }
  session.riskScore = Math.min(session.riskScore + result.riskScore, 100);

  return { provenance: result.provenance, hasInjection: result.hasInjectionPatterns };
}

/**
 * Hook: message_sending
 *
 * Called before the agent sends a message externally.
 * Blocks messages containing sensitive data or exfiltration patterns.
 */
export async function onMessageSending(ctx: MessageContext): Promise<{ allow: boolean; reason: string }> {
  if (!pluginActive) return { allow: true, reason: 'Plugin inactive' };

  const session = getSession(ctx.sessionId);
  // Block more aggressively if session has untrusted input
  if (session.hasUntrustedInput && ctx.direction === 'outgoing') {
    // Any outbound message after untrusted input → require high scrutiny
  }

  const result = await messageSending(ctx, client);
  return { allow: result.action === 'allow', reason: result.reason };
}

/**
 * Hook: before_install
 *
 * Called before installing a new skill or plugin.
 * Blocks or requires approval for untrusted sources.
 */
export async function onBeforeInstall(ctx: InstallContext): Promise<{ allow: boolean; reason: string }> {
  if (!pluginActive) return { allow: true, reason: 'Plugin inactive' };

  const result = await beforeInstall(ctx, client);
  return { allow: result.action === 'allow', reason: result.reason };
}

// ── Export for OpenClaw plugin system ─────────────────────────────

export default {
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  onLoad,
  onUnload,
  hooks: {
    before_tool_call: onBeforeToolCall,
    after_tool_call: onAfterToolCall,
    message_received: onMessageReceived,
    message_sending: onMessageSending,
    before_install: onBeforeInstall,
  },
};
