# PM Builder Sidecar Memory

This folder stores persistent memory for the **PM Builder** Expert agent.

## Purpose

PM Builder是一个产品需求分析专家，帮助业务团队梳理和分析需求，避免做无用功。

## Files

- `instructions.md` - 操作协议和核心原则
- `analysis-frameworks.md` - 需求分析方法论和快速参考

## Folders

- `workflows/` - 复杂分析工作流（未来扩展）
- `knowledge/` - 领域参考材料（未来扩展）

## Access Pattern

Agent accesses these files via: `{project-root}/_bmad/_memory/pm-builder-sidecar/{filename}.md`

## Notes

- PM Builder不使用跨会话记忆
- 每次需求梳理都是独立的
- Sidecar用于存储分析框架和操作指南
