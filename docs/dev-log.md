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

## 🔑 当前状态（截至 2026-03-09 01:52）

### Git 提交历史
| # | Hash | 内容 |
|---|------|------|
| 1 | `12fa50b` | 代码骨架 36 files |
| 2 | `56f7943` | SafetyGuard + DriveModeController + README |
| 3 | `7f3329e` | 安全管线接入 Agent 执行流 |
| 4 | `ee19866` | MockModelProvider 修复 |
| 5 | `e6fdb97` | API Key 安全防护 |
| 6 | `89683e6` | pre-commit hook |
| 7 | `9caa493` | GPT-4o 端到端跑通 |
| 8 | `a6b6a6c` | macOS TTS + 多轮车辆状态 |
| 9 | `f94d103` | 评测方案 + 路线图更新 |

### 项目配置
- **仓库**：`github.com/cyq1017/CarClaw-Demo` (private)
- **LLM**：OpenAI GPT-4o（用户已配置 API Key 在本地 `carclaw.json`）
- **TTS**：macOS native (Ting-Ting)
- **安全**：`.gitignore` + pre-commit hook 三层防护

### 下一步（W4）
- [ ] P0: Skill Loader 接入（读取 SKILL.md 注入 Agent prompt）
- [ ] P1: 写 50 条核心测试用例 + 自动化评测
- [ ] P2: 录交互式 Demo (GIF/视频)
- [ ] P3: 接入 Whisper.cpp 做本地 STT
- [ ] v0.1 Tag 发布
