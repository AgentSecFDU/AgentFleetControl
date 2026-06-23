/**
 * Summarize tool parameters and results for reporting.
 *
 * Only uploads summaries — not full content.
 * Redacts sensitive fields before summarization.
 */

import { redactParams } from './redact.js';

export function summarizeParams(
  toolName: string,
  params: Record<string, unknown>,
): { summary: string; redacted: Record<string, unknown> } {
  const redacted = redactParams(params);

  // Build a concise summary
  const keys = Object.keys(redacted).slice(0, 5);
  const parts = keys.map(k => {
    const v = redacted[k];
    if (typeof v === 'string' && v.length > 80) {
      return `${k}=${v.slice(0, 80)}...`;
    }
    return `${k}=${JSON.stringify(v)}`;
  });

  return {
    summary: `${toolName}(${parts.join(', ') || 'no params'})`,
    redacted,
  };
}

export function summarizeResult(result: string): { summary: string; size: number; isSensitive: boolean } {
  const size = result.length;

  // Check for secrets in the result
  const hasSecret = /(api[_-]?key|token|password|secret|credential)/i.test(result.slice(0, 500));

  let summary: string;
  if (size <= 200) {
    summary = result;
  } else {
    summary = result.slice(0, 200) + `... [${size - 200} more chars]`;
  }

  return { summary, size, isSensitive: hasSecret };
}

export function summarizeMessage(content: string): { summary: string; size: number } {
  const size = content.length;
  if (size <= 200) return { summary: content, size };
  return { summary: content.slice(0, 200) + `... [${size - 200} more chars]`, size };
}
