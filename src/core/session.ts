/**
 * CarClaw Session Manager — 会话状态管理
 *
 * 复用 OpenClaw Session 模式：
 * - 按 userId 管理独立会话
 * - 维护消息历史
 * - 上下文压缩（Compaction）
 * - 注入车辆状态快照
 */

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCallId?: string;
    name?: string;
}

export interface VehicleSnapshot {
    ac: { on: boolean; temperature: number; mode: string };
    windows: Record<string, string>;
    speed?: number;
    battery?: number;
}

export class Session {
    readonly id: string;
    readonly userId: string;
    messages: Message[] = [];
    vehicleContext: VehicleSnapshot | null = null;
    createdAt: Date;
    lastActiveAt: Date;

    constructor(userId: string) {
        this.id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.userId = userId;
        this.createdAt = new Date();
        this.lastActiveAt = new Date();
    }

    /**
     * 添加消息到会话历史
     */
    addMessage(message: Message): void {
        this.messages.push(message);
        this.lastActiveAt = new Date();
    }

    /**
     * 获取消息历史（带上下文窗口裁剪）
     */
    getHistory(maxMessages: number = 50): Message[] {
        if (this.messages.length <= maxMessages) {
            return [...this.messages];
        }
        // 保留最近 N 条消息
        return this.messages.slice(-maxMessages);
    }

    /**
     * 上下文压缩 — 当历史过长时，用摘要替换旧消息
     * TODO: 接入 LLM 做真正的摘要压缩
     */
    async compact(): Promise<void> {
        const MAX_MESSAGES = 100;
        if (this.messages.length > MAX_MESSAGES) {
            const kept = this.messages.slice(-50);
            const summary: Message = {
                role: 'system',
                content: `[上下文摘要] 此前进行了 ${this.messages.length - 50} 轮对话。`,
            };
            this.messages = [summary, ...kept];
        }
    }

    /**
     * 注入车辆状态到上下文
     */
    setVehicleContext(snapshot: VehicleSnapshot): void {
        this.vehicleContext = snapshot;
    }
}

/**
 * Session Manager — 管理多个用户会话
 */
export class SessionManager {
    private sessions: Map<string, Session> = new Map();

    /**
     * 获取已有会话，或创建新会话
     */
    getOrCreate(userId: string): Session {
        let session = this.sessions.get(userId);
        if (!session) {
            session = new Session(userId);
            this.sessions.set(userId, session);
            console.log(`📋 New session created: ${session.id} for user ${userId}`);
        }
        return session;
    }

    /**
     * 获取会话（可能不存在）
     */
    get(userId: string): Session | undefined {
        return this.sessions.get(userId);
    }

    /**
     * 列出所有活跃会话
     */
    listActive(): Session[] {
        return [...this.sessions.values()];
    }

    /**
     * 清除指定用户会话
     */
    clear(userId: string): void {
        this.sessions.delete(userId);
    }
}
