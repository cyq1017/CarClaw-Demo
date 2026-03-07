/**
 * CarClaw Channel — 消息通道基类
 *
 * 所有通道（语音/文本/未来的 Android Auto）都继承此基类
 */

export type MessageHandler = (userId: string, text: string) => Promise<string>;

export abstract class Channel {
    abstract readonly name: string;
    protected handler: MessageHandler | null = null;

    /**
     * 注册消息处理回调（由 Gateway 调用）
     */
    onMessage(handler: MessageHandler): void {
        this.handler = handler;
    }

    /**
     * 启动通道
     */
    abstract start(): Promise<void>;

    /**
     * 停止通道
     */
    abstract stop(): Promise<void>;
}
