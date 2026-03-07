/**
 * CarClaw STT (Speech-to-Text) — 语音识别接口
 *
 * 支持多种引擎：
 * - MockSTT: 开发测试用
 * - WhisperSTT: Whisper.cpp 本地推理（未来）
 * - SenseVoiceSTT: 阿里 SenseVoice（未来）
 */

export interface STTEngine {
    /** 将音频 Buffer 转为文字 */
    transcribe(audio: Buffer): Promise<string>;
}

/**
 * Mock STT — 开发调试用，直接返回模拟文本
 */
export class MockSTT implements STTEngine {
    async transcribe(_audio: Buffer): Promise<string> {
        // MVP 阶段不做真正的语音识别
        return '[mock audio transcription]';
    }
}

/**
 * Whisper STT — 使用 whisper.cpp 本地推理
 * TODO: W3 接入
 */
export class WhisperSTT implements STTEngine {
    private modelPath: string;

    constructor(modelPath: string) {
        this.modelPath = modelPath;
    }

    async transcribe(_audio: Buffer): Promise<string> {
        // TODO: 调用 whisper.cpp 进程
        // const result = execSync(`whisper-cpp -m ${this.modelPath} -f audio.wav`);
        throw new Error(`WhisperSTT not implemented yet (model: ${this.modelPath})`);
    }
}
