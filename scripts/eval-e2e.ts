/**
 * CarClaw 端到端评测脚本
 *
 * 测试 LLM 是否能正确理解指令并调用工具
 * 使用 carclaw.json 配置的模型 API
 *
 * 用法: npx tsx scripts/eval-e2e.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../src/config/config-loader.js';
import { createProviderFromConfig } from '../src/agent/model-provider.js';
import { Agent } from '../src/agent/agent.js';
import { VehicleSimulator } from '../mock/vehicle-simulator.js';
import { SafetyGuard } from '../src/safety/safety-guard.js';
import { DriveModeController } from '../src/safety/drive-mode.js';
import { createVehicleControlTool } from '../src/tools/vehicle/vehicle-control.js';
import { createNavigationTool } from '../src/tools/navigation/navigation.js';
import { createMediaTool } from '../src/tools/media/media.js';
import { createScheduleTool } from '../src/tools/schedule/schedule.js';
import { SessionManager } from '../src/core/session.js';

// ── 测试用例定义 ──
interface E2ETestCase {
    id: number;
    input: string;
    expectTool: string | null;           // 期望调用的工具名，null=纯文本回复
    expectArgs?: Record<string, any>;    // 期望的关键参数
    category: string;
    description: string;
}

const testCases: E2ETestCase[] = [
    // ── 车控：空调 ──
    { id: 1, input: '打开空调', expectTool: 'vehicle_control', expectArgs: { target: 'ac', action: 'on' }, category: 'vehicle_ac', description: '基础开空调' },
    { id: 2, input: '把空调调到25度', expectTool: 'vehicle_control', expectArgs: { target: 'ac' }, category: 'vehicle_ac', description: '设置温度' },
    { id: 3, input: '关空调', expectTool: 'vehicle_control', expectArgs: { target: 'ac', action: 'off' }, category: 'vehicle_ac', description: '关空调' },
    { id: 4, input: '空调温度调低一点', expectTool: 'vehicle_control', expectArgs: { target: 'ac' }, category: 'vehicle_ac', description: '隐式调温' },

    // ── 车控：车窗 ──
    { id: 5, input: '打开车窗', expectTool: 'vehicle_control', expectArgs: { target: 'window' }, category: 'vehicle_window', description: '开车窗' },
    { id: 6, input: '关闭所有车窗', expectTool: 'vehicle_control', expectArgs: { target: 'window' }, category: 'vehicle_window', description: '关车窗' },

    // ── 车控：座椅 ──
    { id: 7, input: '打开座椅加热', expectTool: 'vehicle_control', expectArgs: { target: 'seat', action: 'on' }, category: 'vehicle_seat', description: '座椅加热' },

    // ── 车控：灯光 ──
    { id: 8, input: '打开大灯', expectTool: 'vehicle_control', expectArgs: { target: 'light', action: 'on' }, category: 'vehicle_light', description: '开大灯' },

    // ── 导航 ──
    { id: 9, input: '导航到北京天安门', expectTool: 'navigation', expectArgs: { action: 'navigate' }, category: 'navigation', description: '指定导航' },
    { id: 10, input: '去最近的加油站', expectTool: 'navigation', category: 'navigation', description: '附近搜索' },
    { id: 11, input: '还有多久到', expectTool: null, category: 'navigation_chat', description: 'ETA查询(无导航上下文时可回文本)' },
    { id: 12, input: '附近有什么好吃的', expectTool: 'navigation', category: 'navigation', description: '附近搜索餐厅' },

    // ── 媒体 ──
    { id: 13, input: '播放音乐', expectTool: 'media_control', expectArgs: { action: 'play' }, category: 'media', description: '播放音乐' },
    { id: 14, input: '暂停', expectTool: 'media_control', expectArgs: { action: 'pause' }, category: 'media', description: '暂停' },
    { id: 15, input: '下一首', expectTool: 'media_control', expectArgs: { action: 'next' }, category: 'media', description: '下一首' },
    { id: 16, input: '播放周杰伦的歌', expectTool: 'media_control', category: 'media', description: '搜索播放' },
    { id: 17, input: '声音大一点', expectTool: 'media_control', category: 'media', description: '音量调节' },

    // ── 日程 ──
    { id: 18, input: '提醒我下午三点开会', expectTool: 'schedule', category: 'schedule', description: '添加提醒' },
    { id: 19, input: '今天有什么安排', expectTool: 'schedule', category: 'schedule', description: '查询日程' },

    // ── 纯聊天（不应调工具）──
    { id: 20, input: '你好', expectTool: null, category: 'chat', description: '打招呼' },
    { id: 21, input: '你是谁', expectTool: null, category: 'chat', description: '身份' },
    { id: 22, input: '今天天气怎么样', expectTool: null, category: 'chat', description: '闲聊' },
    { id: 23, input: '谢谢', expectTool: null, category: 'chat', description: '道谢' },

    // ── 复杂/精确指令 ──
    { id: 24, input: '空调开到18度', expectTool: 'vehicle_control', expectArgs: { target: 'ac', value: 18 }, category: 'precise', description: '精确温度' },
    { id: 25, input: '导航到上海浦东机场', expectTool: 'navigation', category: 'precise', description: '精确导航' },
];

// ── 评测逻辑 ──
async function runE2EEval() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  📊 CarClaw 端到端评测 — LLM 工具调用准确率    ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const config = loadConfig();
    const modelProvider = createProviderFromConfig(config.model);
    console.log(`🤖 模型: ${config.model.primary.name} / ${config.model.primary.model}`);
    console.log(`🔗 API: ${config.model.primary.baseUrl}\n`);

    const vehicleSimulator = new VehicleSimulator();
    const safetyGuard = new SafetyGuard(vehicleSimulator);
    const driveModeController = new DriveModeController(vehicleSimulator);
    await driveModeController.updateMode();

    // 创建 Agent (拥有全部工具)
    const agent = new Agent({
        modelProvider,
        name: 'CarClaw-Eval',
        maxToolCalls: config.agent.maxToolCalls,
        temperature: 0.3, // 低温度以保证一致性
        safetyGuard,
        driveModeController,
    });

    agent.registerTools([
        createVehicleControlTool(vehicleSimulator),
        createNavigationTool(),
        createMediaTool(),
        createScheduleTool(),
    ]);

    const sessionManager = new SessionManager();
    let passed = 0;
    let failed = 0;
    const failures: Array<{ id: number; input: string; expected: string | null; actual: string | null; error?: string }> = [];
    const categoryStats: Record<string, { pass: number; total: number }> = {};

    for (const tc of testCases) {
        // 每个测试用例都用新 session，避免上下文干扰
        const session = sessionManager.getOrCreate(`eval-${tc.id}`);
        session.addMessage({ role: 'user', content: tc.input });

        try {
            const response = await agent.run(session, tc.input);

            // 判断结果
            const firstToolCall = response.toolCalls?.[0] || null;
            const actualTool = firstToolCall?.name || null;

            let isPass = false;

            if (tc.expectTool === null) {
                // 期望纯文本回复（不调工具）
                isPass = actualTool === null && !!response.text;
            } else {
                // 期望调用特定工具
                isPass = actualTool === tc.expectTool;

                // 如果工具名对了,还可以检查关键参数
                if (isPass && tc.expectArgs && firstToolCall) {
                    for (const [key, val] of Object.entries(tc.expectArgs)) {
                        if (firstToolCall.args[key] !== undefined && firstToolCall.args[key] !== val) {
                            // 参数不匹配，但不作为硬失败（有些参数 LLM 可能有不同理解）
                            // 只在 target 和 action 不匹配时算失败
                            if (key === 'target' || key === 'action') {
                                isPass = false;
                            }
                        }
                    }
                }
            }

            // 统计
            const cat = tc.category;
            if (!categoryStats[cat]) categoryStats[cat] = { pass: 0, total: 0 };
            categoryStats[cat].total++;

            if (isPass) {
                passed++;
                categoryStats[cat].pass++;
                const toolInfo = actualTool ? `→ ${actualTool}(${JSON.stringify(firstToolCall?.args || {})})` : '→ 文本回复';
                console.log(`  ✅ #${tc.id} "${tc.input}" ${toolInfo}`);
            } else {
                failed++;
                failures.push({ id: tc.id, input: tc.input, expected: tc.expectTool, actual: actualTool });
                console.log(`  ❌ #${tc.id} "${tc.input}" 期望:${tc.expectTool || '文本'} 实际:${actualTool || '文本'}`);
            }
        } catch (error) {
            failed++;
            const cat = tc.category;
            if (!categoryStats[cat]) categoryStats[cat] = { pass: 0, total: 0 };
            categoryStats[cat].total++;
            failures.push({ id: tc.id, input: tc.input, expected: tc.expectTool, actual: null, error: String(error) });
            console.log(`  💥 #${tc.id} "${tc.input}" ERROR: ${error}`);
        }

        // 请求间加延迟，避免 rate limit
        await new Promise(r => setTimeout(r, 800));
    }

    // ── 汇总 ──
    const total = passed + failed;
    const accuracy = ((passed / total) * 100).toFixed(1);

    console.log('\n═══════════════════════════════════════════════');
    console.log(`  📊 总计: ${total} 条 | ✅ ${passed} 通过 | ❌ ${failed} 失败`);
    console.log(`  🎯 工具调用准确率: ${accuracy}%`);
    console.log('═══════════════════════════════════════════════');

    console.log('\n📂 分类统计:');
    for (const [cat, stats] of Object.entries(categoryStats)) {
        const pct = Math.round((stats.pass / stats.total) * 100);
        const icon = pct === 100 ? '✅' : pct >= 80 ? '⚠️' : '❌';
        console.log(`  ${icon} ${cat}: ${stats.pass}/${stats.total} (${pct}%)`);
    }

    if (failures.length > 0) {
        console.log('\n❌ 失败详情:');
        for (const f of failures) {
            console.log(`  #${f.id} "${f.input}"`);
            console.log(`     期望: ${f.expected || '文本'} → 实际: ${f.actual || '文本'}`);
            if (f.error) console.log(`     错误: ${f.error.substring(0, 120)}`);
        }
    }

    // 输出 JSON 结果
    const resultPath = path.join(import.meta.dirname || '.', '..', 'test-data', 'eval-e2e-result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
        model: `${config.model.primary.name}/${config.model.primary.model}`,
        timestamp: new Date().toISOString(),
        total, passed, failed,
        accuracy: Number(accuracy),
        categoryStats,
        failures,
    }, null, 2));
    console.log(`\n📄 详细结果: ${resultPath}`);
}

runE2EEval().catch(e => { console.error('❌', e); process.exit(1); });
