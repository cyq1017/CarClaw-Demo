/**
 * CarClaw Model Provider — LLM 适配层
 *
 * 使用 OpenAI 兼容格式，支持：
 * - DeepSeek API（默认）
 * - Qwen (阿里)
 * - 任何 OpenAI 兼容 API
 */

import OpenAI from 'openai';
import type { Message } from '../core/session.js';

export interface LLMResponse {
    content: string | null;
    toolCalls?: Array<{
        id: string;
        name: string;
        args: Record<string, any>;
    }>;
}

export interface ModelProvider {
    chat(messages: Message[], tools?: any[]): Promise<LLMResponse>;
}

export interface ModelProviderConfig {
    apiKey: string;
    baseURL: string;
    model: string;
    temperature?: number;
}

/**
 * OpenAI 兼容 Provider — 适用于 DeepSeek / Qwen / OpenAI
 */
export class OpenAICompatibleProvider implements ModelProvider {
    private client: OpenAI;
    private model: string;
    private temperature: number;

    constructor(config: ModelProviderConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        });
        this.model = config.model;
        this.temperature = config.temperature ?? 0.7;
    }

    async chat(messages: Message[], tools?: any[]): Promise<LLMResponse> {
        const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
            model: this.model,
            messages: messages.map((m) => ({
                role: m.role as any,
                content: m.content,
                ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
                ...(m.name ? { name: m.name } : {}),
                ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            })),
            temperature: this.temperature,
        };

        if (tools && tools.length > 0) {
            params.tools = tools;
            params.tool_choice = 'auto';
        }

        const completion = await this.client.chat.completions.create(params);
        const choice = completion.choices[0];

        if (!choice) {
            return { content: null };
        }

        // 解析工具调用
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            return {
                content: choice.message.content,
                toolCalls: choice.message.tool_calls.map((tc) => ({
                    id: tc.id,
                    name: tc.function.name,
                    args: JSON.parse(tc.function.arguments || '{}'),
                })),
            };
        }

        return {
            content: choice.message.content,
        };
    }
}

/**
 * Fallback Provider — 自动切换 primary → fallback
 * 当主模型调用失败时，自动切换到备选模型
 */
export class FallbackModelProvider implements ModelProvider {
    private primary: ModelProvider;
    private fallback: ModelProvider | null;
    private primaryName: string;
    private fallbackName: string;

    constructor(
        primary: ModelProvider,
        fallback: ModelProvider | null,
        primaryName: string = 'primary',
        fallbackName: string = 'fallback'
    ) {
        this.primary = primary;
        this.fallback = fallback;
        this.primaryName = primaryName;
        this.fallbackName = fallbackName;
    }

    async chat(messages: Message[], tools?: any[]): Promise<LLMResponse> {
        try {
            return await this.primary.chat(messages, tools);
        } catch (error) {
            if (!this.fallback) throw error;

            console.warn(
                `⚠️  ${this.primaryName} 调用失败，切换到 ${this.fallbackName}:`,
                error instanceof Error ? error.message : error
            );
            return await this.fallback.chat(messages, tools);
        }
    }
}

/**
 * Mock Provider — 用于测试，不需要 API Key
 */
export class MockModelProvider implements ModelProvider {
    async chat(messages: Message[], _tools?: any[]): Promise<LLMResponse> {
        // 找到最后一条用户消息和最后一条消息
        const lastMessage = messages[messages.length - 1];

        // 如果最后一条消息是 tool 结果，返回文本总结（避免无限循环）
        if (lastMessage?.role === 'tool') {
            const result = JSON.parse(lastMessage.content || '{}');
            return {
                content: result.output || '操作已完成。',
            };
        }

        // 只对用户消息做意图匹配
        const userText = lastMessage?.role === 'user' ? lastMessage.content : '';

        if (userText.includes('空调') || userText.includes('温度')) {
            return {
                content: null,
                toolCalls: [{
                    id: `mock_${Date.now()}`,
                    name: 'vehicle_control',
                    args: { target: 'ac', action: 'on', value: 22 },
                }],
            };
        }

        if (userText.includes('导航') || userText.includes('去')) {
            return {
                content: null,
                toolCalls: [{
                    id: `mock_${Date.now()}`,
                    name: 'navigation',
                    args: { destination: userText, action: 'navigate' },
                }],
            };
        }

        if (userText.includes('播放') || userText.includes('音乐') || userText.includes('歌')) {
            return {
                content: null,
                toolCalls: [{
                    id: `mock_${Date.now()}`,
                    name: 'media_control',
                    args: { action: 'play', query: userText },
                }],
            };
        }

        return {
            content: `好的，我是 CarClaw 🚗 有什么可以帮你的？（提示：试试"打开空调"、"导航到xxx"、"播放音乐"）`,
        };
    }
}

// ═══════════════════════════════════════════
//  工厂函数 — 从 carclaw.json 配置创建 Provider
// ═══════════════════════════════════════════

import type { ModelProviderEntry } from '../config/config-loader.js';

/**
 * 从 carclaw.json 的 model entry 创建 ModelProvider
 */
export function createProviderFromEntry(entry: ModelProviderEntry): ModelProvider {
    return new OpenAICompatibleProvider({
        apiKey: entry.apiKey,
        baseURL: entry.baseUrl,
        model: entry.model,
        temperature: entry.temperature,
    });
}

/**
 * 从完整的 model 配置创建 Provider（含 fallback）
 */
export function createProviderFromConfig(
    modelConfig: { primary: ModelProviderEntry; fallback?: ModelProviderEntry }
): ModelProvider {
    const primary = createProviderFromEntry(modelConfig.primary);
    const fallback = modelConfig.fallback
        ? createProviderFromEntry(modelConfig.fallback)
        : null;

    if (fallback) {
        return new FallbackModelProvider(
            primary,
            fallback,
            modelConfig.primary.name,
            modelConfig.fallback!.name
        );
    }

    return primary;
}
