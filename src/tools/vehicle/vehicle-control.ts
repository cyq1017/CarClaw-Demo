/**
 * CarClaw Vehicle Control Tool — 车控工具
 *
 * 支持操作：空调 / 门窗 / 座椅 / 灯光
 * 通过 VehicleAPI 抽象层执行，MVP 阶段使用 Simulator
 */

import type { Tool, ToolResult } from '../tool.js';
import type { VehicleAPI } from './vehicle-api.js';

export function createVehicleControlTool(vehicleApi: VehicleAPI): Tool {
    return {
        name: 'vehicle_control',
        description: '控制车辆功能。支持控制：空调(ac)、车窗(window)、座椅(seat)、灯光(light)。',
        parameters: {
            type: 'object',
            properties: {
                target: {
                    type: 'string',
                    description: '控制目标',
                    enum: ['ac', 'window', 'seat', 'light'],
                },
                action: {
                    type: 'string',
                    description: '操作类型',
                    enum: ['on', 'off', 'toggle', 'set'],
                },
                value: {
                    type: 'string',
                    description: '设置值（如温度"22"、车窗位置"fl"等），可选',
                },
            },
            required: ['target', 'action'],
        },

        async execute(params: Record<string, any>): Promise<ToolResult> {
            const { target, action, value } = params;

            try {
                const result = await vehicleApi.control(target, action, value);
                return {
                    success: result.success,
                    output: result.message,
                    data: { target, action, value },
                };
            } catch (error) {
                return {
                    success: false,
                    output: `车控操作失败: ${error instanceof Error ? error.message : String(error)}`,
                };
            }
        },
    };
}
