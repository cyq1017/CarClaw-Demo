/**
 * CarClaw Text Channel — CLI 文本通道
 *
 * MVP 主力通道：通过命令行交互，便于开发调试
 */

import * as readline from 'readline';
import { Channel } from '../channel.js';

export class TextChannel extends Channel {
    readonly name = 'text';
    private rl: readline.Interface | null = null;

    async start(): Promise<void> {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log('\n🚗 CarClaw CLI 模式已启动');
        console.log('💬 输入消息与车载助手对话，输入 "exit" 退出\n');

        this.prompt();
    }

    private prompt(): void {
        this.rl?.question('你: ', async (input) => {
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
                } catch (error) {
                    console.error(`\n❌ 错误: ${error}\n`);
                }
            }

            this.prompt();
        });
    }

    async stop(): Promise<void> {
        this.rl?.close();
        this.rl = null;
    }
}
