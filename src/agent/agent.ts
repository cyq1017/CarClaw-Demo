/**
 * CarClaw Agent — 推理与执行核心
 *
 * 复用 OpenClaw Agent Loop 模式 + CarClaw 安全层：
 * Prompt 组装 → LLM 推理 → SafetyGuard 校验 → 工具调用 → 循环 → 回复
 */

import type { Session, Message } from '../core/session.js';
import type { Tool, ToolResult } from '../tools/tool.js';
import { ToolExecutor } from '../tools/tool-executor.js';
import { PromptBuilder } from './prompt-builder.js';
import type { ModelProvider } from './model-provider.js';
import type { SafetyGuard } from '../safety/safety-guard.js';
import type { DriveModeController } from '../safety/drive-mode.js';

export interface AgentConfig {
    name: string;
    modelProvider: ModelProvider;
    systemPromptPath?: string;
    maxToolCalls: number;
    temperature: number;
    /** CarClaw 独有：驾驶安全拦截器 */
    safetyGuard?: SafetyGuard;
    /** CarClaw 独有：驾驶模式控制器 */
    driveModeController?: DriveModeController;
}

export interface AgentResponse {
    text: string;
    toolCalls: Array<{ name: string; args: Record<string, any>; result: ToolResult }>;
}

export class Agent {
    readonly config: AgentConfig;
    private tools: Map<string, Tool> = new Map();
    private toolExecutor: ToolExecutor;
    private promptBuilder: PromptBuilder;

    constructor(config: AgentConfig) {
        this.config = config;
        this.toolExecutor = new ToolExecutor({
            safetyGuard: config.safetyGuard,
            driveModeController: config.driveModeController,
        });
        this.promptBuilder = new PromptBuilder();
    }

    /**
     * 注册一个工具
     */
    registerTool(tool: Tool): void {
        this.tools.set(tool.name, tool);
        this.toolExecutor.register(tool);
        console.log(`🔧 Tool registered: ${tool.name}`);
    }

    /**
     * 注册多个工具
     */
    registerTools(tools: Tool[]): void {
        for (const tool of tools) {
            this.registerTool(tool);
        }
    }

    /**
     * 执行 Agent Loop
     *
     * 1. 更新 DriveMode（根据车辆状态自动判断）
     * 2. 组装 Prompt（System + DriveMode + Vehicle Context + History）
     * 3. 调用 LLM 推理
     * 4. 如果有工具调用 → SafetyGuard 校验 → 执行 → 结果写回 → 再推理
     * 5. 循环直到 LLM 返回纯文本回复
     */
    async run(session: Session, _input: string): Promise<AgentResponse> {
        const toolCallResults: AgentResponse['toolCalls'] = [];
        let iterations = 0;

        // 更新驾驶模式
        if (this.config.driveModeController) {
            await this.config.driveModeController.updateMode();
        }

        // 组装系统提示（含 DriveMode 注入）
        const systemPrompt = this.promptBuilder.build({
            vehicleContext: session.vehicleContext,
            skills: [],
            driveModePrompt: this.config.driveModeController?.getModePrompt(),
        });

        while (iterations < this.config.maxToolCalls) {
            iterations++;

            const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...session.getHistory(),
            ];

            // 调用 LLM
            const llmResponse = await this.config.modelProvider.chat(messages, this.getToolDefinitions());

            // 如果有工具调用
            if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
                for (const toolCall of llmResponse.toolCalls) {
                    console.log(`🔧 Tool call: ${toolCall.name}(${JSON.stringify(toolCall.args)})`);

                    // 执行工具（ToolExecutor 内部会调用 SafetyGuard + DriveMode 检查）
                    const result = await this.toolExecutor.execute(toolCall.name, toolCall.args);
                    toolCallResults.push({ name: toolCall.name, args: toolCall.args, result });

                    session.addMessage({
                        role: 'assistant',
                        content: `[调用工具 ${toolCall.name}]`,
                    });
                    session.addMessage({
                        role: 'tool',
                        content: JSON.stringify(result),
                        toolCallId: toolCall.id,
                        name: toolCall.name,
                    });

                    console.log(`${result.success ? '✅' : '🛡️'} ${result.output}`);
                }
                continue;
            }

            // 纯文本回复 → 结束
            return {
                text: llmResponse.content || '抱歉，我没有理解你的意思。',
                toolCalls: toolCallResults,
            };
        }

        return { text: '操作已完成。', toolCalls: toolCallResults };
    }

    private getToolDefinitions(): any[] {
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
