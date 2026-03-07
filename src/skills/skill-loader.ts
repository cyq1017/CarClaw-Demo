/**
 * CarClaw Skill Loader — 技能加载器
 *
 * 扫描 skills/ 目录，读取 SKILL.md 文件，作为上下文注入 Agent
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Skill {
    name: string;
    content: string;
    directory: string;
}

export class SkillLoader {
    private skillsDir: string;
    private skills: Skill[] = [];

    constructor(skillsDir?: string) {
        this.skillsDir = skillsDir || path.join(import.meta.dirname || '.', 'skills');
    }

    /**
     * 加载所有技能
     */
    async loadAll(): Promise<Skill[]> {
        this.skills = [];

        if (!fs.existsSync(this.skillsDir)) {
            console.log(`⚠️ Skills directory not found: ${this.skillsDir}`);
            return this.skills;
        }

        const dirs = fs.readdirSync(this.skillsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory());

        for (const dir of dirs) {
            const skillFile = path.join(this.skillsDir, dir.name, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
                const content = fs.readFileSync(skillFile, 'utf-8');
                this.skills.push({
                    name: dir.name,
                    content,
                    directory: path.join(this.skillsDir, dir.name),
                });
                console.log(`📦 Skill loaded: ${dir.name}`);
            }
        }

        return this.skills;
    }

    /**
     * 获取所有技能描述（拼接到 System Prompt）
     */
    getSkillDescriptions(): string[] {
        return this.skills.map((s) => s.content);
    }
}
