# ────────────────────────────────────────────────────────────────────
# FleetGuard Employee Machine — Docker 镜像
#
# 模拟一台完整的员工电脑，预装：
#   - Python 3.12 + Node.js 24（OpenClaw 运行环境）
#   - OpenClaw Gateway（全局安装）
#   - FleetGuard Sidecar（自动注册 + 心跳）
#   - FleetGuard Plugin（已接入 OpenClaw 插件目录）
# ────────────────────────────────────────────────────────────────────
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

# ── 系统依赖 + Node.js 24 ──────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
    python3.12 python3.12-venv python3.12-dev \
    git vim netcat-openbsd \
    sudo bash-completion \
    && rm -rf /var/lib/apt/lists/*

# Node.js 24 (required by OpenClaw)
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# ── 安装 uv ────────────────────────────────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# ── 安装 OpenClaw Gateway ──────────────────────────────────────────
RUN npm install -g openclaw@latest
RUN mkdir -p /root/.openclaw/extensions

# ── OpenClaw 配置模板 ───────────────────────────────────────────────
COPY docker/employee/openclaw/ /root/.openclaw/
COPY docker/employee/setup-openclaw.sh /usr/local/bin/setup-openclaw
RUN chmod +x /usr/local/bin/setup-openclaw

# ── 安装 FleetGuard Sidecar ─────────────────────────────────────────
COPY sidecar/ /opt/fleetguard/sidecar/
COPY policies/ /opt/fleetguard/policies/
WORKDIR /opt/fleetguard/sidecar
RUN uv sync

# ── 编译 FleetGuard Plugin 并接入 OpenClaw ──────────────────────────
COPY openclaw-plugin/ /opt/fleetguard-plugin/
WORKDIR /opt/fleetguard-plugin
RUN npm install && npm run build 2>/dev/null || true
RUN ln -sf /opt/fleetguard-plugin /root/.openclaw/extensions/fleetguard

# ── 入口脚本 ────────────────────────────────────────────────────────
COPY docker/employee/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /root
ENTRYPOINT ["/entrypoint.sh"]
