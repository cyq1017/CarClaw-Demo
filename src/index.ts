/**
 * CarClaw — 车载 AI 助手入口（多 Agent 架构）
 *
 * 启动流程：
 * 1. 加载配置
 * 2. 初始化 Model Provider + TTS
 * 3. 创建 Vehicle Simulator + SafetyGuard + DriveModeController
 * 4. 加载 Skills
 * 5. 创建 4 个专业 Agent + AgentRouter
 * 6. 启动 Gateway（多 Agent 路由）
 */

import { loadConfig, printModelConfig } from './config/config-loader.js';
import { createProviderFromConfig, MockModelProvider } from './agent/model-provider.js';
import { Agent } from './agent/agent.js';
import { AgentRouter } from './agent/agent-router.js';
import { Gateway } from './core/gateway.js';
import { TextChannel } from './channels/text/text-channel.js';
import { createTTSEngine } from './channels/voice/tts.js';
import { VehicleSimulator } from '../mock/vehicle-simulator.js';
import { SafetyGuard } from './safety/safety-guard.js';
import { DriveModeController } from './safety/drive-mode.js';
import { createVehicleControlTool } from './tools/vehicle/vehicle-control.js';
import { createNavigationTool } from './tools/navigation/navigation.js';
import { createMediaTool } from './tools/media/media.js';
import { createScheduleTool } from './tools/schedule/schedule.js';
import { SkillLoader } from './skills/skill-loader.js';

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🚗 CarClaw v0.2 — Multi-Agent Architecture  ║');
    console.log('║  开源车载 AI 助手框架 · Built on OpenClaw      ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    // ── 1. 配置 ──
    const config = loadConfig();

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

    // ── 2. TTS ──
    const tts = createTTSEngine(config.tts.engine);
    console.log(`🔊 TTS: ${config.tts.engine}`);

    // ── 3. 车辆模拟器 + 安全层 ──
    const vehicleSimulator = new VehicleSimulator();
    console.log('\n🚗 车辆模拟器已就绪');
    console.log(vehicleSimulator.getStatusDescription());

    const safetyGuard = new SafetyGuard(vehicleSimulator);
    console.log('🛡️ SafetyGuard 已启动');

    const driveModeController = new DriveModeController(vehicleSimulator);
    await driveModeController.updateMode();
    console.log(`🚦 DriveMode: ${driveModeController.getMode().toUpperCase()}`);

    driveModeController.onModeChange((oldMode, newMode) => {
        console.log(`🚦 DriveMode: ${oldMode} → ${newMode}`);
    });

    // ── 4. Skills ──
    const skillLoader = new SkillLoader(
        new URL('./skills', import.meta.url).pathname
    );
    await skillLoader.loadAll();
    const skillDescriptions = skillLoader.getSkillDescriptions();

    console.log('');

    // ── 5. 创建专业 Agent ──
    const sharedConfig = {
        modelProvider,
        maxToolCalls: config.agent.maxToolCalls,
        temperature: config.agent.temperature,
        safetyGuard,
        driveModeController,
    };

    // 🚗 车控 Agent — 空调/车窗/座椅/灯光
    const vehicleAgent = new Agent({
        ...sharedConfig,
        name: '车控助手',
        skills: skillDescriptions.filter((s) => s.includes('车控') || s.includes('vehicle')),
    });
    vehicleAgent.registerTool(createVehicleControlTool(vehicleSimulator));

    // 🗺️ 导航 Agent — 路线/POI/到达时间
    const navAgent = new Agent({
        ...sharedConfig,
        name: '导航助手',
        skills: skillDescriptions.filter((s) => s.includes('导航') || s.includes('navigation')),
    });
    navAgent.registerTool(createNavigationTool());

    // 🎵 媒体 Agent — 播放/暂停/搜索
    const mediaAgent = new Agent({
        ...sharedConfig,
        name: '媒体助手',
        skills: skillDescriptions.filter((s) => s.includes('媒体') || s.includes('media')),
    });
    mediaAgent.registerTool(createMediaTool());

    // 💬 通用 Agent — 闲聊/日程/兜底（拥有所有工具）
    const generalAgent = new Agent({
        ...sharedConfig,
        name: 'CarClaw',
        skills: skillDescriptions,
    });
    generalAgent.registerTools([
        createVehicleControlTool(vehicleSimulator),
        createNavigationTool(),
        createMediaTool(),
        createScheduleTool(),
    ]);

    // ── 6. 创建 AgentRouter ──
    const router = new AgentRouter();
    router.register('vehicle', vehicleAgent);
    router.register('navigation', navAgent);
    router.register('media', mediaAgent);
    router.register('schedule', generalAgent);
    router.register('general', generalAgent);

    console.log('');

    // ── 7. 启动 Gateway ──
    const textChannel = new TextChannel(tts);
    const gateway = new Gateway({
        router,
        channels: [textChannel],
        vehicleApi: vehicleSimulator,
    });

    process.on('SIGINT', async () => {
        await gateway.stop();
        process.exit(0);
    });

    await gateway.start();
}

main().catch((error) => {
    console.error('❌ CarClaw 启动失败:', error);
    process.exit(1);
});
