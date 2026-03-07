/**
 * CarClaw Plugin Hooks — 扩展点系统
 *
 * 复用 OpenClaw Plugin 模式：
 * - before_tool_call: 工具调用前 hook（可拦截/修改）
 * - after_tool_call: 工具调用后 hook（日志/审计）
 * - on_message: 消息处理 hook
 */

export type HookHandler = (context: HookContext) => Promise<HookContext>;

export interface HookContext {
    type: string;
    data: Record<string, any>;
    cancelled?: boolean;
}

export class HookManager {
    private hooks: Map<string, HookHandler[]> = new Map();

    /**
     * 注册 Hook
     */
    on(event: string, handler: HookHandler): void {
        const handlers = this.hooks.get(event) || [];
        handlers.push(handler);
        this.hooks.set(event, handlers);
    }

    /**
     * 触发 Hook 链
     */
    async trigger(event: string, context: HookContext): Promise<HookContext> {
        const handlers = this.hooks.get(event) || [];

        let ctx = context;
        for (const handler of handlers) {
            ctx = await handler(ctx);
            if (ctx.cancelled) break; // 如果某个 handler 取消了操作，停止链
        }

        return ctx;
    }
}

// 预定义事件名
export const HOOKS = {
    BEFORE_TOOL_CALL: 'before_tool_call',
    AFTER_TOOL_CALL: 'after_tool_call',
    ON_MESSAGE: 'on_message',
    ON_RESPONSE: 'on_response',
    ON_ERROR: 'on_error',
} as const;
