# Vditor Post Editor Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the BlockNote article body editor with Vditor while preserving Markdown storage, article preview, table of contents, save behavior, and image uploads.

**Architecture:** Add a small React wrapper that dynamically loads Vditor and its stylesheet in the browser, exposes Markdown read/focus methods, and owns Vditor's lifecycle. `PostEditor` remains responsible for article loading/saving, dirty state, image API integration, and the existing preview/sidebar; heading navigation will target Vditor's rendered headings.

**Tech Stack:** Astro, React, TypeScript, Vditor, existing admin API and Markdown renderer.

**Spec:** User-approved Vditor replacement scope in the current task.

## Global Constraints

- Preserve `readPost` and `writePostContent` as the article read/write boundary.
- Persist the editor's Markdown value directly; do not convert through an intermediate block model.
- Use the existing `/media` upload path and image validation limits.
- Keep the existing admin preview, TOC sidebar, and unsaved-change behavior.
- Do not modify unrelated pending admin image-field changes.

---

### Task 1: Add the Vditor editor wrapper

**Files:**
- Create: `src/components/admin/cms-ui/components/VditorMarkdownEditor.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces `VditorMarkdownEditorHandle` with `getValue()`, `focus()`, `insertValue()`, `updateSelection()`, `getSelection()`, and `scrollToHeading()` methods.
- Accepts `initialValue: string`, `onChange(value: string): void`, `onSelectionChange(value: string): void`, and `onUpload(files: File[]): Promise<UploadedMarkdownImage[] | string>`.

- [x] Add Vditor as a runtime dependency using pnpm.
- [x] Create a `forwardRef` wrapper that dynamically imports Vditor and its CSS from `useEffect`, initializes it in `ir` mode with Chinese UI, and destroys it on unmount.
- [x] Configure Vditor's custom upload handler to call `onUpload`, insert Markdown image links for successful uploaded files with `insertValue`, and return any validation/API error string.
- [x] Forward every editor input to `onChange`; load `initialValue` once after Vditor is ready without treating initial load as a user edit.
- [x] Ensure a late dynamic import cannot initialize after unmount.

### Task 2: Replace BlockNote usage in the article editor

**Files:**
- Modify: `src/components/admin/cms-ui/components/PostEditor.tsx`
- Modify: `src/components/admin/cms-ui/components/EditorTOC.tsx`
- Modify: `src/components/admin/cms-ui/hooks/useEditorHeadings.ts`
- Modify: `src/components/admin/cms-ui/styles/globals.css`

**Interfaces:**
- `PostEditor` uses the wrapper's `getValue()` for saving and preview, and `scrollToHeading(index)` for sidebar navigation.
- `EditorHeading.id` contains the heading's ordinal index among all Markdown headings.

- [x] Remove BlockNote schema, conversion helpers, selection subscriptions, and block-specific upload state from `PostEditor`.
- [x] Load `data.content` as plain Markdown and save `editorRef.current?.getValue()` through `writePostContent`.
- [x] Track current Markdown from Vditor `onChange`; derive headings from Markdown heading lines, update the existing TOC, and scroll to the corresponding rendered heading on click.
- [x] Route Vditor paste/drag/tool-bar file uploads through `validateImageUpload` and `adminRequest('/media', ...)`, then insert Markdown image syntax; preserve the top-level image button and drag/drop affordance where compatible.
- [x] Keep the preview tab bound to the current Markdown value and preserve save shortcut, dirty indicator, close warning, and existing error boundary.
- [x] Remove the obsolete BlockNote menu styles from admin CSS.

### Task 3: Remove unused BlockNote dependencies and verify integration

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Inspect: `src/components/admin/cms-ui/components/index.ts`, admin editor routes

- [x] Confirm there are no remaining BlockNote imports in `src/` and remove the three BlockNote dependencies if unused elsewhere.
- [x] Run `pnpm lint:fix` as required by the repository instructions.
- [x] Run `pnpm check` and resolve any type errors caused by the migration.
- [x] Review `git diff` to confirm pending changes to category, post creation, metadata, and image upload fields remain intact.
