# ────────────────────────────────────────────────────────────────────
# FleetGuard Employee Machine — Docker 镜像
#
# 模拟一台完整的员工电脑，预装：
#   - Python 3.12 + Node.js 22（OpenClaw 运行环境）
#   - FleetGuard Sidecar（自动注册 + 心跳）
#   - FleetGuard Plugin（放在 /opt/fleetguard-plugin/，等待接入 OpenClaw）
#
# 使用方式见同目录 README.md
# ────────────────────────────────────────────────────────────────────
FROM ubuntu:24.04

# 避免交互式安装
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

# ── 系统依赖 ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
    python3.12 python3.12-venv python3.12-dev \
    nodejs npm \
    git vim netcat-openbsd openssh-client \
    sudo bash-completion \
    && rm -rf /var/lib/apt/lists/*

# python3 → python3.12
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# ── 安装 uv（Python 包管理器）──────────────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# ── 安装 FleetGuard Sidecar ─────────────────────────────────────────
COPY sidecar/ /opt/fleetguard/sidecar/
COPY policies/ /opt/fleetguard/policies/

WORKDIR /opt/fleetguard/sidecar
RUN uv sync

# ── 安装 FleetGuard Plugin ──────────────────────────────────────────
COPY openclaw-plugin/ /opt/fleetguard-plugin/
WORKDIR /opt/fleetguard-plugin
RUN npm install && npm run build 2>/dev/null || true

# ── 入口脚本 ────────────────────────────────────────────────────────
COPY docker/employee/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /root
ENTRYPOINT ["/entrypoint.sh"]
