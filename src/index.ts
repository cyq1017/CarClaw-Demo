/**
 * CarClaw — 车载 AI 助手入口
 *
 * 启动流程：
 * 1. 加载 carclaw.json 配置（用户自定义模型）
 * 2. 初始化 Model Provider（含 fallback）
 * 3. 创建 Agent + 注册工具
 * 4. 创建 Channel (Text / Voice)
 * 5. 启动 Gateway
 */

import { loadConfig, printModelConfig } from './config/config-loader.js';
import { createProviderFromConfig, MockModelProvider } from './agent/model-provider.js';
import { Agent } from './agent/agent.js';
import { Gateway } from './core/gateway.js';
import { TextChannel } from './channels/text/text-channel.js';
import { VehicleSimulator } from '../mock/vehicle-simulator.js';
import { createVehicleControlTool } from './tools/vehicle/vehicle-control.js';
import { createNavigationTool } from './tools/navigation/navigation.js';
import { createMediaTool } from './tools/media/media.js';
import { createScheduleTool } from './tools/schedule/schedule.js';

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║     🚗 CarClaw v0.1 — 车载AI助手     ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');

    // 1. 加载配置（carclaw.json → 环境变量覆盖）
    const config = loadConfig();

    // 2. 初始化 Model Provider
    const hasApiKey = !!config.model.primary.apiKey && config.model.primary.apiKey !== 'sk-xxx';

    const modelProvider = hasApiKey
        ? createProviderFromConfig(config.model)
        : new MockModelProvider();

    if (hasApiKey) {
        printModelConfig(config);
    } else {
        console.log('⚠️  未配置 API Key，使用 Mock 模式');
        console.log('   编辑 carclaw.json 或设置 LLM_API_KEY 环境变量\n');
    }

    // 3. 创建 Vehicle Simulator
    const vehicleSimulator = new VehicleSimulator();
    console.log('\n🚗 车辆模拟器已就绪');
    console.log(vehicleSimulator.getStatusDescription());
    console.log('');

    // 4. 创建 Agent
    const agent = new Agent({
        name: config.agent.name,
        modelProvider,
        maxToolCalls: config.agent.maxToolCalls,
        temperature: config.agent.temperature,
    });

    // 5. 注册车机工具
    agent.registerTools([
        createVehicleControlTool(vehicleSimulator),
        createNavigationTool(),
        createMediaTool(),
        createScheduleTool(),
    ]);

    // 6. 创建 Text Channel（MVP 主通道）
    const textChannel = new TextChannel();

    // 7. 创建 Gateway 并启动
    const gateway = new Gateway({
        agent,
        channels: [textChannel],
    });

    // 处理退出信号
    process.on('SIGINT', async () => {
        await gateway.stop();
        process.exit(0);
    });

    await gateway.start();
}

// 启动
main().catch((error) => {
    console.error('❌ CarClaw 启动失败:', error);
    process.exit(1);
});
