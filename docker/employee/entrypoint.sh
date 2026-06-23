#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
# 员工容器入口 — 启动 Sidecar + 保持容器运行
# ────────────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   FleetGuard Employee Machine                       ║"
echo "║   Hostname: ${FG_HOSTNAME:-unknown}                  ║"
echo "║   Device:   ${FG_DEVICE_ID:-unknown}                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 导出环境变量给 Sidecar
export FG_CONTROL_CENTER_URL="${FG_CONTROL_CENTER_URL:-http://api:8000}"
export FG_ENROLLMENT_TOKEN="${FG_ENROLLMENT_TOKEN}"
export FG_DEVICE_ID="${FG_DEVICE_ID}"
export FG_HOSTNAME="${FG_HOSTNAME:-$(hostname)}"
export FG_USERNAME="${FG_USERNAME:-employee}"
export FG_OS="${FG_OS:-Linux}"

# 如果还没注册过，生成 device_id
if [ -z "$FG_DEVICE_ID" ]; then
  export FG_DEVICE_ID="fg-dev-$(hostname)-$(date +%s | tail -c5)"
fi

echo -e "${YELLOW}  Control Center: ${FG_CONTROL_CENTER_URL}${NC}"
echo -e "${YELLOW}  Device ID:      ${FG_DEVICE_ID}${NC}"
echo ""

# ── 启动 Sidecar（后台）────────────────────────────────────────────
echo -e "${GREEN}→ 启动 FleetGuard Sidecar...${NC}"
cd /opt/fleetguard/sidecar
uv run python -m fleetguard_sidecar.main --api-port 18900 &
SIDECAR_PID=$!

# 等待 Sidecar 启动
sleep 3

# 检查 Sidecar 是否正常
if curl -s http://127.0.0.1:18900/local/status > /dev/null 2>&1; then
  echo -e "${GREEN}  ✅ Sidecar 已启动 (localhost:18900)${NC}"
else
  echo -e "${YELLOW}  ⚠️  Sidecar 可能还在注册中...${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ 员工环境就绪                                     ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Sidecar:    http://localhost:18900                  ║${NC}"
echo -e "${GREEN}║  Plugin 目录: /opt/fleetguard-plugin                 ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  接入 OpenClaw:                                      ║${NC}"
echo -e "${GREEN}║    ln -s /opt/fleetguard-plugin \                    ║${NC}"
echo -e "${GREEN}║       ~/.openclaw/plugins/fleetguard                 ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  进入容器:                                           ║${NC}"
echo -e "${GREEN}║    docker exec -it <容器名> bash                     ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 保持容器运行 ───────────────────────────────────────────────────
echo "容器运行中。docker exec -it <容器名> bash 进入。"
echo ""

# 如果 Sidecar 挂了，容器也退出（方便 docker compose 管理）
wait $SIDECAR_PID
