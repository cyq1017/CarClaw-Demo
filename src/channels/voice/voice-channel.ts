/**
 * CarClaw Voice Channel — 语音通道
 *
 * MVP 阶段为架构占位，实际输入走 TextChannel
 * 未来接入 Whisper.cpp (STT) + CosyVoice (TTS)
 */

import { Channel } from '../channel.js';
import type { STTEngine } from './stt.js';
import type { TTSEngine } from './tts.js';

export class VoiceChannel extends Channel {
    readonly name = 'voice';
    private stt: STTEngine;
    private tts: TTSEngine;

    constructor(stt: STTEngine, tts: TTSEngine) {
        super();
        this.stt = stt;
        this.tts = tts;
    }

    /**
     * 处理音频输入
     */
    async handleAudioInput(userId: string, audioBuffer: Buffer): Promise<string> {
        // 1. STT: 音频 → 文字
        const text = await this.stt.transcribe(audioBuffer);
        console.log(`🎤 STT: "${text}"`);

        // 2. 发送到 Agent
        if (!this.handler) {
            throw new Error('No message handler registered');
        }
        const response = await this.handler(userId, text);

        // 3. TTS: 文字 → 语音
        await this.tts.speak(response);

        return response;
    }

    async start(): Promise<void> {
        console.log('🎙️ Voice Channel ready (waiting for audio input)');
    }

    async stop(): Promise<void> {
        console.log('🎙️ Voice Channel stopped');
    }
}
