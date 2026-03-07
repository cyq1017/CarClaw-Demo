/**
 * CarClaw Text Channel — CLI 文本通道（支持 TTS 语音输出）
 *
 * MVP 主力通道：通过命令行交互 + 可选语音回复
 */

import * as readline from 'readline';
import { Channel } from '../channel.js';
import type { TTSEngine } from '../voice/tts.js';

export class TextChannel extends Channel {
    readonly name = 'text';
    private rl: readline.Interface | null = null;
    private closed = false;
    private tts: TTSEngine | null;

    constructor(tts?: TTSEngine) {
        super();
        this.tts = tts || null;
    }

    async start(): Promise<void> {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        this.rl.on('close', () => {
            this.closed = true;
        });

        console.log('\n🚗 CarClaw CLI 模式已启动');
        if (this.tts) {
            console.log('🔊 TTS 已启用 — 助手会语音回复');
        }
        console.log('💬 输入消息与车载助手对话，输入 "exit" 退出\n');

        this.prompt();
    }

    private prompt(): void {
        if (this.closed || !this.rl) return;

        this.rl.question('你: ', async (input) => {
            const text = input.trim();

            if (text === 'exit' || text === 'quit') {
                console.log('👋 再见！安全驾驶！');
                await this.stop();
                process.exit(0);
                return;
            }

            if (!text) {
                this.prompt();
                return;
            }

            if (this.handler) {
                try {
                    const response = await this.handler('driver', text);
                    console.log(`\n🤖 CarClaw: ${response}\n`);

                    // TTS 语音输出
                    if (this.tts) {
                        await this.tts.speak(response);
                    }
                } catch (error) {
                    console.error(`\n❌ 错误: ${error}\n`);
                }
            }

            this.prompt();
        });
    }

    async stop(): Promise<void> {
        this.closed = true;
        if (this.tts) {
            await this.tts.stop();
        }
        this.rl?.close();
        this.rl = null;
    }
}
