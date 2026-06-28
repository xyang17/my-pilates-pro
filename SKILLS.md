# Skills 使用手册

记录所有已安装的 skills，说明触发场景和调用方式。

> **调用方式：** 直接跟 Claude 说你的需求，标注「自动」的会主动判断调用；标注「手动」的说出场景就行，不需要记 skill 名字。

---

## 来源一：addyosmani/agent-skills

安装位置：`.claude/skills/`

### 开发阶段

| Skill | 触发场景 | 方式 |
|-------|---------|------|
| `frontend-ui-engineering` | 做 UI 组件、页面改造、响应式适配 | 自动 |
| `incremental-implementation` | 开始写新功能，分步骤推进避免大范围出错 | 自动 |
| `source-driven-development` | 基于现有代码结构扩展，不乱加 | 自动 |
| `spec-driven-development` | 大功能开始前先写需求再动手 | 手动："先帮我梳理一下需求" |
| `api-and-interface-design` | 设计新 API 路由、接口规范 | 手动："帮我设计这个 API" |
| `context-engineering` | 让 Claude 更好理解整个项目上下文 | 自动 |
| `doubt-driven-development` | 实现前主动质疑方案是否合理 | 自动 |

### 排错 & 质量

| Skill | 触发场景 | 方式 |
|-------|---------|------|
| `debugging-and-error-recovery` | 报错、功能异常、Vercel 构建失败 | 自动 |
| `code-review-and-quality` | Push 前检查代码质量 | 自动（或说"帮我 review 一下"） |
| `code-simplification` | 某段代码太复杂想精简 | 手动："帮我简化这段代码" |
| `test-driven-development` | 补充测试用例、测试覆盖 | 手动："帮我写测试" |
| `browser-testing-with-devtools` | 页面测试、前端调试 | 手动："帮我测一下这个页面" |
| `security-and-hardening` | 涉及 auth、API、用户数据安全时 | 自动 |
| `performance-optimization` | 页面加载慢、性能问题 | 手动："帮我优化一下性能" |

### 规划 & 上线

| Skill | 触发场景 | 方式 |
|-------|---------|------|
| `planning-and-task-breakdown` | 大功能开始前拆解任务 | 自动 |
| `git-workflow-and-versioning` | commit 规范、branch 管理、版本发布 | 自动 |
| `shipping-and-launch` | 功能完成后准备正式发布 | 手动："功能完了怎么发布" |
| `ci-cd-and-automation` | 配置自动部署、GitHub Actions | 手动："帮我配置 CI/CD" |
| `deprecation-and-migration` | 旧功能下线、数据库迁移 | 手动："这个功能要废弃" |
| `documentation-and-adrs` | 写技术文档、架构决策记录 | 手动："帮我写文档" |
| `observability-and-instrumentation` | 加日志、监控、错误追踪 | 手动："帮我加监控" |

### 想法探索

| Skill | 触发场景 | 方式 |
|-------|---------|------|
| `idea-refine` | 有个模糊想法，需要帮忙打磨 | 手动："我有个想法……" |
| `interview-me` | 通过问答方式梳理需求 | 手动："帮我梳理一下这个功能" |

---

## 来源二：engineering 插件

| Skill | 触发场景 | 方式 |
|-------|---------|------|
| `engineering:code-review` | 代码合并前安全/性能审查 | 自动（或"review 一下"） |
| `engineering:debug` | 有 stack trace、"这里行为不对" | 自动 |
| `engineering:architecture` | 技术选型、数据库设计讨论 | 手动："这个架构怎么设计" |
| `engineering:system-design` | 设计新功能的整体系统 | 手动："帮我设计这个系统" |
| `engineering:deploy-checklist` | 准备上线前全面检查 | 手动："准备上线了，帮我检查" |
| `engineering:tech-debt` | 了解哪些地方需要重构 | 手动："帮我梳理一下技术债" |
| `engineering:testing-strategy` | 制定测试方案 | 手动："怎么测试这个功能" |
| `engineering:documentation` | 写 README、API 文档、运维手册 | 手动："帮我写文档" |
| `engineering:incident-response` | 线上出问题、紧急排查 | 手动："线上有问题" |
| `engineering:standup` | 整理近期进展做日报/周报 | 手动："帮我写一下近期进展" |

---

## 更新记录

| 日期 | 变更 |
|------|------|
| 2026-06-28 | 初始版本，安装 addyosmani/agent-skills + engineering 插件 |

> 新装 skill 后在此表格添加一行。
