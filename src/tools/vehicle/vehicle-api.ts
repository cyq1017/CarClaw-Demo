/**
 * CarClaw Vehicle API — 车辆抽象层
 *
 * 定义车辆控制的统一接口
 * MVP 使用 VehicleSimulator 模拟，未来对接真实车机 API
 */

export interface VehicleStatus {
    ac: { on: boolean; temperature: number; mode: string };
    windows: Record<string, 'open' | 'closed' | 'half'>;
    seats: Record<string, { heating: boolean; ventilation: boolean }>;
    lights: { headlights: string; interior: string; ambient: string };
    speed: number;
    battery: number;
    gear: 'P' | 'R' | 'N' | 'D';
}

/**
 * Vehicle API 抽象接口
 */
export interface VehicleAPI {
    getStatus(): Promise<VehicleStatus>;
    control(target: string, action: string, value?: any): Promise<{ success: boolean; message: string }>;
}
