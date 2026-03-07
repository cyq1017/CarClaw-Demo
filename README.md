# 🚗 CarClaw — 开源车载 AI 助手框架

> **Built on [OpenClaw](https://github.com/openclaw/openclaw)** — 将 OpenClaw 的 Agent 能力延伸到车载场景

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Built on OpenClaw](https://img.shields.io/badge/Built%20on-OpenClaw-blueviolet.svg)](https://github.com/openclaw/openclaw)

## 为什么做 CarClaw

[OpenClaw](https://github.com/openclaw/openclaw) 是当前最成熟的开源 AI Agent 框架之一。它的 Session 管理、Agent Loop、Skill 系统、Plugin Hooks 等核心能力已被广泛验证。

但 OpenClaw 是为 **文本消息场景**（Discord/Telegram/WhatsApp）设计的。车载 AI 助手面临完全不同的工程约束：

| 维度 | OpenClaw（文本消息） | CarClaw（车载语音） |
|------|---|---|
| 交互方式 | 文字输入 / 点击 | 🎙️ 实时语音 |
| 延迟要求 | 秒级可接受 | ⚡ < 4s 端到端 |
| 安全等级 | 无 | 🛡️ 安全关键系统 |
| 离线能力 | 依赖云端 | 📴 必须支持离线 |
| 上下文 | 静态 | 🚗 动态（速度/档位/电量） |

**CarClaw 复用 OpenClaw 的核心引擎，新增车载场景独有的能力层。**

## ✨ 特性

### 复用自 OpenClaw
- 🧠 **Agent Runtime** — ReAct Loop、工具调用、推理
- 📋 **Session / Memory** — 多会话管理、长期记忆
- 🔌 **Skill 系统** — 可插拔技能描述
- ⚙️ **Plugin Hooks** — before/after tool call 扩展点
- 📦 **Model Provider** — 模型可切换（DeepSeek / Qwen / OpenAI 兼容）

### CarClaw 独有
- 🛡️ **SafetyGuard** — 驾驶安全拦截器（行驶中禁开门、高速限车窗、低电量警告）
- 🚦 **DriveModeController** — 驾驶模式状态机（停车/行驶/高速/泊车/充电，每种模式自动调整允许的操作和回复风格）
- 🚗 **Vehicle Abstraction Layer** — 车辆控制抽象（空调/门窗/座椅/灯光）
- 🎙️ **Voice Channel** — 实时语音通道（STT → Agent → TTS）
- 🗺️ **Navigation / Media / Schedule Tools** — 车载场景工具集

## 🚀 快速开始

```bash
git clone https://github.com/cyq1017/CarClaw-Demo.git
cd CarClaw-Demo
npm install
npm run dev   # 启动 CLI 模式（无 API Key 自动 Mock）
```

## ⚙️ 模型配置

编辑 `carclaw.json`（与 OpenClaw 的 `openclaw.json` 模式一致）：

```jsonc
{
  "model": {
    "primary": {
      "name": "deepseek",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "sk-xxx",
      "model": "deepseek-chat",
      "api": "openai-completions"
    },
    "fallback": {
      "name": "qwen",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "apiKey": "sk-xxx",
      "model": "qwen-plus",
      "api": "openai-completions"
    }
  }
}
```

环境变量可覆盖：`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`

## 🏗️ 架构

```
┌───────────────────────────────────────────────────────────┐
│                      CarClaw Core                         │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────── OpenClaw 复用层 ─────────────────┐  │
│  │  Session Manager │ Agent Loop │ Memory │ Skill/Hook │  │
│  └─────────────────────────────────────────────────────┘  │
│                           ↕                               │
│  ┌─────────────────── CarClaw 独有层 ─────────────────┐  │
│  │                                                     │  │
│  │  🛡️ SafetyGuard          🚦 DriveModeController    │  │
│  │  ├ 行驶中禁开门           ├ PARKED (全功能)         │  │
│  │  ├ 高速限车窗             ├ DRIVING (简洁模式)      │  │
│  │  ├ 低电量警告             ├ HIGHWAY (极简模式)      │  │
│  │  └ 非P档禁关动力          ├ PARKING (泊车辅助)      │  │
│  │                           └ CHARGING (充电等待)      │  │
│  │                                                     │  │
│  │  🎙️ Voice Channel        🚗 Vehicle Abstraction    │  │
│  │  ├ STT (Whisper.cpp)     ├ 空调 / 门窗 / 座椅      │  │
│  │  └ TTS (CosyVoice)      └ 灯光 / 仪表 / 动力      │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
├───────────────────────────────────────────────────────────┤
│  Tools: 🚗 vehicle_control │ 🗺️ navigation │ 🎵 media  │
└───────────────────────────────────────────────────────────┘
```

## 📁 项目结构

```
src/
├── index.ts              # 入口
├── core/                 # Session / Memory / Queue（复用 OpenClaw 模式）
├── agent/                # Agent Loop / Prompt Builder / Model Provider
├── safety/               # 🆕 SafetyGuard + DriveModeController
├── channels/             # Voice (STT/TTS) + Text (CLI)
├── tools/                # vehicle_control / navigation / media / schedule
├── skills/               # 可插拔 Skill 描述 (SKILL.md)
├── plugins/              # Hook 扩展点
└── config/               # carclaw.json 加载 + System Prompt
mock/
└── vehicle-simulator.ts  # 车辆状态模拟器
```

## 💬 使用示例

```
你: 打开空调 22 度
🤖 CarClaw: 空调已打开，温度 22°C

你: 打开驾驶位车门        （行驶中）
🤖 CarClaw: 🛡️ 安全拦截：车辆正在行驶（60km/h），禁止打开车门

你: 导航到北京天安门
🤖 CarClaw: 已开始导航，预计 25 分钟
```

## 📋 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| W1 | 骨架搭建 + Agent + SafetyGuard | ✅ |
| W2 | 车机工具 + Skill 系统 | 🔄 |
| W3 | 语音通道 + 多轮对话 | ⏳ |
| W4 | 集成打磨 + v0.1 发布 | ⏳ |

## 🙏 致谢

CarClaw 的 Agent 核心（Session/Agent Loop/Skills/Hooks）基于 [OpenClaw](https://github.com/openclaw/openclaw) 架构设计。感谢 OpenClaw 社区提供了坚实的 AI Agent 基座。

## 📄 License

MIT
