# 🚗 CarClaw — 开源车载 AI 助手框架

> **Built on [OpenClaw](https://github.com/openclaw/openclaw)** — 将 OpenClaw 的 Agent 能力延伸到车载场景

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Built on OpenClaw](https://img.shields.io/badge/Built%20on-OpenClaw-blueviolet.svg)](https://github.com/openclaw/openclaw)
[![Router Accuracy](https://img.shields.io/badge/Router%20Accuracy-100%25-brightgreen.svg)](#评测)

## 为什么做 CarClaw

[OpenClaw](https://github.com/openclaw/openclaw) 是当前最成熟的开源 AI Agent 框架之一。但它是为 **文本消息场景** 设计的。车载 AI 助手面临完全不同的工程约束：

| 维度 | OpenClaw（文本消息） | CarClaw（车载语音） |
|------|---|---|
| 交互方式 | 文字输入 / 点击 | 🎙️ 实时语音 |
| 延迟要求 | 秒级可接受 | ⚡ < 4s 端到端 |
| 安全等级 | 无 | 🛡️ 安全关键系统 |
| 离线能力 | 依赖云端 | 📴 必须支持离线 |
| 上下文 | 静态 | 🚗 动态（速度/档位/电量） |

**CarClaw 复用 OpenClaw 的核心引擎，新增车载场景独有的能力层。**

## ✨ 特性

### 🤖 Multi-Agent 架构
- **AgentRouter** — 关键词意图分类 → 路由到专业 Agent
- 🚗 **车控助手** — 空调 / 门窗 / 座椅 / 灯光
- 🗺️ **导航助手** — 路线导航 / 附近搜索 / ETA
- 🎵 **媒体助手** — 播放 / 暂停 / 切歌 / 搜索
- 💬 **通用助手** — 闲聊 / 日程 / 多意图兜底

### 🛡️ 安全系统
- **SafetyGuard** — 驾驶安全拦截（行驶中禁开门、高速限车窗、低电量警告）
- **DriveModeController** — 5 种驾驶模式状态机（按模式自动切换回复风格）

### 🌐 Web Demo
- 实时聊天界面 + 车辆状态仪表盘
- 驾驶模式切换器
- Agent 路由可视化
- 🎙️ Web Speech API 语音输入

### 复用自 OpenClaw
- 🧠 Agent Runtime（ReAct Loop、工具调用）
- 📋 Session / Memory
- 🔌 Skill 系统（可插拔技能描述）
- 📦 Model Provider（DeepSeek / Qwen / OpenAI 兼容）

## 🚀 快速开始

```bash
git clone https://github.com/cyq1017/CarClaw-Demo.git
cd CarClaw-Demo
npm install

# 三种运行模式
npm run dev     # CLI 模式（终端对话 + TTS 语音）
npm run web     # Web Demo（浏览器 → http://localhost:3000）
npm run eval    # 路由评测（50 条测试 → 准确率报告）
```

> 无 API Key 自动进入 Mock 模式，可直接体验工具调用流程

## ⚙️ 模型配置

编辑 `carclaw.json`：

```jsonc
{
  "model": {
    "primary": {
      "name": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-xxx",
      "model": "gpt-4o",
      "api": "openai-completions"
    }
  }
}
```

环境变量可覆盖：`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`

## 🏗️ 架构

```
                          ┌──────────────┐
                          │   用户输入    │
                          │  文字/语音    │
                          └──────┬───────┘
                                 │
                          ┌──────▼───────┐
                          │ AgentRouter  │
                          │  意图分类     │
                          └──┬───┬───┬──┘
                    ┌────────┤   │   ├────────┐
              ┌─────▼─────┐  │   │   │  ┌─────▼─────┐
              │ 🚗 车控    │  │   │   │  │ 💬 通用    │
              │   Agent   │  │   │   │  │   Agent   │
              └───────────┘  │   │   │  └───────────┘
                       ┌─────▼─┐ │ ┌─▼─────┐
                       │🗺️ 导航│ │ │🎵 媒体│
                       │Agent │ │ │ Agent │
                       └──────┘ │ └──────┘
                                │
                    ┌───────────▼───────────┐
                    │     Gateway           │
                    ├───────────────────────┤
                    │ 🛡️ SafetyGuard       │
                    │ 🚦 DriveModeCtrl     │
                    │ 📋 Session / Memory  │
                    └───────────────────────┘
```

## 📁 项目结构

```
src/
├── index.ts              # CLI 入口（多 Agent 模式）
├── server.ts             # Web Demo HTTP Server
├── core/                 # Session / Memory / Queue
├── agent/                # Agent Loop / AgentRouter / Model Provider
├── safety/               # SafetyGuard + DriveModeController
├── channels/             # Voice (STT/TTS) + Text (CLI)
├── tools/                # vehicle_control / navigation / media / schedule
├── skills/               # 可插拔 Skill 描述 (SKILL.md)
└── config/               # carclaw.json + System Prompt

public/
└── index.html            # Web Demo 界面

mock/
└── vehicle-simulator.ts  # 车辆状态模拟器

scripts/
└── eval-router.ts        # 路由评测脚本

test-data/
└── intents.json          # 50 条评测用例
```

## 📊 评测

```bash
npm run eval
```

```
🎯 路由准确率: 100% (50/50)
✅ 全部 20 个分类 100% 通过
```

覆盖场景：车控基础/隐式/精确、导航、媒体、日程、闲聊、多意图、安全拦截

> 📋 评测方案详见 [docs/evaluation-plan.md](docs/evaluation-plan.md)

## 💬 使用示例

```
你: 打开空调 22 度
🤖 CarClaw: 空调已打开，温度 22°C

你: 打开驾驶位车门        （行驶中）
🤖 CarClaw: 🛡️ 安全拦截：车辆正在行驶，禁止打开车门

你: 打开空调并导航到公司    （多意图）
🤖 CarClaw: 空调已打开。正在导航到公司...
```

## 📋 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| v0.1 | 骨架 + Agent + SafetyGuard + TTS + GPT-4o 端到端 | ✅ |
| v0.2 | Multi-Agent + 评测系统 (100%) + Web Demo | ✅ |
| v0.3 | Whisper.cpp 本地 STT + 离线小模型 | ⏳ |
| v0.4 | 自动化评测（Mobiwusi 5000 QA） | ⏳ |

## 🙏 致谢

CarClaw 的 Agent 核心（Session/Agent Loop/Skills/Hooks）基于 [OpenClaw](https://github.com/openclaw/openclaw) 架构设计。感谢 OpenClaw 社区提供的 AI Agent 基座。

## 📄 License

MIT
