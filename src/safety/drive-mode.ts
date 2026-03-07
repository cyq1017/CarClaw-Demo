/**
 * CarClaw DriveModeController — 驾驶模式状态机
 *
 * CarClaw 独有模块（OpenClaw 中不存在）
 *
 * 根据车辆状态自动切换驾驶模式，每种模式有不同的：
 * - 允许的操作范围
 * - 对话风格（停车时详细，行驶时简洁）
 * - 主动提醒策略
 */

import type { VehicleAPI, VehicleStatus } from '../tools/vehicle/vehicle-api.js';

export enum DriveMode {
    /** 停车模式 — 全功能可用 */
    PARKED = 'parked',
    /** 行驶模式 — 语音优先，限制危险操作 */
    DRIVING = 'driving',
    /** 高速模式 — 极简交互，仅必要操作 */
    HIGHWAY = 'highway',
    /** 泊车模式 — 辅助泊车场景 */
    PARKING = 'parking',
    /** 充电模式 — 充电中的特殊场景 */
    CHARGING = 'charging',
}

export interface DriveModeConfig {
    /** 允许的工具列表（null = 全部允许） */
    allowedTools: string[] | null;
    /** 回复风格指引（注入 System Prompt） */
    responseStyle: string;
    /** 是否启用主动提醒 */
    proactiveAlerts: boolean;
    /** 最大回复长度（字符） */
    maxResponseLength: number;
}

const MODE_CONFIGS: Record<DriveMode, DriveModeConfig> = {
    [DriveMode.PARKED]: {
        allowedTools: null, // 全部允许
        responseStyle: '用户已停车，可以提供详细回复，支持多轮交互。',
        proactiveAlerts: false,
        maxResponseLength: 500,
    },
    [DriveMode.DRIVING]: {
        allowedTools: ['vehicle_control', 'navigation', 'media_control', 'schedule'],
        responseStyle: '用户正在驾驶，回复必须简短（1-2句），避免需要视觉操作的内容。',
        proactiveAlerts: true,
        maxResponseLength: 100,
    },
    [DriveMode.HIGHWAY]: {
        allowedTools: ['vehicle_control', 'media_control'],
        responseStyle: '用户在高速公路上，仅回应必要操作，用最少的话确认结果。',
        proactiveAlerts: true,
        maxResponseLength: 50,
    },
    [DriveMode.PARKING]: {
        allowedTools: null,
        responseStyle: '用户正在泊车，提供简洁的泊车辅助信息。',
        proactiveAlerts: true,
        maxResponseLength: 80,
    },
    [DriveMode.CHARGING]: {
        allowedTools: null,
        responseStyle: '车辆正在充电，用户可能在等待，可以提供详细的娱乐和信息服务。',
        proactiveAlerts: false,
        maxResponseLength: 500,
    },
};

export class DriveModeController {
    private currentMode: DriveMode = DriveMode.PARKED;
    private vehicleApi: VehicleAPI;
    private listeners: Array<(oldMode: DriveMode, newMode: DriveMode) => void> = [];

    constructor(vehicleApi: VehicleAPI) {
        this.vehicleApi = vehicleApi;
    }

    /**
     * 根据车辆状态自动判断当前驾驶模式
     */
    async updateMode(): Promise<DriveMode> {
        const status = await this.vehicleApi.getStatus();
        const newMode = this.inferMode(status);

        if (newMode !== this.currentMode) {
            const oldMode = this.currentMode;
            this.currentMode = newMode;
            console.log(`🚦 Drive mode: ${oldMode} → ${newMode}`);

            for (const listener of this.listeners) {
                listener(oldMode, newMode);
            }
        }

        return this.currentMode;
    }

    /**
     * 推断驾驶模式
     */
    private inferMode(status: VehicleStatus): DriveMode {
        if (status.gear === 'P') {
            if (status.battery !== undefined && status.battery < 100 && status.speed === 0) {
                // 简单判断：P 档 + 非满电 → 可能在充电（实际需要充电状态信号）
                // MVP 阶段简化处理
            }
            return DriveMode.PARKED;
        }

        if (status.gear === 'R') {
            return DriveMode.PARKING;
        }

        if (status.speed > 80) {
            return DriveMode.HIGHWAY;
        }

        return DriveMode.DRIVING;
    }

    /**
     * 获取当前模式
     */
    getMode(): DriveMode {
        return this.currentMode;
    }

    /**
     * 获取当前模式的配置
     */
    getConfig(): DriveModeConfig {
        return MODE_CONFIGS[this.currentMode];
    }

    /**
     * 获取注入到 System Prompt 的驾驶模式提示
     */
    getModePrompt(): string {
        const config = this.getConfig();
        return `\n## 当前驾驶模式: ${this.currentMode.toUpperCase()}\n${config.responseStyle}\n最大回复长度: ${config.maxResponseLength} 字。`;
    }

    /**
     * 检查工具是否在当前模式下被允许
     */
    isToolAllowed(toolName: string): boolean {
        const config = this.getConfig();
        if (config.allowedTools === null) return true;
        return config.allowedTools.includes(toolName);
    }

    /**
     * 监听模式变化
     */
    onModeChange(listener: (oldMode: DriveMode, newMode: DriveMode) => void): void {
        this.listeners.push(listener);
    }
}
