/**
 * CarClaw SafetyGuard — 驾驶安全拦截器
 *
 * CarClaw 独有模块（OpenClaw 中不存在）
 * 
 * 在工具执行前进行安全校验：
 * - 行驶中禁止危险操作（开门、全开驾驶位车窗）
 * - 高速时限制特定功能
 * - 所有安全规则不可被对话或 prompt 覆盖
 */

import type { VehicleAPI, VehicleStatus } from '../tools/vehicle/vehicle-api.js';

export type RiskLevel = 'safe' | 'warning' | 'blocked';

export interface SafetyCheckResult {
    level: RiskLevel;
    allowed: boolean;
    reason?: string;
}

export interface SafetyRule {
    /** 规则名称 */
    name: string;
    /** 适用的工具名 */
    toolName: string;
    /** 校验函数 */
    check(params: Record<string, any>, vehicleStatus: VehicleStatus): SafetyCheckResult;
}

/**
 * SafetyGuard — 驾驶安全核心
 *
 * 所有工具调用在执行前都经过 SafetyGuard 校验
 * 这不是一个普通的 Hook，而是安全关键系统的强制拦截层
 */
export class SafetyGuard {
    private rules: SafetyRule[] = [];
    private vehicleApi: VehicleAPI;

    constructor(vehicleApi: VehicleAPI) {
        this.vehicleApi = vehicleApi;
        this.registerDefaultRules();
    }

    /**
     * 注册安全规则
     */
    registerRule(rule: SafetyRule): void {
        this.rules.push(rule);
        console.log(`🛡️ Safety rule registered: ${rule.name}`);
    }

    /**
     * 校验工具调用是否安全
     */
    async check(toolName: string, params: Record<string, any>): Promise<SafetyCheckResult> {
        const status = await this.vehicleApi.getStatus();
        const applicableRules = this.rules.filter((r) => r.toolName === toolName || r.toolName === '*');

        for (const rule of applicableRules) {
            const result = rule.check(params, status);
            if (!result.allowed) {
                console.log(`🛡️ BLOCKED by "${rule.name}": ${result.reason}`);
                return result;
            }
            if (result.level === 'warning') {
                console.log(`⚠️ WARNING from "${rule.name}": ${result.reason}`);
            }
        }

        return { level: 'safe', allowed: true };
    }

    /**
     * 注册默认安全规则
     */
    private registerDefaultRules(): void {
        // 规则1: 行驶中禁止打开车门
        this.registerRule({
            name: '行驶中禁开门',
            toolName: 'vehicle_control',
            check(params, status) {
                if (status.speed > 0 && params.target === 'door' && params.action === 'open') {
                    return {
                        level: 'blocked',
                        allowed: false,
                        reason: `车辆正在行驶（${status.speed}km/h），禁止打开车门`,
                    };
                }
                return { level: 'safe', allowed: true };
            },
        });

        // 规则2: 高速时限制车窗全开
        this.registerRule({
            name: '高速限制车窗',
            toolName: 'vehicle_control',
            check(params, status) {
                if (status.speed > 80 && params.target === 'window' && params.action === 'open') {
                    return {
                        level: 'warning',
                        allowed: true,
                        reason: `高速行驶中（${status.speed}km/h），车窗将仅半开`,
                    };
                }
                return { level: 'safe', allowed: true };
            },
        });

        // 规则3: 低电量警告
        this.registerRule({
            name: '低电量导航警告',
            toolName: 'navigation',
            check(_params, status) {
                if (status.battery < 20) {
                    return {
                        level: 'warning',
                        allowed: true,
                        reason: `电量仅剩 ${status.battery}%，建议先寻找充电桩`,
                    };
                }
                return { level: 'safe', allowed: true };
            },
        });

        // 规则4: P 档以外禁止关闭动力系统
        this.registerRule({
            name: '非P档禁关动力',
            toolName: 'vehicle_control',
            check(params, status) {
                if (status.gear !== 'P' && params.target === 'power' && params.action === 'off') {
                    return {
                        level: 'blocked',
                        allowed: false,
                        reason: `当前档位为 ${status.gear}，非 P 档禁止关闭动力系统`,
                    };
                }
                return { level: 'safe', allowed: true };
            },
        });
    }
}
