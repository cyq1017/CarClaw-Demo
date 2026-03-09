/**
 * CarClaw Agent Router — 多 Agent 意图路由器
 *
 * 根据用户意图将消息分发到专业 Agent：
 * - vehicle → VehicleAgent（车控）
 * - navigation → NavAgent（导航）
 * - media → MediaAgent（娱乐）
 * - general → GeneralAgent（闲聊/兜底）
 *
 * 路由策略：关键词匹配（MVP） → 未来可换成 LLM 意图分类
 */

import type { Agent, AgentResponse } from './agent.js';
import type { Session } from '../core/session.js';

export type AgentDomain = 'vehicle' | 'navigation' | 'media' | 'schedule' | 'general';

export interface RouteResult {
    domain: AgentDomain;
    agent: Agent;
    confidence: number;
}

export class AgentRouter {
    private agents: Map<AgentDomain, Agent> = new Map();
    private defaultDomain: AgentDomain = 'general';

    /**
     * 注册专业 Agent
     */
    register(domain: AgentDomain, agent: Agent): void {
        this.agents.set(domain, agent);
        console.log(`🔀 Agent registered: ${domain} → ${agent.config.name}`);
    }

    /**
     * 路由用户消息到合适的 Agent
     */
    async route(session: Session, input: string): Promise<AgentResponse> {
        const routeResult = this.classify(input);
        console.log(`🔀 Route: "${input.slice(0, 20)}..." → ${routeResult.domain} (${Math.round(routeResult.confidence * 100)}%)`);

        return routeResult.agent.run(session, input);
    }

    /**
     * 意图分类（MVP: 关键词匹配）
     */
    classify(input: string): RouteResult {
        const text = input.toLowerCase();

        // 车控意图
        if (this.matchesAny(text, [
            '空调', '温度', '车窗', '座椅', '加热', '灯光', '车门',
            '雨刷', '后备箱', '天窗', '暖风', '冷风', '开灯', '关灯',
        ])) {
            return this.result('vehicle', 0.9);
        }

        // 导航意图
        if (this.matchesAny(text, [
            '导航', '去', '路线', '到达', '停车场', '加油站', '充电',
            '附近', '多远', '多久', '怎么走', '在哪',
        ])) {
            return this.result('navigation', 0.85);
        }

        // 媒体意图
        if (this.matchesAny(text, [
            '播放', '音乐', '歌', '暂停', '下一首', '上一首', '声音',
            '音量', '电台', '播客', '有声书',
        ])) {
            return this.result('media', 0.85);
        }

        // 日程意图
        if (this.matchesAny(text, [
            '提醒', '日程', '会议', '闹钟', '几点', '预约', '安排',
        ])) {
            return this.result('schedule', 0.8);
        }

        // 兜底
        return this.result('general', 0.5);
    }

    /**
     * 获取所有已注册 Agent
     */
    listAgents(): Array<{ domain: AgentDomain; name: string }> {
        return [...this.agents.entries()].map(([domain, agent]) => ({
            domain,
            name: agent.config.name,
        }));
    }

    private matchesAny(text: string, keywords: string[]): boolean {
        return keywords.some((kw) => text.includes(kw));
    }

    private result(domain: AgentDomain, confidence: number): RouteResult {
        const agent = this.agents.get(domain) || this.agents.get(this.defaultDomain);
        if (!agent) throw new Error(`No agent registered for domain: ${domain}`);
        return { domain, agent, confidence };
    }
}
