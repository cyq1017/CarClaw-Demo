# 🚗 CarClaw — 开源车机 AI 助手

> 基于 OpenClaw 核心架构，打造跨平台、可扩展的车载 AI 助手

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

## ✨ 特性

- 🧠 **AI 驱动** — 接入 DeepSeek / Qwen / 任意 OpenAI 兼容 LLM
- 🚗 **车辆控制** — 空调、门窗、座椅、灯光（模拟器 / 真车 API）
- 🗺️ **智能导航** — 语音选址、附近搜索、路线规划
- 🎵 **媒体播放** — 语音选歌、播放控制
- 📅 **日程管理** — 提醒、会议、出发时间计算
- 🎙️ **语音交互** — STT + TTS 语音通道（Whisper.cpp / CosyVoice）
- 🔌 **可扩展** — 插件系统 + 技能市场

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/your-org/CarClaw-Demo.git
cd CarClaw-Demo

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 LLM API Key

# 启动 CLI 模式
pnpm dev
```

### 无 API Key（Mock 模式）

```bash
# 直接启动，无需 API Key，使用内置 Mock 回复
pnpm dev
```

## ⚙️ 模型配置

编辑项目根目录的 `carclaw.json` 配置模型，与 OpenClaw 的 `openclaw.json` 模式一致：

```jsonc
{
  "model": {
    "primary": {
      "name": "deepseek",                        // 供应商名称
      "baseUrl": "https://api.deepseek.com",      // API 地址
      "apiKey": "sk-xxx",                         // API Key
      "model": "deepseek-chat",                   // 模型名
      "api": "openai-completions"                 // API 格式
    },
    "fallback": {                                 // 可选：备用模型
      "name": "qwen",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "apiKey": "sk-xxx",
      "model": "qwen-plus",
      "api": "openai-completions"
    }
  }
}
```

支持的 API 格式：`openai-completions`（兼容 DeepSeek / Qwen / OpenAI / 任何 OpenAI 兼容 API）

环境变量高优先级覆盖：`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`

## 🏗️ 架构

```
┌──────────────────────────────────────────────────┐
│                  CarClaw Gateway                  │
├──────────────────────────────────────────────────┤
│  Channel Layer     │  Agent Runtime  │  Tools    │
│  ┌──────────────┐  │  ┌───────────┐  │  🚗 车控  │
│  │ Text (CLI)   │←→│  │ Agent     │←→│  🗺️ 导航  │
│  │ Voice (STT)  │  │  │ Loop      │  │  🎵 媒体  │
│  └──────────────┘  │  └───────────┘  │  📅 日程  │
├──────────────────────────────────────────────────┤
│  Core: Session Manager │ Memory │ Queue │ Hooks  │
├──────────────────────────────────────────────────┤
│  Vehicle Abstraction Layer (Simulator / Real)    │
└──────────────────────────────────────────────────┘
```

## 📁 项目结构

```
src/
├── index.ts              # 入口
├── core/                 # 核心层（Session/Memory/Queue）
├── agent/                # Agent 运行时
├── channels/             # 通道（Text/Voice）
├── tools/                # 车机工具（车控/导航/媒体/日程）
├── skills/               # 可插拔技能描述 (SKILL.md)
├── plugins/              # Hook 扩展点
└── config/               # 配置与 System Prompt
mock/
└── vehicle-simulator.ts  # 车辆状态模拟器
```

## 💬 使用示例

```
你: 打开空调
🤖 CarClaw: 空调已打开，温度 24°C

你: 调到22度
🤖 CarClaw: 已把空调调到22度

你: 导航到北京天安门
🤖 CarClaw: 已开始导航到"北京天安门"，预计行驶时间 25 分钟

你: 播放周杰伦的歌
🤖 CarClaw: 正在播放"周杰伦的歌"
```

## 📋 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| W1 | 骨架搭建 + Agent 跑通 | ✅ |
| W2 | 车机工具 + Skill 系统 | 🔄 |
| W3 | 语音通道 + 多轮对话 | ⏳ |
| W4 | 集成打磨 + v0.1 发布 | ⏳ |

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 License

MIT
