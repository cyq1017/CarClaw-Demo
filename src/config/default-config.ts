/**
 * CarClaw Default Config — 默认配置
 */

export interface CarClawConfig {
    llm: {
        apiKey: string;
        baseURL: string;
        model: string;
        temperature: number;
    };
    stt: {
        engine: 'mock' | 'whisper' | 'sensevoice';
        modelPath?: string;
    };
    tts: {
        engine: 'console' | 'macos' | 'cosyvoice';
        voice?: string;
    };
    agent: {
        name: string;
        maxToolCalls: number;
    };
}

export const DEFAULT_CONFIG: CarClawConfig = {
    llm: {
        apiKey: process.env.LLM_API_KEY || '',
        baseURL: process.env.LLM_BASE_URL || 'https://api.deepseek.com',
        model: process.env.LLM_MODEL || 'deepseek-chat',
        temperature: 0.7,
    },
    stt: {
        engine: (process.env.STT_ENGINE as any) || 'mock',
        modelPath: process.env.WHISPER_MODEL_PATH,
    },
    tts: {
        engine: (process.env.TTS_ENGINE as any) || 'console',
    },
    agent: {
        name: 'CarClaw',
        maxToolCalls: 10,
    },
};
