/**
 * CarClaw TTS 引擎 — 文字转语音
 *
 * 支持多种 TTS 后端：
 * - ConsoleTTS: 纯文本输出（调试用）
 * - MacOSTTS: macOS 原生 `say` 命令（MVP 推荐）
 * - CosyVoiceTTS: 海螺 AI 语音（未来接入）
 */

export interface TTSEngine {
    speak(text: string): Promise<void>;
    stop(): Promise<void>;
}

/**
 * Console TTS — 纯文本打印，调试用
 */
export class ConsoleTTS implements TTSEngine {
    async speak(text: string): Promise<void> {
        // 仅打印，不发声
    }

    async stop(): Promise<void> { }
}

/**
 * macOS Native TTS — 使用系统 `say` 命令
 *
 * 支持中文语音，零依赖，零延迟启动
 * 使用 Ting-Ting（中文）语音
 */
export class MacOSTTS implements TTSEngine {
    private voice: string;
    private rate: number;
    private currentProcess: any = null;

    constructor(options?: { voice?: string; rate?: number }) {
        this.voice = options?.voice || 'Ting-Ting';  // 中文语音
        this.rate = options?.rate || 200;              // 语速
    }

    async speak(text: string): Promise<void> {
        // 清理文本（去掉 emoji 和特殊字符，say 不支持）
        const cleanText = text
            .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')   // emoji
            .replace(/[🚗🤖💬🔧✅❌🛡️⚠️🎵🗺️📅]/g, '')  // 项目用的 emoji
            .replace(/\n/g, ' ')
            .trim();

        if (!cleanText) return;

        const { spawn } = await import('child_process');

        return new Promise<void>((resolve, reject) => {
            this.currentProcess = spawn('say', [
                '-v', this.voice,
                '-r', String(this.rate),
                cleanText,
            ]);

            this.currentProcess.on('close', (code: number) => {
                this.currentProcess = null;
                if (code === 0) resolve();
                else reject(new Error(`TTS exited with code ${code}`));
            });

            this.currentProcess.on('error', (err: Error) => {
                this.currentProcess = null;
                // say 命令不存在（非 macOS），静默降级
                console.warn('⚠️ TTS 不可用（非 macOS），静默降级');
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }
    }
}

/**
 * 根据配置创建 TTS 引擎
 */
export function createTTSEngine(engine: string): TTSEngine {
    switch (engine) {
        case 'macos':
            return new MacOSTTS();
        case 'console':
        default:
            return new ConsoleTTS();
    }
}
