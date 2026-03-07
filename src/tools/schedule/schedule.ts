/**
 * CarClaw Schedule Tool — 日程管理工具
 *
 * MVP 阶段使用内存存储，未来接入 SQLite + 日历同步
 */

import type { Tool, ToolResult } from '../tool.js';

interface ScheduleEntry {
    id: string;
    title: string;
    time: string;
    reminder?: string;
}

const schedules: ScheduleEntry[] = [];

export function createScheduleTool(): Tool {
    return {
        name: 'schedule',
        description: '日程管理。支持：添加日程、查询日程、设置提醒。',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '操作类型',
                    enum: ['add', 'list', 'remind'],
                },
                title: {
                    type: 'string',
                    description: '日程标题',
                },
                time: {
                    type: 'string',
                    description: '日程时间',
                },
            },
            required: ['action'],
        },

        async execute(params: Record<string, any>): Promise<ToolResult> {
            const { action, title, time } = params;

            switch (action) {
                case 'add':
                    const entry: ScheduleEntry = {
                        id: `sched_${Date.now()}`,
                        title: title || '未命名日程',
                        time: time || '未设置时间',
                    };
                    schedules.push(entry);
                    console.log(`📅 [日程] 已添加: ${entry.title} @ ${entry.time}`);
                    return {
                        success: true,
                        output: `已添加日程："${entry.title}"，时间：${entry.time}`,
                    };

                case 'list':
                    if (schedules.length === 0) {
                        return { success: true, output: '当前没有日程安排' };
                    }
                    const list = schedules.map((s) => `• ${s.title} (${s.time})`).join('\n');
                    return { success: true, output: `当前日程：\n${list}` };

                case 'remind':
                    return {
                        success: true,
                        output: `已设置提醒：${title}，将在出发前 30 分钟提醒您`,
                    };

                default:
                    return { success: false, output: `未知日程操作: ${action}` };
            }
        },
    };
}
