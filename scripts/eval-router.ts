/**
 * CarClaw 评测脚本 — 意图路由准确率测试
 *
 * 读取 test-data/intents.json，逐条测试 AgentRouter 的意图分类
 *
 * 用法: npx tsx scripts/eval-router.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentRouter } from '../src/agent/agent-router.js';

interface TestCase {
    id: number;
    input: string;
    expect_domain: string;
    expect_tool?: string | null;
    expect_args?: Record<string, any>;
    category: string;
    driving?: boolean;
    speed?: number;
    expect_blocked?: boolean;
    expect_warning?: boolean;
}

function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  📊 CarClaw 评测 — AgentRouter 意图分类       ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    // 加载测试数据
    const dataPath = path.join(import.meta.dirname || '.', '..', 'test-data', 'intents.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const tests: TestCase[] = data.tests;

    // 创建 AgentRouter（只需要分类能力，不需要真实 Agent）
    const router = new AgentRouter();

    let passed = 0;
    let failed = 0;
    const failures: Array<{ id: number; input: string; expected: string; got: string }> = [];
    const categoryStats: Map<string, { pass: number; fail: number }> = new Map();

    for (const test of tests) {
        const result = router.classify(test.input);
        const domainMatch = result.domain === test.expect_domain;

        // 更新分类统计
        const cat = test.category;
        if (!categoryStats.has(cat)) categoryStats.set(cat, { pass: 0, fail: 0 });

        if (domainMatch) {
            passed++;
            categoryStats.get(cat)!.pass++;
            console.log(`  ✅ #${test.id} "${test.input}" → ${result.domain} (${Math.round(result.confidence * 100)}%)`);
        } else {
            failed++;
            categoryStats.get(cat)!.fail++;
            failures.push({
                id: test.id,
                input: test.input,
                expected: test.expect_domain,
                got: result.domain,
            });
            console.log(`  ❌ #${test.id} "${test.input}" → ${result.domain} (期望: ${test.expect_domain})`);
        }
    }

    // 结果汇总
    const total = passed + failed;
    const rate = ((passed / total) * 100).toFixed(1);

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log(`  📊 总计: ${total} 条 | ✅ ${passed} 通过 | ❌ ${failed} 失败`);
    console.log(`  🎯 路由准确率: ${rate}%`);
    console.log('═══════════════════════════════════════════════');

    // 分类别统计
    console.log('\n📂 分类统计:');
    for (const [cat, stats] of categoryStats) {
        const catTotal = stats.pass + stats.fail;
        const catRate = ((stats.pass / catTotal) * 100).toFixed(0);
        const icon = stats.fail === 0 ? '✅' : '⚠️';
        console.log(`  ${icon} ${cat}: ${stats.pass}/${catTotal} (${catRate}%)`);
    }

    // 失败详情
    if (failures.length > 0) {
        console.log('\n❌ 失败详情:');
        for (const f of failures) {
            console.log(`  #${f.id} "${f.input}"`);
            console.log(`     期望: ${f.expected} → 实际: ${f.got}`);
        }
    }

    console.log('');

    // 退出码
    process.exit(failed > 0 ? 1 : 0);
}

main();
