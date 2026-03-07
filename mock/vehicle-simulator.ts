/**
 * CarClaw Vehicle Simulator — 车辆状态模拟器
 *
 * MVP 阶段用于模拟车辆状态和控制操作
 * 替代真实的车机 API
 */

import type { VehicleAPI, VehicleStatus } from '../src/tools/vehicle/vehicle-api.js';

export class VehicleSimulator implements VehicleAPI {
    private state: VehicleStatus = {
        ac: { on: false, temperature: 24, mode: 'auto' },
        windows: { fl: 'closed', fr: 'closed', rl: 'closed', rr: 'closed' },
        seats: {
            driver: { heating: false, ventilation: false },
            passenger: { heating: false, ventilation: false },
        },
        lights: { headlights: 'auto', interior: 'off', ambient: 'off' },
        speed: 0,
        battery: 85,
        gear: 'P',
    };

    async getStatus(): Promise<VehicleStatus> {
        return { ...this.state };
    }

    async control(target: string, action: string, value?: any): Promise<{ success: boolean; message: string }> {
        console.log(`🚗 [模拟器] ${target}.${action}(${value ?? ''})`);

        switch (target) {
            case 'ac':
                return this.controlAC(action, value);
            case 'window':
                return this.controlWindow(action, value);
            case 'seat':
                return this.controlSeat(action, value);
            case 'light':
                return this.controlLight(action, value);
            default:
                return { success: false, message: `未知控制目标: ${target}` };
        }
    }

    private controlAC(action: string, value?: any): { success: boolean; message: string } {
        switch (action) {
            case 'on':
                this.state.ac.on = true;
                if (value !== undefined) {
                    this.state.ac.temperature = Number(value);
                }
                return {
                    success: true,
                    message: `空调已打开，温度 ${this.state.ac.temperature}°C`,
                };
            case 'off':
                this.state.ac.on = false;
                return { success: true, message: '空调已关闭' };
            case 'set':
                if (value !== undefined) {
                    this.state.ac.temperature = Number(value);
                    this.state.ac.on = true;
                    return {
                        success: true,
                        message: `空调温度已调至 ${this.state.ac.temperature}°C`,
                    };
                }
                return { success: false, message: '请指定温度值' };
            default:
                return { success: false, message: `未知空调操作: ${action}` };
        }
    }

    private controlWindow(action: string, value?: any): { success: boolean; message: string } {
        const position = (value as string) || 'fl';
        switch (action) {
            case 'on':
            case 'open':
                // 安全检查：行驶中限制
                if (this.state.speed > 0 && position === 'fl') {
                    (this.state.windows as any)[position] = 'half';
                    return { success: true, message: `行驶中，${position}车窗已半开` };
                }
                (this.state.windows as any)[position] = 'open';
                return { success: true, message: `${position}车窗已打开` };
            case 'off':
            case 'close':
                (this.state.windows as any)[position] = 'closed';
                return { success: true, message: `${position}车窗已关闭` };
            default:
                return { success: false, message: `未知车窗操作: ${action}` };
        }
    }

    private controlSeat(action: string, _value?: any): { success: boolean; message: string } {
        switch (action) {
            case 'on':
                this.state.seats.driver.heating = true;
                return { success: true, message: '座椅加热已开启' };
            case 'off':
                this.state.seats.driver.heating = false;
                return { success: true, message: '座椅加热已关闭' };
            default:
                return { success: false, message: `未知座椅操作: ${action}` };
        }
    }

    private controlLight(action: string, value?: any): { success: boolean; message: string } {
        const light = (value as string) || 'interior';
        switch (action) {
            case 'on':
                (this.state.lights as any)[light] = 'on';
                return { success: true, message: `${light}灯已打开` };
            case 'off':
                (this.state.lights as any)[light] = 'off';
                return { success: true, message: `${light}灯已关闭` };
            default:
                return { success: false, message: `未知灯光操作: ${action}` };
        }
    }

    /**
     * 获取当前状态的可读描述
     */
    getStatusDescription(): string {
        const s = this.state;
        const lines: string[] = [
            '━━━ 车辆状态 ━━━',
            `🌡️ 空调: ${s.ac.on ? `${s.ac.temperature}°C (${s.ac.mode})` : '关闭'}`,
            `🪟 车窗: FL=${s.windows.fl} FR=${s.windows.fr} RL=${s.windows.rl} RR=${s.windows.rr}`,
            `💺 座椅加热: ${s.seats.driver.heating ? '开' : '关'}`,
            `💡 灯光: 大灯=${s.lights.headlights} 内饰=${s.lights.interior}`,
            `🔋 电量: ${s.battery}%  ⚙️ 档位: ${s.gear}  🏎️ 速度: ${s.speed}km/h`,
        ];
        return lines.join('\n');
    }
}
