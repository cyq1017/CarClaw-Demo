/**
 * CarClaw Tool Executor — 工具执行器
 *
 * 职责：
 * - 管理已注册的工具
 * - 根据名称查找并执行工具
 * - 错误处理与超时控制
 */

import type { Tool, ToolResult } from './tool.js';

export class ToolExecutor {
    private tools: Map<string, Tool> = new Map();

    /**
     * 注册工具
     */
    register(tool: Tool): void {
        this.tools.set(tool.name, tool);
    }

    /**
     * 执行指定工具
     */
    async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
        const tool = this.tools.get(name);

        if (!tool) {
            return {
                success: false,
                output: `工具 "${name}" 未注册`,
            };
        }

        try {
            const result = await tool.execute(params);
            return result;
        } catch (error) {
            return {
                success: false,
                output: `工具执行失败: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * 获取所有已注册工具名称
     */
    listTools(): string[] {
        return [...this.tools.keys()];
    }

    /**
     * 获取工具定义（用于 LLM）
     */
    getToolDefinitions(): any[] {
        return [...this.tools.values()].map((tool) => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));
    }
}
