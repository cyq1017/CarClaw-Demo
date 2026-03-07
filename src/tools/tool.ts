/**
 * CarClaw Tool — 工具基类与接口定义
 *
 * 所有车机工具（车控/导航/媒体/日程）都实现此接口
 * 工具定义遵循 OpenAI Function Calling 格式
 */

export interface ToolParameter {
    type: string;
    description: string;
    enum?: string[];
    required?: boolean;
}

export interface ToolResult {
    success: boolean;
    output: string;
    data?: any;
}

/**
 * Tool 接口 — 所有车机工具必须实现
 */
export interface Tool {
    /** 工具名称（英文，用于 LLM 调用） */
    name: string;
    /** 工具描述（给 LLM 理解的自然语言描述） */
    description: string;
    /** 参数定义（JSON Schema 格式） */
    parameters: {
        type: 'object';
        properties: Record<string, ToolParameter>;
        required?: string[];
    };
    /** 执行工具 */
    execute(params: Record<string, any>): Promise<ToolResult>;
}
