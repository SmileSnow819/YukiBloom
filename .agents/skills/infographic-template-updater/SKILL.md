---
name: infographic-template-updater
description: Update template catalogs and UI prompts in an AntV Infographic source checkout after adding templates under src/templates. Use only when those source paths exist.
---

# Infographic Template Updater

## Overview

Update public template lists and gallery mappings when new templates are added in `src/templates`.

## Workflow

1. Collect new template names from the added `src/templates/*.ts` file (object keys).
   - If templates are composed via spreads (e.g. `...listZigzagTemplates`), also confirm the final keys in `src/templates/built-in.ts`.
2. Update template lists:
   - `.agents/skills/infographic-creator/SKILL.md` in the "Available Templates" list.
   - `site/src/components/AIPlayground/Prompt.ts` in the template list.
   - `.agents/skills/infographic-syntax-creator/references/prompt.md` in the template list.
   Keep existing ordering/grouping; add new `list-*` entries near other list templates.
3. Sanity check with `rg -n "<template-name>"` across the above files to confirm presence.

## Notes

- Do not remove or rename existing entries.
- Keep template names exact and lower-case.
- If a template needs example data, update or extend `site/src/components/Gallery/datasets.ts` to match its structure.

## 适用范围

当前博客仓库没有 `src/templates` 或 `site/src/components/AIPlayground`。仅在这些目录存在的 AntV Infographic 源码仓库中执行更新；不要为了满足本 Skill 在博客仓库创建这些目录。
