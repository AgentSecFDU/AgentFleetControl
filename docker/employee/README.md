# FleetGuard Employee Machine

这是一个预装 FleetGuard Sidecar + Plugin 的"员工电脑"Docker 镜像。

## 镜像内容

| 组件 | 位置 | 说明 |
|------|------|------|
| Python 3.12 | 系统安装 | OpenClaw 运行环境 |
| Node.js 22 | 系统安装 | Plugin 运行环境 |
| FleetGuard Sidecar | `/opt/fleetguard/sidecar/` | 自动启动，监听 `:18900` |
| FleetGuard Plugin | `/opt/fleetguard-plugin/` | 编译好的 JS，待接入 OpenClaw |
| 策略文件 | `/opt/fleetguard/policies/` | default.yaml + lockdown.yaml |

## 容器配置

通过环境变量传入：

| 环境变量 | 必填 | 说明 |
|---------|------|------|
| `FG_CONTROL_CENTER_URL` | 是 | 管控端地址，如 `http://api:8000` |
| `FG_ENROLLMENT_TOKEN` | 是 | 注册口令 |
| `FG_DEVICE_ID` | 否 | 设备 ID，默认自动生成 |
| `FG_HOSTNAME` | 否 | 主机名，默认 `hostname` |
| `FG_USERNAME` | 否 | 用户名，默认 `employee` |

## 启动后

容器启动后会自动：
1. 向管控端注册设备
2. 开始心跳（每 10s）
3. 定期同步策略

验证 Sidecar 状态：
```bash
docker exec <容器名> curl http://127.0.0.1:18900/local/status
```

---

# 在容器中安装 OpenClaw 并接入 FleetGuard

## 1. 进入容器

```bash
docker exec -it fleetguard-employee-alice bash
```

## 2. 安装 OpenClaw 

按 OpenClaw 官方文档安装。通常是：

```bash
npm install -g @anthropic/openclaw
# 或者
pip install openclaw
```

## 3. 将 FleetGuard Plugin 接入 OpenClaw

```bash
# 方式 A：软链接（推荐）
mkdir -p ~/.openclaw/plugins/
ln -s /opt/fleetguard-plugin ~/.openclaw/plugins/fleetguard

# 方式 B：复制
cp -r /opt/fleetguard-plugin ~/.openclaw/plugins/fleetguard
```

## 4. 配置 Plugin 指向本地 Sidecar

Plugin 默认连接 `http://127.0.0.1:18900`（Sidecar 地址）。

如需修改：
```bash
export FG_SIDECAR_URL="http://127.0.0.1:18900"
```

## 5. 启动 OpenClaw

```bash
openclaw gateway start
```

Plugin 会自动加载，此后你的每一次工具调用都会被 FleetGuard 拦截和审计。

## 6. 在管控端查看事件

打开浏览器访问管控端 Dashboard，你应该能看到：
- 设备在线状态
- 每个工具调用事件
- 风险评分
- 策略命中情况
