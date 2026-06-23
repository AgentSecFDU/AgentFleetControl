/**
 * Classify a tool call into a category for policy evaluation and risk scoring.
 *
 * Categories: shell | file | network | message | browser | plugin | memory | unknown
 */

const SHELL_TOOLS = new Set([
  'exec', 'bash', 'sh', 'shell', 'terminal', 'command', 'run',
  'spawn', 'popen', 'system',
]);

const FILE_TOOLS = new Set([
  'read', 'write', 'edit', 'cat', 'ls', 'list', 'open', 'save',
  'create', 'delete', 'rm', 'mv', 'cp', 'mkdir', 'touch',
  'file_read', 'file_write', 'read_file', 'write_file',
]);

const NETWORK_TOOLS = new Set([
  'fetch', 'curl', 'wget', 'http', 'https', 'request', 'api_call',
  'download', 'upload', 'web_fetch', 'web_request',
]);

const MESSAGE_TOOLS = new Set([
  'send_message', 'send', 'message', 'email', 'mail',
  'slack', 'notify', 'post_message', 'reply',
]);

const BROWSER_TOOLS = new Set([
  'browse', 'browser', 'navigate', 'click', 'type', 'screenshot',
  'puppeteer', 'playwright', 'selenium',
]);

const PLUGIN_TOOLS = new Set([
  'install', 'plugin_install', 'skill_install', 'uninstall',
  'plugin_add', 'skill_add',
]);

const MEMORY_TOOLS = new Set([
  'memory', 'remember', 'store', 'save_context', 'update_memory',
  'set_config', 'update_config',
]);

export type ToolCategory = 'shell' | 'file' | 'network' | 'message' | 'browser' | 'plugin' | 'memory' | 'unknown';

export function classifyTool(toolName: string): ToolCategory {
  const name = toolName.toLowerCase();
  if (SHELL_TOOLS.has(name)) return 'shell';
  if (FILE_TOOLS.has(name)) return 'file';
  if (NETWORK_TOOLS.has(name)) return 'network';
  if (MESSAGE_TOOLS.has(name)) return 'message';
  if (BROWSER_TOOLS.has(name)) return 'browser';
  if (PLUGIN_TOOLS.has(name)) return 'plugin';
  if (MEMORY_TOOLS.has(name)) return 'memory';
  return 'unknown';
}

/** Quick risk baseline per tool category. */
export function baseToolRisk(category: ToolCategory): number {
  switch (category) {
    case 'shell': return 40;
    case 'file': return 20;
    case 'network': return 30;
    case 'message': return 30;
    case 'browser': return 30;
    case 'plugin': return 50;
    case 'memory': return 30;
    default: return 10;
  }
}
