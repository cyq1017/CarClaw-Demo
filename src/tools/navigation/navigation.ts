/**
 * CarClaw Navigation Tool — 导航工具
 *
 * MVP 阶段只打印日志，未来接入高德/腾讯地图 API
 */

import type { Tool, ToolResult } from '../tool.js';

export function createNavigationTool(): Tool {
    return {
        name: 'navigation',
        description: '导航功能。支持：导航到目的地、搜索附近地点（充电桩、加油站、餐厅等）、查询预计到达时间。',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '操作类型',
                    enum: ['navigate', 'search_nearby', 'eta'],
                },
                destination: {
                    type: 'string',
                    description: '目的地名称或地址',
                },
                category: {
                    type: 'string',
                    description: '搜索类别（仅 search_nearby 时使用）',
                    enum: ['charging', 'gas_station', 'restaurant', 'parking'],
                },
            },
            required: ['action'],
        },

        async execute(params: Record<string, any>): Promise<ToolResult> {
            const { action, destination, category } = params;

            switch (action) {
                case 'navigate':
                    // TODO: 接入地图 API
                    console.log(`🗺️ [导航] 正在规划路线到: ${destination}`);
                    return {
                        success: true,
                        output: `已开始导航到"${destination}"，预计行驶时间 25 分钟。`,
                        data: { destination, eta: '25min', distance: '12.5km' },
                    };

                case 'search_nearby':
                    console.log(`🗺️ [搜索] 正在搜索附近的 ${category}`);
                    return {
                        success: true,
                        output: `找到 3 个附近的${category === 'charging' ? '充电桩' : category}，最近的距离 1.2 公里。`,
                        data: { category, results: [] },
                    };

                case 'eta':
                    return {
                        success: true,
                        output: `预计还需 18 分钟到达目的地。`,
                        data: { eta: '18min' },
                    };

                default:
                    return { success: false, output: `未知导航操作: ${action}` };
            }
        },
    };
}
