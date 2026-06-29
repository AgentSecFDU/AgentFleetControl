# FleetGuard Employee Machine

预装完整的员工工作环境：OpenClaw + FleetGuard Sidecar + FleetGuard Plugin。

## 预装组件

| 组件 | 位置 | 说明 |
|------|------|------|
| Node.js 24 | 系统安装 | OpenClaw 运行时 |
| Python 3.12 | 系统安装 | Sidecar 运行时 |
| OpenClaw Gateway | `npm install -g openclaw` | AI Agent 网关 |
| FleetGuard Sidecar | `/opt/fleetguard/sidecar/` | 自动启动，监听 `:18900` |
| FleetGuard Plugin | `~/.openclaw/extensions/fleetguard` | 已接入 OpenClaw |

## 启动后

容器启动后自动完成：等待管控端就绪 → 获取注册令牌 → 注册设备 → 启动 Sidecar → 心跳上报。

进入容器：
```bash
docker exec -it fleetguard-employee-alice bash
```

## 配置 OpenClaw

OpenClaw 已全局安装，Plugin 已就位。在启动 OpenClaw Gateway 之前，需要配置 API Key。

### 方式一：配置助手脚本（推荐）

进入容器后运行：

```bash
setup-openclaw
```

交互式引导，支持以下提供商：

| 序号 | 提供商 | 说明 |
|------|--------|------|
| 1 | Anthropic | Claude 系列 |
| 2 | OpenAI | GPT 系列 |
| 3 | OpenRouter | ★推荐：一个 Key 访问所有模型 |
| 4 | Google Gemini | Gemini 系列 |
| 5 | DeepSeek | DeepSeek V3 / R1 |
| 6 | 自定义 | OpenAI 兼容 API 平台（国内大模型、本地 LLM 等） |

脚本会自动生成 `~/.openclaw/openclaw.json` 和 `~/.openclaw/.env`。

### 方式二：docker-compose 环境变量

在 `docker-compose.yml` 中取消注释并填入你的 API Key：

```yaml
employee-alice:
  environment:
    OPENCLAW_PROVIDER: openrouter
    OPENCLAW_API_KEY: sk-or-xxx
    OPENCLAW_MODEL: openrouter/anthropic/claude-sonnet-4
    # OPENCLAW_BASE_URL: https://your-custom-api.com/v1  # 自定义平台时需要
```

容器启动时会自动检测 `OPENCLAW_API_KEY` 并完成配置。

### 方式三：手动配置

直接编辑配置文件，适合高级用户：

```bash
# API Key
vim ~/.openclaw/.env
# 取消注释你使用的 Provider，填入 Key

# 模型设置
vim ~/.openclaw/openclaw.json
# 修改 agents.defaults.model.primary
```

## 启动 OpenClaw

配置完成后启动：

```bash
openclaw gateway start
```

此后每一次工具调用都会被 FleetGuard Plugin 拦截 → Sidecar 评估 → Control Center 审计。

## 验证

```bash
# Sidecar 状态
curl http://127.0.0.1:18900/local/status

# 模拟一次工具调用（测试链路）
curl -X POST http://127.0.0.1:18900/local/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "before_tool_call",
    "tool_name": "exec",
    "tool_category": "shell",
    "params_summary": "ls -la",
    "session_id": "test_001",
    "risk_score": 0
  }'
```
