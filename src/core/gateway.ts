/**
 * CarClaw Gateway — 消息网关
 *
 * 职责：
 * 1. 注册并管理多个 Channel（语音/文本）
 * 2. 接收来自 Channel 的消息，分发到 Agent
 * 3. 每轮对话前注入最新车辆状态到 Session
 * 4. 将 Agent 回复路由回对应 Channel
 */

import type { Channel } from '../channels/channel.js';
import type { Agent } from '../agent/agent.js';
import type { VehicleAPI } from '../tools/vehicle/vehicle-api.js';
import { SessionManager } from './session.js';

export interface GatewayConfig {
    agent: Agent;
    channels?: Channel[];
    /** 车辆 API — 用于每轮对话前注入最新车辆状态 */
    vehicleApi?: VehicleAPI;
}

export class Gateway {
    private agent: Agent;
    private channels: Map<string, Channel> = new Map();
    private sessionManager: SessionManager;
    private vehicleApi?: VehicleAPI;

    constructor(config: GatewayConfig) {
        this.agent = config.agent;
        this.sessionManager = new SessionManager();
        this.vehicleApi = config.vehicleApi;

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

    /**
     * 处理来自 Channel 的消息
     */
    async handleMessage(_channelName: string, userId: string, text: string): Promise<string> {
        const session = this.sessionManager.getOrCreate(userId);

        // 🆕 每轮对话前刷新车辆状态快照到 Session
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

        // 添加用户消息
        session.addMessage({ role: 'user', content: text });

        // 调用 Agent
        const response = await this.agent.run(session, text);

        // 添加最终助手回复
        session.addMessage({ role: 'assistant', content: response.text });

        return response.text;
    }

    async start(): Promise<void> {
        console.log('🚗 CarClaw Gateway starting...');
        console.log(`📡 Channels: ${[...this.channels.keys()].join(', ')}`);

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
