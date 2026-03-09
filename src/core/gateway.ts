/**
 * CarClaw Gateway — 多 Agent 消息网关
 *
 * 职责：
 * 1. 接收用户消息
 * 2. 通过 AgentRouter 分发到专业 Agent
 * 3. 每轮注入最新车辆状态
 * 4. 回复路由回 Channel
 */

import type { Channel } from '../channels/channel.js';
import type { Agent } from '../agent/agent.js';
import type { AgentRouter } from '../agent/agent-router.js';
import type { VehicleAPI } from '../tools/vehicle/vehicle-api.js';
import { SessionManager } from './session.js';

export interface GatewayConfig {
    /** 单 Agent 模式（向后兼容） */
    agent?: Agent;
    /** 多 Agent 模式 */
    router?: AgentRouter;
    channels?: Channel[];
    vehicleApi?: VehicleAPI;
}

export class Gateway {
    private agent?: Agent;
    private router?: AgentRouter;
    private channels: Map<string, Channel> = new Map();
    private sessionManager: SessionManager;
    private vehicleApi?: VehicleAPI;

    constructor(config: GatewayConfig) {
        this.agent = config.agent;
        this.router = config.router;
        this.sessionManager = new SessionManager();
        this.vehicleApi = config.vehicleApi;

        if (!this.agent && !this.router) {
            throw new Error('Gateway 需要 agent 或 router 至少一个');
        }

        if (config.channels) {
            for (const channel of config.channels) {
                this.registerChannel(channel);
            }
        }
    }

    registerChannel(channel: Channel): void {
        this.channels.set(channel.name, channel);
        channel.onMessage(async (userId, text) => {
            return this.handleMessage(channel.name, userId, text);
        });
        console.log(`📡 Channel registered: ${channel.name}`);
    }

    async handleMessage(_channelName: string, userId: string, text: string): Promise<string> {
        const session = this.sessionManager.getOrCreate(userId);

        // 刷新车辆状态
        if (this.vehicleApi) {
            const status = await this.vehicleApi.getStatus();
            session.setVehicleContext({
                ac: {
                    on: status.ac?.on ?? false,
                    temperature: status.ac?.temperature ?? 24,
                    mode: status.ac?.mode ?? 'auto',
                },
                windows: status.windows ?? {},
                speed: status.speed,
                battery: status.battery,
            });
        }

        session.addMessage({ role: 'user', content: text });

        // 多 Agent 路由 or 单 Agent
        const response = this.router
            ? await this.router.route(session, text)
            : await this.agent!.run(session, text);

        session.addMessage({ role: 'assistant', content: response.text });

        return response.text;
    }

    async start(): Promise<void> {
        const mode = this.router ? '多 Agent' : '单 Agent';
        console.log(`🚗 CarClaw Gateway starting... (${mode} 模式)`);
        console.log(`📡 Channels: ${[...this.channels.keys()].join(', ')}`);

        if (this.router) {
            const agents = this.router.listAgents();
            console.log(`🔀 Agents: ${agents.map((a) => `${a.domain}→${a.name}`).join(', ')}`);
        }

        for (const channel of this.channels.values()) {
            await channel.start();
        }

        console.log('✅ CarClaw Gateway ready!');
    }

    async stop(): Promise<void> {
        for (const channel of this.channels.values()) {
            await channel.stop();
        }
        console.log('🛑 CarClaw Gateway stopped.');
    }
}
