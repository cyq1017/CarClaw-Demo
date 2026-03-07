/**
 * CarClaw Memory System — 长期记忆
 *
 * 复用 OpenClaw Memory 模式：
 * - 存储用户偏好（空调温度、座椅设置、常去地点）
 * - 行程历史
 * - 向量检索（未来接入 Vector DB）
 *
 * MVP 阶段使用内存 Map，后续切换 SQLite / Vector DB
 */

export interface MemoryEntry {
    key: string;
    value: string;
    category: 'preference' | 'history' | 'fact';
    timestamp: Date;
}

export class MemoryStore {
    private store: Map<string, MemoryEntry> = new Map();
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * 保存记忆
     */
    set(key: string, value: string, category: MemoryEntry['category'] = 'fact'): void {
        this.store.set(key, {
            key,
            value,
            category,
            timestamp: new Date(),
        });
    }

    /**
     * 读取记忆
     */
    get(key: string): string | undefined {
        return this.store.get(key)?.value;
    }

    /**
     * 按类别检索
     */
    getByCategory(category: MemoryEntry['category']): MemoryEntry[] {
        return [...this.store.values()].filter((e) => e.category === category);
    }

    /**
     * 获取所有偏好设置（注入到 System Prompt）
     */
    getPreferenceSummary(): string {
        const prefs = this.getByCategory('preference');
        if (prefs.length === 0) return '';
        return prefs.map((p) => `- ${p.key}: ${p.value}`).join('\n');
    }

    /**
     * 搜索记忆（MVP: 简单关键词匹配；未来: 向量检索）
     */
    search(query: string): MemoryEntry[] {
        const q = query.toLowerCase();
        return [...this.store.values()].filter(
            (e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
        );
    }

    /**
     * 清空记忆
     */
    clear(): void {
        this.store.clear();
    }
}

/**
 * 全局 Memory Manager — 管理多用户的记忆
 */
export class MemoryManager {
    private stores: Map<string, MemoryStore> = new Map();

    getStore(userId: string): MemoryStore {
        let store = this.stores.get(userId);
        if (!store) {
            store = new MemoryStore(userId);
            this.stores.set(userId, store);
        }
        return store;
    }
}
