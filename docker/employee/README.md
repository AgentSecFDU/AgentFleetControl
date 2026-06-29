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

## 使用 OpenClaw

OpenClaw 已全局安装，Plugin 已就位。你需要配置 API Key：

```bash
# 配置模型提供商
export ANTHROPIC_API_KEY="your-key"
# 或其他提供商
export OPENAI_API_KEY="your-key"

# 启动 OpenClaw Gateway
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
