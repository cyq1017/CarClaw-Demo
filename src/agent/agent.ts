/**
 * CarClaw Agent — 推理与执行核心
 *
 * 复用 OpenClaw Agent Loop 模式：
 * Prompt 组装 → LLM 推理 → 工具调用 → 循环 → 回复
 */

import type { Session, Message } from '../core/session.js';
import type { Tool, ToolResult } from '../tools/tool.js';
import { ToolExecutor } from '../tools/tool-executor.js';
import { PromptBuilder } from './prompt-builder.js';
import type { ModelProvider } from './model-provider.js';

export interface AgentConfig {
    name: string;
    modelProvider: ModelProvider;
    systemPromptPath?: string;
    maxToolCalls: number;
    temperature: number;
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
        this.toolExecutor = new ToolExecutor();
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
     * 1. 组装 Prompt（System + History + Skills + Vehicle Context）
     * 2. 调用 LLM 推理
     * 3. 如果有工具调用 → 执行 → 结果写回 → 再推理
     * 4. 循环直到 LLM 返回纯文本回复
     * 5. 返回最终回复
     */
    async run(session: Session, _input: string): Promise<AgentResponse> {
        const toolCallResults: AgentResponse['toolCalls'] = [];
        let iterations = 0;

        // 1. 组装系统提示
        const systemPrompt = this.promptBuilder.build({
            vehicleContext: session.vehicleContext,
            skills: [], // TODO: 从 SkillLoader 加载
        });

        while (iterations < this.config.maxToolCalls) {
            iterations++;

            // 2. 组装消息
            const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...session.getHistory(),
            ];

            // 3. 调用 LLM
            const llmResponse = await this.config.modelProvider.chat(messages, this.getToolDefinitions());

            // 4. 如果有工具调用
            if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
                for (const toolCall of llmResponse.toolCalls) {
                    console.log(`🔧 Tool call: ${toolCall.name}(${JSON.stringify(toolCall.args)})`);

                    // 执行工具
                    const result = await this.toolExecutor.execute(toolCall.name, toolCall.args);
                    toolCallResults.push({ name: toolCall.name, args: toolCall.args, result });

                    // 工具结果写回会话
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

                    console.log(`✅ Tool result: ${result.success ? '成功' : '失败'} — ${result.output}`);
                }
                // 继续循环，让 LLM 看到工具结果后再决定
                continue;
            }

            // 5. 纯文本回复 → 结束循环
            return {
                text: llmResponse.content || '抱歉，我没有理解你的意思。',
                toolCalls: toolCallResults,
            };
        }

        // 超过最大工具调用次数
        return {
            text: '操作已完成。',
            toolCalls: toolCallResults,
        };
    }

    /**
     * 获取所有注册工具的定义（给 LLM 用）
     */
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
