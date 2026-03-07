/**
 * CarClaw Gateway — 消息网关
 *
 * 职责：
 * 1. 注册并管理多个 Channel（语音/文本）
 * 2. 接收来自 Channel 的消息，分发到 Agent
 * 3. 将 Agent 回复路由回对应 Channel
 */

import type { Channel } from '../channels/channel.js';
import type { Agent } from '../agent/agent.js';
import { SessionManager } from './session.js';

export interface GatewayConfig {
    /** Agent 实例 */
    agent: Agent;
    /** 注册的通道列表 */
    channels?: Channel[];
}

export class Gateway {
    private agent: Agent;
    private channels: Map<string, Channel> = new Map();
    private sessionManager: SessionManager;

    constructor(config: GatewayConfig) {
        this.agent = config.agent;
        this.sessionManager = new SessionManager();

        if (config.channels) {
            for (const channel of config.channels) {
                this.registerChannel(channel);
            }
        }
    }

    /**
     * 注册一个消息通道
     */
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
    async handleMessage(channelName: string, userId: string, text: string): Promise<string> {
        // 1. 获取或创建 Session
        const session = this.sessionManager.getOrCreate(userId);

        // 2. 添加用户消息到历史
        session.addMessage({ role: 'user', content: text });

        // 3. 调用 Agent 处理
        const response = await this.agent.run(session, text);

        // 4. 添加助手回复到历史
        session.addMessage({ role: 'assistant', content: response.text });

        // 5. 返回回复
        return response.text;
    }

    /**
     * 启动所有已注册的 Channel
     */
    async start(): Promise<void> {
        console.log('🚗 CarClaw Gateway starting...');
        console.log(`📡 Channels: ${[...this.channels.keys()].join(', ')}`);

        for (const channel of this.channels.values()) {
            await channel.start();
        }

        console.log('✅ CarClaw Gateway ready!');
    }

    /**
     * 停止 Gateway
     */
    async stop(): Promise<void> {
        for (const channel of this.channels.values()) {
            await channel.stop();
        }
        console.log('🛑 CarClaw Gateway stopped.');
    }
}
