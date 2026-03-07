/**
 * CarClaw Config Loader — 配置加载器
 *
 * 仿照 OpenClaw 的 openclaw.json 模式：
 * 1. 读取 carclaw.json（用户自定义）
 * 2. 合并环境变量覆盖
 * 3. 提供 primary / fallback 模型切换
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ModelProviderEntry {
    /** 供应商名称（显示用） */
    name: string;
    /** API Base URL */
    baseUrl: string;
    /** API Key */
    apiKey: string;
    /** 模型名称 */
    model: string;
    /** API 协议格式 */
    api: 'openai-completions' | 'anthropic-messages';
    /** 温度（可选，覆盖全局） */
    temperature?: number;
}

export interface CarClawJsonConfig {
    model: {
        primary: ModelProviderEntry;
        fallback?: ModelProviderEntry;
    };
    agent: {
        name: string;
        maxToolCalls: number;
        temperature: number;
        systemPrompt?: string;
    };
    stt: {
        engine: 'mock' | 'whisper' | 'sensevoice';
        modelPath?: string;
    };
    tts: {
        engine: 'console' | 'macos' | 'cosyvoice';
        voice?: string;
        apiUrl?: string;
    };
}

/**
 * 从 carclaw.json 加载配置
 *
 * 查找顺序:
 * 1. 当前工作目录 ./carclaw.json
 * 2. 用户目录 ~/.carclaw/carclaw.json
 */
export function loadConfig(configPath?: string): CarClawJsonConfig {
    const searchPaths = configPath
        ? [configPath]
        : [
            path.join(process.cwd(), 'carclaw.json'),
            path.join(process.env.HOME || '~', '.carclaw', 'carclaw.json'),
        ];

    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            try {
                const raw = fs.readFileSync(p, 'utf-8');
                const config = JSON.parse(raw) as CarClawJsonConfig;
                console.log(`⚙️  配置已加载: ${p}`);

                // 环境变量覆盖
                return applyEnvOverrides(config);
            } catch (error) {
                console.error(`⚠️  配置文件解析失败: ${p}`, error);
            }
        }
    }

    console.log('⚙️  未找到 carclaw.json，使用默认配置');
    return getDefaultConfig();
}

/**
 * 环境变量覆盖 — 优先级: env > carclaw.json
 */
function applyEnvOverrides(config: CarClawJsonConfig): CarClawJsonConfig {
    if (process.env.LLM_API_KEY) {
        config.model.primary.apiKey = process.env.LLM_API_KEY;
    }
    if (process.env.LLM_BASE_URL) {
        config.model.primary.baseUrl = process.env.LLM_BASE_URL;
    }
    if (process.env.LLM_MODEL) {
        config.model.primary.model = process.env.LLM_MODEL;
    }
    if (process.env.STT_ENGINE) {
        config.stt.engine = process.env.STT_ENGINE as any;
    }
    if (process.env.TTS_ENGINE) {
        config.tts.engine = process.env.TTS_ENGINE as any;
    }
    return config;
}

/**
 * 默认配置（无 carclaw.json 时使用）
 */
function getDefaultConfig(): CarClawJsonConfig {
    return {
        model: {
            primary: {
                name: 'deepseek',
                baseUrl: process.env.LLM_BASE_URL || 'https://api.deepseek.com',
                apiKey: process.env.LLM_API_KEY || '',
                model: process.env.LLM_MODEL || 'deepseek-chat',
                api: 'openai-completions',
            },
        },
        agent: {
            name: 'CarClaw',
            maxToolCalls: 10,
            temperature: 0.7,
        },
        stt: {
            engine: (process.env.STT_ENGINE as any) || 'mock',
        },
        tts: {
            engine: (process.env.TTS_ENGINE as any) || 'console',
        },
    };
}

/**
 * 打印当前模型配置摘要
 */
export function printModelConfig(config: CarClawJsonConfig): void {
    const p = config.model.primary;
    const f = config.model.fallback;
    console.log(`🧠 模型配置:`);
    console.log(`   Primary:  ${p.name} → ${p.model} (${p.baseUrl})`);
    if (f) {
        console.log(`   Fallback: ${f.name} → ${f.model} (${f.baseUrl})`);
    }
    console.log(`   API 格式: ${p.api}`);
    console.log(`   API Key:  ${p.apiKey ? p.apiKey.slice(0, 6) + '...' : '❌ 未设置'}`);
}
