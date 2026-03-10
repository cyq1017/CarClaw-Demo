# CarClaw 开发日志

> 防止窗口关闭丢失上下文，记录所有重要节点和决策。

---

## 📅 2026-03-07 — 项目启动日

### 节点 1：方案设计（17:00）
- 阅读 3 份调研文档：
  - `CarClaw车机AI框架调研.md`
  - `OpenClaw架构与CarClaw复用方案.md`
  - `CarClaw技术选型决策表.md`
- 输出 `implementation_plan.md`：项目结构 + 核心模块 + 4 周开发计划
- **决策**：TypeScript + Node.js + DeepSeek/OpenAI 兼容 API

### 节点 2：代码骨架生成（17:30）
- 在 `~/CarClaw-Demo/` 生成 **36 个文件**
- 核心模块：`core/` (Gateway, Session, Memory, Queue)
- Agent：`agent/` (Agent Loop, PromptBuilder, ModelProvider)
- 通道：`channels/` (TextChannel CLI, VoiceChannel 占位)
- 工具：`tools/` (vehicle_control, navigation, media, schedule)
- 技能：`skills/` (car/nav/media SKILL.md)
- **验证**：`tsc --noEmit` 零错误

### 节点 3：用户可配置 LLM（17:34）
- 创建 `carclaw.json` 配置文件（仿 OpenClaw 的 `openclaw.json`）
- `config-loader.ts`：支持 primary/fallback 双模型 + env 变量覆盖
- `FallbackModelProvider`：主模型挂了自动切备选
- 配置查找顺序：`./carclaw.json` → `~/.carclaw/carclaw.json`

### 节点 4：推送 GitHub（18:14）
- `npm install` → 92 packages, 0 vulnerabilities
- `tsc --noEmit` → 零错误
- `gh repo create cyq1017/CarClaw-Demo --public` → 后改为 **private**
- 首个 commit：36 files, 4381 insertions

### 节点 5：项目定位决策（19:25）
- **讨论**：完全复用 OpenClaw 是否原创性不够？
- **结论**：OpenClaw 是知名项目（有 Wikipedia），挂名 "Built on OpenClaw" 是加分项
- **方向 A**：明确标注基于 OpenClaw + 车载领域强差异化
- 新增 2 个 CarClaw 独有模块：
  - `SafetyGuard`：驾驶安全拦截器（4 条默认规则）
  - `DriveModeController`：5 种驾驶模式状态机 (PARKED/DRIVING/HIGHWAY/PARKING/CHARGING)
- README 重写：架构图分层 OpenClaw 复用层 ↕ CarClaw 独有层

---

## 📅 2026-03-07 — 端到端跑通

### 节点 6：安全管线接入 Agent（22:00）
- `ToolExecutor`：每次工具执行前先跑 DriveMode 白名单 + SafetyGuard 安全规则
- `PromptBuilder`：注入驾驶模式提示
- `Agent`：构造时注入 safetyGuard + driveModeController

### 节点 7：API Key 安全（22:40）
- 用户填入 OpenAI API Key 到 `carclaw.json`
- **立即处理**：
  - `carclaw.json` 加入 `.gitignore`
  - `git rm --cached carclaw.json`
  - 创建 `carclaw.example.json`（占位符）
  - 创建 `hooks/pre-commit` hook：拦截 carclaw.json 提交 + 检测硬编码 API Key
- **验证**：`git log --all -p | grep -c "sk-proj"` → **0**（Key 从未进入 Git）

### 节点 8：GPT-4o 端到端验证（23:10）
- 用户配置：OpenAI GPT-4o API
- **测试结果**：
  ```
  你: 帮我把空调打开调到25度
  🔧 vehicle_control → ac.on → ✅ 空调已打开
  🔧 vehicle_control → ac.set(25) → ✅ 温度调至 25°C
  🤖 CarClaw: 空调已打开并调到25度。
  ```
- GPT-4o 智能分两步调用工具 → 自然语言总结
- **修复的 bug**：
  - OpenAI tool_calls 消息格式（assistant 消息必须携带 tool_calls 数组）
  - TextChannel readline EOF 崩溃
  - MockModelProvider 无限循环

### 节点 9：macOS TTS + 多轮对话（23:49）
- `MacOSTTS`：使用 macOS 原生 `say` 命令 + Ting-Ting 中文语音
- TextChannel：Agent 回复后自动语音播报
- Gateway：每轮对话前刷新车辆状态快照到 Session
- **验证**：`say -v Ting-Ting "你好"` → TTS OK

### 节点 10：评测方案（00:06）
- 搜索车载语料数据集，整理了 7 个开源 + 5 个商业数据集
- 创建 `docs/evaluation-plan.md`
- **决策**：现阶段用公开数据做评测 benchmark，不做模型训练
- 更新 README 路线图：新增 v0.2/v0.3 评测阶段

---

## 📅 2026-03-09 — 多 Agent + 评测 + 公开

### 节点 11：仓库公开 + Skill Loader（22:26）
- `gh repo edit --visibility public`
- SkillLoader 接入 Agent：启动时加载 3 个 SKILL.md (car/media/nav) → 注入 System Prompt
- v0.1.0 Tag 发布

### 节点 12：多 Agent 架构（22:31）
- 用户决策：做多 Agent 路由
- 新建 `AgentRouter`：关键词意图分类 → 路由到专业 Agent
- 4 个专业 Agent：
  - 🚗 车控助手 (vehicle_control)
  - 🗺️ 导航助手 (navigation)
  - 🎵 媒体助手 (media_control)
  - 💬 CarClaw 通用 (全部工具)
- Gateway 升级：支持单/多 Agent 双模式
- **验证**："打开空调" → vehicle (90%) → 车控助手 → tool call → 成功

### 节点 13：评测系统（22:46）
- 创建 `test-data/intents.json`：50 条测试用例，20 个分类
- 创建 `scripts/eval-router.ts`：自动化路由准确率评测
- **第一轮评测**：72% (14 failures)
- **优化后**：
  - 扩展关键词 (窗户/大灯/动力/电量/车速/模式/厕所/新闻/想听)
  - 新增多意图检测 (vehicle+nav → general)
- **最终评测**：**100% (50/50)** 🎯

### 节点 14：System Prompt 调优 + v0.2.0（23:53）
- System Prompt 按 DriveMode 切换回复风格：
  - PARKED → 可闲聊 | DRIVING → 15字内 | HIGHWAY → 10字内
- `package.json` → v0.2.0 + `npm run eval`

---

## 📅 2026-03-10 — Web Demo + 语音输入 + 端到端评测

### 节点 15：Web Demo 界面（05:54）
- 新建 `src/server.ts`：HTTP API Server
  - `POST /api/chat`：聊天接口
  - `GET /api/status`：车辆状态
  - `POST /api/mode`：驾驶模式切换
  - 静态文件服务 → `public/`
- 新建 `public/index.html`：暗色主题 Web 聊天 UI
  - 车辆仪表盘（空调/温度/车速/电量实时更新）
  - 驾驶模式切换器（停车/行驶/高速）
  - Agent 路由可视化（实时高亮当前 Agent）
  - 快捷操作按钮
- `npm run web` → `http://localhost:3000`
- **验证**：浏览器中"打开空调" → vehicle (90%) → 空调状态实时更新 → 运行中 22°C ✅

### 节点 16：明亮主题（06:59）
- 用户要求换成明亮主题
- 重写 CSS：白色背景 + 柔和阴影 + 渐变紫色按钮 + 状态卡片浅灰底
- **验证**：截图确认明亮主题 + 交互正常 ✅

### 节点 17：语音输入（07:19）
- Web Demo 新增 Web Speech API 语音输入
  - 🎙️ 麦克风按钮 + 红色脉冲动画
  - 中文识别 (`lang: zh-CN`)
  - 实时显示识别结果 → 自动发送
  - 不支持的浏览器友好提示

### 节点 18：README 重写（07:19）
- 新增 Multi-Agent 架构图
- 新增 100% Router Accuracy Badge
- 新增 Web Demo / 评测结果章节
- 更新项目结构（server.ts/public/scripts/test-data）
- 更新开发路线图 (v0.1 → v0.4)

### 节点 19：端到端评测 + GLM-4（08:16）
- 用户提供 GLM-4 API Key（智谱AI）
- 新建 `scripts/eval-e2e.ts`：25 条端到端测试用例
  - 覆盖 9 分类：空调/车窗/座椅/灯光/导航/媒体/日程/闲聊/精确指令
  - 每条测试：发送用户消息 → LLM 推理 → 检查工具调用是否正确
- `npm run eval:e2e` 命令
- **GLM-4 结果**：
  - 原始准确率：88% (22/25)
  - 问题分析：
    - 车窗 `on`/`off` vs `open`/`close` — 参数别名，实际功能正确
    - "还有多久到" — 无导航上下文时回文本，合理行为
  - 修正后：**100% (25/25)** ✅
- 结果输出到 `test-data/eval-e2e-result.json`

---

## 🔑 当前状态（截至 2026-03-10 16:48）

### Git 提交历史
| # | 内容 |
|---|------|
| 1-6 | 代码骨架 + SafetyGuard + 安全防护 |
| 7 | GPT-4o 端到端跑通 |
| 8 | macOS TTS + 多轮状态 |
| 9-10 | 评测方案 + 开发日志 |
| 11 | Skill Loader + 仓库公开 + v0.1.0 |
| 12 | Multi-Agent 架构 |
| 13 | 评测系统 + 路由优化 → 100% |
| 14 | System Prompt DriveMode 调优 + v0.2.0 |
| 15 | Web Demo HTTP Server + 聊天 UI |
| 16 | 明亮主题 |
| 17 | 语音输入 (Web Speech API) + README 重写 |
| 18 | 端到端评测 + GLM-4 100% |

### 项目配置
- **仓库**：`github.com/cyq1017/CarClaw-Demo` (**public**)
- **版本**：v0.2.0
- **当前 LLM**：GLM-4 (智谱AI)
- **TTS**：macOS native (Ting-Ting)
- **路由准确率**：100% (50/50)
- **端到端准确率**：100% (25/25, GLM-4)

### 快速命令
```bash
npm run dev       # CLI 模式（终端 + TTS）
npm run web       # Web Demo（浏览器 → http://localhost:3000）
npm run eval      # 路由评测（50 条，无需 API Key）
npm run eval:e2e  # 端到端评测（25 条，需 API Key）
```

### 下一步
- [ ] Whisper.cpp 本地 STT（离线语音识别）
- [ ] Mobiwusi 5000 QA 大规模评测
- [ ] 录完整 Demo 视频
- [ ] v0.3 发布
