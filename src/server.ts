/**
 * CarClaw HTTP API Server
 *
 * 提供 REST API 让 Web 前端调用：
 * - POST /api/chat    → 发送消息，返回 Agent 回复
 * - GET  /api/status  → 获取车辆状态
 * - POST /api/mode    → 切换驾驶模式
 * - GET  /api/agents  → 列出所有 Agent
 *
 * 同时托管 public/ 目录下的静态文件（Web UI）
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, printModelConfig } from './config/config-loader.js';
import { createProviderFromConfig, MockModelProvider } from './agent/model-provider.js';
import { Agent } from './agent/agent.js';
import { AgentRouter } from './agent/agent-router.js';
import { VehicleSimulator } from '../mock/vehicle-simulator.js';
import { SafetyGuard } from './safety/safety-guard.js';
import { DriveModeController } from './safety/drive-mode.js';
import { createVehicleControlTool } from './tools/vehicle/vehicle-control.js';
import { createNavigationTool } from './tools/navigation/navigation.js';
import { createMediaTool } from './tools/media/media.js';
import { createScheduleTool } from './tools/schedule/schedule.js';
import { SkillLoader } from './skills/skill-loader.js';
import { SessionManager } from './core/session.js';

const PORT = Number(process.env.PORT || 3000);

async function main() {
    console.log('🚗 CarClaw Web Server starting...\n');

    // ── 初始化（复用 index.ts 的逻辑）──
    const config = loadConfig();
    const hasApiKey = !!config.model.primary.apiKey && config.model.primary.apiKey !== 'sk-xxx';
    const modelProvider = hasApiKey ? createProviderFromConfig(config.model) : new MockModelProvider();

    if (hasApiKey) printModelConfig(config);
    else console.log('⚠️  Mock 模式\n');

    const vehicleSimulator = new VehicleSimulator();
    const safetyGuard = new SafetyGuard(vehicleSimulator);
    const driveModeController = new DriveModeController(vehicleSimulator);
    await driveModeController.updateMode();

    const skillLoader = new SkillLoader(new URL('./skills', import.meta.url).pathname);
    await skillLoader.loadAll();
    const skillDescriptions = skillLoader.getSkillDescriptions();

    const sharedConfig = {
        modelProvider,
        maxToolCalls: config.agent.maxToolCalls,
        temperature: config.agent.temperature,
        safetyGuard,
        driveModeController,
    };

    const vehicleAgent = new Agent({ ...sharedConfig, name: '车控助手', skills: skillDescriptions });
    vehicleAgent.registerTool(createVehicleControlTool(vehicleSimulator));

    const navAgent = new Agent({ ...sharedConfig, name: '导航助手', skills: skillDescriptions });
    navAgent.registerTool(createNavigationTool());

    const mediaAgent = new Agent({ ...sharedConfig, name: '媒体助手', skills: skillDescriptions });
    mediaAgent.registerTool(createMediaTool());

    const generalAgent = new Agent({ ...sharedConfig, name: 'CarClaw', skills: skillDescriptions });
    generalAgent.registerTools([
        createVehicleControlTool(vehicleSimulator),
        createNavigationTool(),
        createMediaTool(),
        createScheduleTool(),
    ]);

    const router = new AgentRouter();
    router.register('vehicle', vehicleAgent);
    router.register('navigation', navAgent);
    router.register('media', mediaAgent);
    router.register('schedule', generalAgent);
    router.register('general', generalAgent);

    const sessionManager = new SessionManager();

    // ── MIME 类型 ──
    const MIME: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
    };

    // ── HTTP Server ──
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://localhost:${PORT}`);

        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        // ── API Routes ──
        if (url.pathname === '/api/chat' && req.method === 'POST') {
            const body = await readBody(req);
            const { message, userId = 'web-user' } = JSON.parse(body);

            const session = sessionManager.getOrCreate(userId);
            const vehicleStatus = await vehicleSimulator.getStatus();
            session.setVehicleContext({
                ac: { on: vehicleStatus.ac?.on ?? false, temperature: vehicleStatus.ac?.temperature ?? 24, mode: vehicleStatus.ac?.mode ?? 'auto' },
                windows: vehicleStatus.windows ?? {},
                speed: vehicleStatus.speed,
                battery: vehicleStatus.battery,
            });

            session.addMessage({ role: 'user', content: message });

            const routeResult = router.classify(message);
            const response = await router.route(session, message);

            session.addMessage({ role: 'assistant', content: response.text });

            const updatedStatus = await vehicleSimulator.getStatus();

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                reply: response.text,
                domain: routeResult.domain,
                confidence: routeResult.confidence,
                toolCalls: response.toolCalls,
                vehicleStatus: updatedStatus,
                driveMode: driveModeController.getMode(),
            }));
            return;
        }

        if (url.pathname === '/api/status' && req.method === 'GET') {
            const status = await vehicleSimulator.getStatus();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                vehicle: status,
                driveMode: driveModeController.getMode(),
                agents: router.listAgents(),
            }));
            return;
        }

        if (url.pathname === '/api/mode' && req.method === 'POST') {
            const body = await readBody(req);
            const { speed = 0 } = JSON.parse(body);
            vehicleSimulator.setSpeed(speed);
            await driveModeController.updateMode();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ driveMode: driveModeController.getMode(), speed }));
            return;
        }

        // ── 静态文件 ──
        const publicDir = path.join(import.meta.dirname || '.', '..', 'public');
        let filePath = path.join(publicDir, url.pathname === '/' ? 'index.html' : url.pathname);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });

    server.listen(PORT, () => {
        console.log(`\n🌐 CarClaw Web Demo: http://localhost:${PORT}`);
        console.log(`📡 API: http://localhost:${PORT}/api/chat`);
        console.log(`🚗 Status: http://localhost:${PORT}/api/status\n`);
    });
}

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => resolve(data));
    });
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
