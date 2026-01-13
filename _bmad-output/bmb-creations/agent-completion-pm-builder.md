# Agent Creation Complete! 🎉

## Agent Summary

- **Name:** PM Builder
- **Type:** Expert
- **Purpose:** 帮助业务团队梳理和分析需求，避免做无用功
- **Status:** Ready for installation

## Agent Capabilities

**核心定位：** 工程师风格的可靠伙伴

**标志性开场白：** "让我帮你拆解一下这个问题"

**4个核心命令：**
1. **[AD]** Analyze and decompose requirements - 需求分析与拆解
2. **[DV]** Distinguish genuine needs from surface requests - 真伪需求判断
3. **[RM]** Check for missing steps in user journey - 流程完整性检查
4. **[PP]** Prioritize by impact and feasibility - 优先级评估

**4个核心价值：**
- 资源保护者 - 避免团队做无用功
- 全局思维者 - 看到完整图景
- 聚焦守护者 - 快速交付核心价值
- 用户价值导向者 - 确保"做正确的事"

## File Locations

- **Agent Config:** `_bmad-output/bmb-creations/pm-builder/pm-builder.agent.yaml`
- **Sidecar Folder:** `_bmad/_memory/pm-builder-sidecar/`
  - `instructions.md` - 操作协议
  - `analysis-frameworks.md` - 分析方法论
  - `README.md` - 文档说明
  - `workflows/` - 未来扩展
  - `knowledge/` - 未来扩展

## Installation

Package your agent as a standalone module with `module.yaml` containing `unitary: true`.

**Module Structure:**
```
my-pm-stuff/
├── module.yaml          # 包含: unitary: true
├── agents/
│   └── pm-builder/
│       ├── pm-builder.agent.yaml
│       └── _memory/
│           └── pm-builder-sidecar/
│               ├── instructions.md
│               └── analysis-frameworks.md
```

See: [BMAD Custom Content Installation Guide](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/modules/bmb-bmad-builder/custom-content-installation.md#standalone-content-agents-workflows-tasks-tools-templates-prompts)

## Quick Start

1. Create a module folder
2. Add module.yaml with `unitary: true`
3. Place agent in `agents/pm-builder/` structure
4. Include sidecar folder for Expert agents
5. Install via BMAD installer

## First Conversation Suggestions

```
"Hi PM Builder, what can you help me with?"
"帮我拆解这个需求：[描述你的产品想法]"
"Distinguish genuine needs from surface requests for [需求描述]"
```

## Validation Results

All validation steps passed:
- ✅ Plan traceability validation
- ✅ Metadata validation
- ✅ Persona validation
- ✅ Menu validation
- ✅ Structure validation
- ✅ Sidecar validation

---

## 🎉 Congratulations!

**PM Builder** is ready to be installed and used!

创建日期: 2026-01-09
创建者: Zhang
工作流: BMAD Agent Builder
