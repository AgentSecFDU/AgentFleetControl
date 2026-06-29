#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
# OpenClaw 配置助手
#
# 帮助员工配置 API Key、选择模型提供商、设置自定义 API 地址。
#
# 交互模式（默认）：
#   setup-openclaw
#
# 非交互模式（CI / docker-compose 环境变量）：
#   OPENCLAW_PROVIDER=openrouter \
#   OPENCLAW_API_KEY=sk-or-xxx \
#   OPENCLAW_MODEL=openrouter/anthropic/claude-sonnet-4 \
#   setup-openclaw --non-interactive
# ────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
OPENCLAW_DIR="${HOME}/.openclaw"
CONFIG_FILE="${OPENCLAW_DIR}/openclaw.json"
ENV_FILE="${OPENCLAW_DIR}/.env"
NON_INTERACTIVE=false

# ── 参数解析 ────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --non-interactive|-n) NON_INTERACTIVE=true ;;
    --help|-h)
      echo "用法: setup-openclaw [--non-interactive|-n]"
      echo ""
      echo "交互模式：一步步引导配置"
      echo "非交互模式：从环境变量读取配置"
      echo ""
      echo "环境变量："
      echo "  OPENCLAW_PROVIDER   - 提供商: anthropic|openai|openrouter|gemini|deepseek|custom"
      echo "  OPENCLAW_API_KEY    - API Key"
      echo "  OPENCLAW_MODEL      - 模型 ID（可选，有默认值）"
      echo "  OPENCLAW_BASE_URL   - 自定义 API 地址（仅 custom 提供商需要）"
      exit 0
      ;;
  esac
done

# ── 默认模型映射 ────────────────────────────────────────────────────
declare -A DEFAULT_MODELS
DEFAULT_MODELS[anthropic]="anthropic/claude-sonnet-4"
DEFAULT_MODELS[openai]="openai/gpt-4o"
DEFAULT_MODELS[openrouter]="openrouter/anthropic/claude-sonnet-4"
DEFAULT_MODELS[gemini]="google/gemini-2.5-flash"
DEFAULT_MODELS[deepseek]="deepseek/deepseek-chat"
DEFAULT_MODELS[custom]="openai/gpt-4o"

declare -A ENV_KEY_NAMES
ENV_KEY_NAMES[anthropic]="ANTHROPIC_API_KEY"
ENV_KEY_NAMES[openai]="OPENAI_API_KEY"
ENV_KEY_NAMES[openrouter]="OPENROUTER_API_KEY"
ENV_KEY_NAMES[gemini]="GEMINI_API_KEY"
ENV_KEY_NAMES[deepseek]="DEEPSEEK_API_KEY"
ENV_KEY_NAMES[custom]="OPENAI_API_KEY"

# ── 确保目录存在 ────────────────────────────────────────────────────
mkdir -p "${OPENCLAW_DIR}"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║         OpenClaw 配置助手                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 非交互模式 ──────────────────────────────────────────────────────
if [ "$NON_INTERACTIVE" = true ]; then
  echo -e "${YELLOW}→ 非交互模式：从环境变量读取配置${NC}"

  if [ -z "${OPENCLAW_PROVIDER:-}" ]; then
    echo -e "${RED}❌ OPENCLAW_PROVIDER 未设置${NC}"
    echo "  可选值: anthropic, openai, openrouter, gemini, deepseek, custom"
    exit 1
  fi

  if [ -z "${OPENCLAW_API_KEY:-}" ]; then
    echo -e "${RED}❌ OPENCLAW_API_KEY 未设置${NC}"
    exit 1
  fi

  PROVIDER="${OPENCLAW_PROVIDER}"
  API_KEY="${OPENCLAW_API_KEY}"
  MODEL="${OPENCLAW_MODEL:-${DEFAULT_MODELS[$PROVIDER]}}"
  BASE_URL="${OPENCLAW_BASE_URL:-}"

  echo -e "  Provider: ${GREEN}${PROVIDER}${NC}"
  echo -e "  Model:    ${GREEN}${MODEL}${NC}"
  if [ -n "$BASE_URL" ]; then
    echo -e "  Base URL: ${GREEN}${BASE_URL}${NC}"
  fi
  echo ""

# ── 交互模式 ────────────────────────────────────────────────────────
else
  echo "选择模型提供商："
  echo ""
  echo "  1) Anthropic      — Claude 系列（claude-sonnet-4, claude-opus-4）"
  echo "  2) OpenAI         — GPT 系列（gpt-4o, gpt-4.1）"
  echo "  3) OpenRouter     — 一个 Key 访问所有模型 ★推荐"
  echo "  4) Google Gemini  — Gemini 系列"
  echo "  5) DeepSeek       — DeepSeek V3 / R1"
  echo "  6) 自定义         — OpenAI 兼容 API 平台（国内大模型、本地 LLM 等）"
  echo ""

  while true; do
    read -r -p "请选择 [3]: " CHOICE
    CHOICE="${CHOICE:-3}"
    case "$CHOICE" in
      1) PROVIDER="anthropic"; break ;;
      2) PROVIDER="openai"; break ;;
      3) PROVIDER="openrouter"; break ;;
      4) PROVIDER="gemini"; break ;;
      5) PROVIDER="deepseek"; break ;;
      6) PROVIDER="custom"; break ;;
      *) echo -e "${RED}无效选择，请输入 1-6${NC}" ;;
    esac
  done
  echo ""

  # ── API Key ──────────────────────────────────────────────────────
  echo -e "${YELLOW}API Key${NC}"
  if [ "$PROVIDER" = "openrouter" ]; then
    echo "  注册地址: https://openrouter.ai/keys"
  elif [ "$PROVIDER" = "anthropic" ]; then
    echo "  获取地址: https://console.anthropic.com/"
  elif [ "$PROVIDER" = "openai" ]; then
    echo "  获取地址: https://platform.openai.com/api-keys"
  elif [ "$PROVIDER" = "gemini" ]; then
    echo "  获取地址: https://aistudio.google.com/apikey"
  fi
  read -r -p "请输入 API Key: " API_KEY
  if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ API Key 不能为空${NC}"
    exit 1
  fi
  echo ""

  # ── 自定义 Base URL ─────────────────────────────────────────────
  if [ "$PROVIDER" = "custom" ]; then
    echo -e "${YELLOW}自定义 API 地址${NC}"
    echo "  例如: https://api.openai.com/v1"
    echo "        https://your-platform.com/v1"
    read -r -p "请输入 Base URL: " BASE_URL
    if [ -z "$BASE_URL" ]; then
      echo -e "${RED}❌ Base URL 不能为空${NC}"
      exit 1
    fi
    echo ""
  fi

  # ── 模型选择 ──────────────────────────────────────────────────────
  DEFAULT_MODEL="${DEFAULT_MODELS[$PROVIDER]}"
  echo -e "${YELLOW}模型选择${NC}"
  echo "  默认模型: ${DEFAULT_MODEL}"
  echo ""
  echo "  常用模型参考:"
  if [ "$PROVIDER" = "openrouter" ]; then
    echo "    openrouter/anthropic/claude-sonnet-4     — Claude Sonnet 4"
    echo "    openrouter/anthropic/claude-opus-4       — Claude Opus 4"
    echo "    openrouter/openai/gpt-4o                 — GPT-4o"
    echo "    openrouter/google/gemini-2.5-pro         — Gemini 2.5 Pro"
    echo "    openrouter/deepseek/deepseek-chat        — DeepSeek V3"
    echo "    openrouter/deepseek/deepseek-reasoner    — DeepSeek R1"
  elif [ "$PROVIDER" = "anthropic" ]; then
    echo "    anthropic/claude-sonnet-4"
    echo "    anthropic/claude-opus-4"
    echo "    anthropic/claude-haiku-4-5"
  elif [ "$PROVIDER" = "openai" ]; then
    echo "    openai/gpt-4o"
    echo "    openai/gpt-4.1"
    echo "    openai/gpt-4.1-mini"
  elif [ "$PROVIDER" = "gemini" ]; then
    echo "    google/gemini-2.5-pro"
    echo "    google/gemini-2.5-flash"
  elif [ "$PROVIDER" = "deepseek" ]; then
    echo "    deepseek/deepseek-chat"
    echo "    deepseek/deepseek-reasoner"
  elif [ "$PROVIDER" = "custom" ]; then
    echo "    取决于你的 API 平台支持的模型"
  fi
  echo ""
  read -r -p "模型 ID [${DEFAULT_MODEL}]: " MODEL
  MODEL="${MODEL:-${DEFAULT_MODEL}}"
  echo ""
fi

# ── 写入 .env 文件 ──────────────────────────────────────────────────
ENV_KEY_NAME="${ENV_KEY_NAMES[$PROVIDER]}"

echo -e "${YELLOW}→ 写入 ${ENV_FILE}${NC}"

cat > "${ENV_FILE}" << EOF
# OpenClaw API Keys — 由 setup-openclaw 生成
# 修改此文件后运行: openclaw gateway restart
${ENV_KEY_NAME}=${API_KEY}
EOF

# 如果有自定义 Base URL，也写入
if [ -n "${BASE_URL:-}" ]; then
  cat >> "${ENV_FILE}" << EOF
OPENAI_BASE_URL=${BASE_URL}
EOF
fi

echo -e "  ${GREEN}✅ ${ENV_KEY_NAME}=${API_KEY:0:12}...${NC}"
if [ -n "${BASE_URL:-}" ]; then
  echo -e "  ${GREEN}✅ OPENAI_BASE_URL=${BASE_URL}${NC}"
fi

# ── 写入 openclaw.json ──────────────────────────────────────────────
echo -e "${YELLOW}→ 写入 ${CONFIG_FILE}${NC}"

# 生成 openclaw.json
cat > "${CONFIG_FILE}" << EOF
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "${MODEL}"
      },
      "compaction": {
        "auto": true,
        "threshold": 0.8
      }
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  }
}
EOF

echo -e "  ${GREEN}✅ 主模型: ${MODEL}${NC}"
echo ""

# ── 完成 ────────────────────────────────────────────────────────────
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ OpenClaw 配置完成                                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  配置文件: ~/.openclaw/openclaw.json                  ║${NC}"
echo -e "${GREEN}║  API Key:  ~/.openclaw/.env                          ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  启动 OpenClaw Gateway:                              ║${NC}"
echo -e "${GREEN}║    openclaw gateway start                            ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  常用命令:                                            ║${NC}"
echo -e "${GREEN}║    openclaw models list     — 查看可用模型            ║${NC}"
echo -e "${GREEN}║    openclaw models status   — 模型连接状态            ║${NC}"
echo -e "${GREEN}║    openclaw chat            — 启动聊天                ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
