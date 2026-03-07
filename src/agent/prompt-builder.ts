/**
 * CarClaw Prompt Builder — System Prompt 组装器
 *
 * 职责：
 * - 加载基础 System Prompt
 * - 注入 Skill 描述
 * - 注入车辆状态上下文
 * - 注入用户偏好
 */

import type { VehicleSnapshot } from '../core/session.js';

export interface PromptContext {
    vehicleContext?: VehicleSnapshot | null;
    skills?: string[];
    userPreferences?: string;
    /** DriveModeController 注入的模式提示 */
    driveModePrompt?: string;
}

const BASE_SYSTEM_PROMPT = `你是 CarClaw，一个智能车载 AI 助手。

## 核心规则
1. 你通过语音与用户交互，回复要**简洁**（用户在驾驶中）
2. 你可以控制车辆功能（空调、门窗、座椅、灯光等）
3. 你可以帮助导航、播放媒体、管理日程
4. **安全第一**：绝不执行可能影响驾驶安全的操作
5. 对于危险请求（如行驶中开驾驶位车门），要明确拒绝并说明原因

## 回复风格
- 简短、自然、有温度
- 执行操作后确认结果（如"已把空调调到22度"）
- 不确定时主动询问
`;

export class PromptBuilder {
    /**
     * 组装完整 System Prompt
     */
    build(context: PromptContext): string {
        const parts: string[] = [BASE_SYSTEM_PROMPT];

        // 注入车辆状态
        if (context.vehicleContext) {
            parts.push(this.buildVehicleContext(context.vehicleContext));
        }

        // 注入驾驶模式（CarClaw 独有）
        if (context.driveModePrompt) {
            parts.push(context.driveModePrompt);
        }

        // 注入 Skill 描述
        if (context.skills && context.skills.length > 0) {
            parts.push(`\n## 可用技能\n${context.skills.join('\n')}`);
        }

        // 注入用户偏好
        if (context.userPreferences) {
            parts.push(`\n## 用户偏好\n${context.userPreferences}`);
        }

        return parts.join('\n');
    }

    /**
     * 将车辆状态快照格式化为提示文本
     */
    private buildVehicleContext(snapshot: VehicleSnapshot): string {
        const lines: string[] = ['\n## 当前车辆状态'];
        lines.push(`- 空调: ${snapshot.ac.on ? `开启, ${snapshot.ac.temperature}°C, ${snapshot.ac.mode}模式` : '关闭'}`);

        if (snapshot.windows) {
            const windowStatus = Object.entries(snapshot.windows)
                .map(([pos, state]) => `${pos}: ${state}`)
                .join(', ');
            lines.push(`- 车窗: ${windowStatus}`);
        }

        if (snapshot.speed !== undefined) {
            lines.push(`- 车速: ${snapshot.speed} km/h`);
        }

        if (snapshot.battery !== undefined) {
            lines.push(`- 电量: ${snapshot.battery}%`);
        }

        return lines.join('\n');
    }
}
