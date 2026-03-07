/**
 * CarClaw Tool Executor — 工具执行器
 *
 * 职责：
 * - 管理已注册的工具
 * - 执行前经 SafetyGuard 安全校验
 * - 执行前检查 DriveMode 是否允许该工具
 * - 错误处理
 */

import type { Tool, ToolResult } from './tool.js';
import type { SafetyGuard } from '../safety/safety-guard.js';
import type { DriveModeController } from '../safety/drive-mode.js';

export interface ToolExecutorConfig {
    safetyGuard?: SafetyGuard;
    driveModeController?: DriveModeController;
}

export class ToolExecutor {
    private tools: Map<string, Tool> = new Map();
    private safetyGuard?: SafetyGuard;
    private driveModeController?: DriveModeController;

    constructor(config?: ToolExecutorConfig) {
        this.safetyGuard = config?.safetyGuard;
        this.driveModeController = config?.driveModeController;
    }

    /**
     * 注册工具
     */
    register(tool: Tool): void {
        this.tools.set(tool.name, tool);
    }

    /**
     * 执行指定工具（含安全校验 + 模式检查）
     */
    async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
        const tool = this.tools.get(name);

        if (!tool) {
            return { success: false, output: `工具 "${name}" 未注册` };
        }

        // ── 1. DriveMode 检查：当前模式是否允许该工具 ──
        if (this.driveModeController && !this.driveModeController.isToolAllowed(name)) {
            const mode = this.driveModeController.getMode();
            return {
                success: false,
                output: `当前驾驶模式(${mode})下不允许执行 ${name}`,
            };
        }

        // ── 2. SafetyGuard 检查：安全规则校验 ──
        if (this.safetyGuard) {
            const check = await this.safetyGuard.check(name, params);
            if (!check.allowed) {
                return {
                    success: false,
                    output: `🛡️ 安全拦截：${check.reason}`,
                };
            }
            // 如果是 warning 级别，继续执行但日志已在 SafetyGuard 中打印
        }

        // ── 3. 执行工具 ──
        try {
            return await tool.execute(params);
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
