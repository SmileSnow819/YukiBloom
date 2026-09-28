---
name: infographic-item-creator
description: Generate or update infographic Item components in an AntV Infographic source checkout (TypeScript/TSX in src/designs/items). Use when asked to design, implement, or modify data item visuals, layout logic, or registerItem composites.
---

# Infographic Item Generator

## Overview

Generate complete Item component code for the infographic framework, following the project's item rules, layout constraints, and registration requirements.

## Workflow

1. Read `references/item-prompt.md` for the full framework rules, allowed components, and output requirements.
2. Clarify minimal requirements if missing: desired visuals, required fields (icon/label/value/desc/illus), sizing, and alignment needs.
3. Use `getItemProps` to extract custom props and compute layout with `getElementBounds`.
4. Produce a full TypeScript file: imports, Props extends BaseItemProps, component implementation, and `registerItem` with accurate `composites`.
5. Self-check against the constraints in the reference (no unlisted components, indexes passed to all wrapped components, correct conditional rendering).

## Notes

- Prefer scanning `src/designs/items` for similar items to match local patterns when appropriate.
- Keep output concise; avoid React-only features (keys, hooks).

## 适用范围

当前博客仓库没有 `src/designs/items`。仅在用户提供或切换到包含该目录的 AntV Infographic 源码仓库时按上述流程创建 Item；当前博客的信息图使用 `infographic-creator` 或 `infographic-syntax-creator`。
