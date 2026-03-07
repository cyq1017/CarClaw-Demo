/**
 * CarClaw TTS (Text-to-Speech) — 语音合成接口
 *
 * 支持多种引擎：
 * - ConsoleTTS: 终端打印（MVP）
 * - CosyVoiceTTS: 阿里 CosyVoice（未来）
 */

export interface TTSEngine {
    /** 将文字转为语音输出 */
    speak(text: string): Promise<void>;
}

/**
 * Console TTS — MVP 阶段直接打印到终端
 */
export class ConsoleTTS implements TTSEngine {
    async speak(text: string): Promise<void> {
        console.log(`🔊 [TTS] ${text}`);
    }
}

/**
 * macOS System TTS — 使用 macOS 内置 say 命令
 * 适合本地开发体验
 */
export class MacOSTTS implements TTSEngine {
    private voice: string;

    constructor(voice: string = 'Ting-Ting') {
        this.voice = voice; // Ting-Ting = 中文女声
    }

    async speak(text: string): Promise<void> {
        // TODO: 使用 child_process 调用 say
        // execSync(`say -v ${this.voice} "${text}"`);
        console.log(`🔊 [macOS TTS → ${this.voice}] ${text}`);
    }
}
