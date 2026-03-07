/**
 * CarClaw Media Tool — 媒体控制工具
 *
 * MVP 阶段只打印日志，未来接入车机媒体播放器
 */

import type { Tool, ToolResult } from '../tool.js';

export function createMediaTool(): Tool {
    return {
        name: 'media_control',
        description: '媒体播放控制。支持：播放、暂停、下一首、上一首、搜索歌曲。',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '操作类型',
                    enum: ['play', 'pause', 'next', 'previous', 'search'],
                },
                query: {
                    type: 'string',
                    description: '搜索关键词（仅 search/play 时使用）',
                },
            },
            required: ['action'],
        },

        async execute(params: Record<string, any>): Promise<ToolResult> {
            const { action, query } = params;

            switch (action) {
                case 'play':
                    console.log(`🎵 [媒体] 播放: ${query || '继续播放'}`);
                    return {
                        success: true,
                        output: query ? `正在播放"${query}"` : '已继续播放',
                    };

                case 'pause':
                    console.log('🎵 [媒体] 暂停播放');
                    return { success: true, output: '已暂停播放' };

                case 'next':
                    console.log('🎵 [媒体] 下一首');
                    return { success: true, output: '已切换到下一首' };

                case 'previous':
                    console.log('🎵 [媒体] 上一首');
                    return { success: true, output: '已切换到上一首' };

                case 'search':
                    console.log(`🎵 [媒体] 搜索: ${query}`);
                    return {
                        success: true,
                        output: `找到 5 首与"${query}"相关的歌曲`,
                        data: { query, results: [] },
                    };

                default:
                    return { success: false, output: `未知媒体操作: ${action}` };
            }
        },
    };
}
