/**
 * CarClaw Task Queue — 任务队列与并发控制
 *
 * 复用 OpenClaw Queue 模式：
 * - 控制并发工具调用数量
 * - 任务排队、优先级（未来）
 */

type AsyncTask<T> = () => Promise<T>;

export class TaskQueue {
    private concurrency: number;
    private running: number = 0;
    private queue: Array<{
        task: AsyncTask<any>;
        resolve: (value: any) => void;
        reject: (reason: any) => void;
    }> = [];

    constructor(concurrency: number = 3) {
        this.concurrency = concurrency;
    }

    /**
     * 提交任务到队列
     */
    async enqueue<T>(task: AsyncTask<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.processNext();
        });
    }

    private async processNext(): Promise<void> {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        if (!item) return;

        this.running++;
        try {
            const result = await item.task();
            item.resolve(result);
        } catch (error) {
            item.reject(error);
        } finally {
            this.running--;
            this.processNext();
        }
    }

    /**
     * 当前运行中的任务数
     */
    get activeCount(): number {
        return this.running;
    }

    /**
     * 等待中的任务数
     */
    get pendingCount(): number {
        return this.queue.length;
    }
}
