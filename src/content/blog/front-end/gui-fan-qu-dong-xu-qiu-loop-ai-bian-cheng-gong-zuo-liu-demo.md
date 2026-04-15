---
title: 规范驱动 + 需求 Loop AI 编程工作流 Demo
link: gui-fan-qu-dong-xu-qiu-loop-ai-bian-cheng-gong-zuo-liu-demo
date: 2026-04-14 19:43:46
description: '在现有 React 项目中，通过扩展 OpenSpec 自定义 Schema，实现一套完整的"Skill 知识库 + 需求 Loop + 规范驱动实现 + 自动验证"工作流。'
cover: /img/cover/blog1.jpg
tags:
  - AI
  - OpenSpec
categories:
  - 前端
---

# 规范驱动 + 需求 Loop AI 编程工作流 Demo

## 目标

在现有 React 项目中，通过**扩展 OpenSpec 自定义 Schema**，实现一套完整的"Skill 知识库 + 需求 Loop + 规范驱动实现 + 自动验证"工作流。

**关键认知**：这套工作流运行在 AI IDE（Cursor / Claude Code / CodeFlicker）的对话框里，我们不需要实现对话 UI，我们要做的是：

1. 在 OpenSpec 里创建一个自定义 Schema `loop-driven`
2. Schema 里新增 `requirement-loop` artifact（放在 `proposal` 之前）
3. 这个 artifact 的 `instruction` 引导 AI 检索 Skill 知识库、逐条反问用户
4. 后续正常走 `proposal → specs → design → tasks → /apply → /verify`

```plain
┌─────────────────────────────────────────────────────────────┐
│  触发路径 A（隐式）            触发路径 B（显式）              │
│                                                             │
│  用户: "帮我实现登录功能"      用户: "/opsx:propose add-login" │
│        ↓                              ↓                     │
│  AI 检测到需求模糊            AI 等待用户描述需求              │
│  → "需求描述较模糊，建议先     → "请简单描述你的登录功能需求"   │
│    用 /opsx:propose 完善，     → 用户输入后                   │
│    是否继续？"                                               │
│        ↓（用户确认）                  ↓                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓（两条路在这里汇合）
[requirement-loop artifact]
  AI 读取 openspec/skills/login.md 知识库
  → 逐条询问用户最佳实践选项（在 AI IDE 对话框里完成）
  → 用户回答 Yes/No 或补充说明
  → 生成 requirement-loop.md（需求确认文档）
        ↓
proposal artifact（依赖 requirement-loop.md）
  → AI 基于确认后的需求生成 proposal.md
        ↓
specs artifact → design artifact → tasks artifact
        ↓
/opsx:apply  →  /opsx:verify
```

---

## 1. 整体架构

### 1.1 文件结构

```plain
my-react-app/
├── openspec/
│   ├── config.yaml                    ← 项目配置：设置默认 schema 为 loop-driven
│   ├── schemas/
│   │   └── loop-driven/               ← 自定义 Schema（核心产物）
│   │       ├── schema.yaml            ← Workflow 定义（含新增的 requirement-loop artifact）
│   │       └── templates/
│   │           ├── requirement-loop.md ← Loop artifact 的模板（引导 AI 如何提问）
│   │           ├── proposal.md
│   │           ├── spec.md
│   │           ├── design.md
│   │           └── tasks.md
│   ├── skills/                        ← Skill 知识库（最佳实践沉淀，供 AI 检索）
│   │   ├── login.md                   ← 登录功能最佳实践
│   │   ├── payment.md                 ← 支付功能最佳实践（未来扩展）
│   │   └── README.md                  ← 说明如何使用 Skill 库
│   ├── specs/                         ← 系统级规范（归档后持久化）
│   └── changes/                       ← 每次变更目录
│       └── add-login/                 ← 本次演示用的变更
│           ├── requirement-loop.md    ← 需求确认文档（Loop 产物）
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/
│               └── auth-login/
│                   └── spec.md
└── src/                               ← React 代码（按 tasks.md 实现）
    └── components/
        └── Login/
            ├── LoginForm.tsx
            └── useLoginLogic.ts
```

### 1.2 工作流全景图

两条触发路径，汇合后走相同的 Loop + OpenSpec 流程：

**路径 A — 隐式触发（自然语言 → AI 主动建议）**

```plain
开发者: "帮我实现一个登录功能"
  ↓
AI 判断需求模糊（依赖 config.yaml 的 context rules 注入）
  → 回复: "你的需求描述比较简短，为确保实现质量，建议先用
            /opsx:propose 完善需求细节，是否继续？"
  ↓ 用户确认
进入 requirement-loop artifact
```

**路径 B — 显式触发（直接调用 propose）**

```plain
开发者: "/opsx:propose add-login"
  ↓
AI: "请简单描述你的登录功能需求（比如：面向什么用户、
     有无特殊安全要求等），我来帮你完善规范。"
  ↓ 用户输入需求描述
进入 requirement-loop artifact
```

**两条路汇合后的统一流程：**

```plain
[requirement-loop artifact]
AI 读取 openspec/skills/{feature}.md 知识库
→ 逐条反问用户（在 AI IDE 对话框里，就是普通聊天）
→ 用户回答 Yes/No 或追加参数说明
→ 生成 requirement-loop.md

→ proposal.md（基于确认需求）
→ specs/auth-login/spec.md（GIVEN/WHEN/THEN）
→ design.md（技术决策）
→ tasks.md（实现清单）

/opsx:apply  → 代码实现
/opsx:verify → 规范验证
```

### 1.3 路径 A 的实现方式

路径 A 不需要写代码，通过 `openspec/config.yaml` 的 `context` 向 AI 注入行为规则：

```yaml
context: |
  当用户输入与功能实现相关的简短需求（如"帮我实现登录"、"做一个支付页面"），
  且需求描述不够详细时，请主动提示：
  "需求描述较模糊，建议先运行 /opsx:propose <feature-name> 完善需求细节，
  以确保实现质量，是否继续？"

  这样可以触发 requirement-loop，确保在写代码之前把需求对齐清楚。
```

这条 context 会被注入到所有 AI 响应的系统提示里，让 AI IDE 具备"主动建议进入 Loop"的行为。

---

## 2. 核心产物：loop-driven Schema

### 2.1 schema.yaml

文件：`openspec/schemas/loop-driven/schema.yaml`

```yaml
name: loop-driven
version: 1
description: |
  需求 Loop 驱动的规范开发流程。
  在生成 proposal 之前，先通过 AI 检索 Skill 知识库，
  逐条与用户确认最佳实践，确保需求无遗漏后再进入实现阶段。

artifacts:
  - id: requirement-loop
    generates: requirement-loop.md
    description: 需求确认文档（AI 检索 Skill 知识库后与用户逐条确认的结果）
    template: requirement-loop.md
    instruction: |
      你是一个经验丰富的技术架构师。用户想要实现一个新功能。

      你的任务分两步：

      **Step 1: 检索 Skill 知识库**
      读取 openspec/skills/ 目录下与当前功能相关的 Skill 文件。
      根据用户描述的功能名称（如 "login"、"payment"），
      找到对应的 skills/*.md 文件，提取其中的最佳实践列表。

      **Step 2: 逐条需求确认（Loop）**
      对检索到的每一条最佳实践：
      1. 用自然语言向用户提问（包含：这是什么、为什么需要它、推荐默认值）
      2. 等待用户回答（Yes/No 或追加说明）
      3. 记录用户的选择和补充

      直到所有最佳实践都确认完毕，才能生成 requirement-loop.md。

      生成的 requirement-loop.md 必须包含：
      - 用户的原始需求描述
      - 每条最佳实践的确认结果（选择 + 具体参数）
      - 明确的 Out of Scope（用户选择不实现的）
    requires: []

  - id: proposal
    generates: proposal.md
    description: 变更提案
    template: proposal.md
    instruction: |
      基于 requirement-loop.md 中已确认的需求，生成变更提案。
      proposal 必须完整反映用户在 Loop 中确认的所有选项。
    requires:
      - requirement-loop

  - id: specs
    generates: specs/**/*.md
    description: 功能规范（GIVEN/WHEN/THEN 格式）
    template: spec.md
    instruction: |
      基于 proposal.md 和 requirement-loop.md，
      为每一条已确认的需求生成对应的 Requirement + Scenario。
      使用标准的 GIVEN/WHEN/THEN 格式。
    requires:
      - proposal

  - id: design
    generates: design.md
    description: 技术设计文档
    template: design.md
    requires:
      - specs

  - id: tasks
    generates: tasks.md
    description: 实现任务清单
    template: tasks.md
    instruction: |
      基于 design.md 和 specs，生成分阶段的实现任务清单。
      每条任务必须能追溯到 spec.md 中的某个 Requirement。
    requires:
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

### 2.2 requirement-loop.md 模板

文件：`openspec/schemas/loop-driven/templates/requirement-loop.md`

```markdown
# Requirement Loop: {{feature-name}}

## 用户原始需求

<!-- 记录用户的原始输入，原文保留 -->

## 检索到的相关最佳实践

<!-- 列出从 Skill 知识库中找到的相关实践清单 -->

## 需求确认结果

<!-- 每条最佳实践的确认状态，格式如下：

### ✅ [最佳实践名称]
- **选择**: 需要
- **参数**: [用户补充的具体参数，如 RT 有效期 = 30天]
- **纳入规范**: The system SHALL ...

### ❌ [最佳实践名称]
- **选择**: 不需要
- **原因**: [用户说明的原因，或 N/A]
-->

## Out of Scope

<!-- 明确列出本次不实现的内容，防止后续争议 -->
```

---

## 3. Skill 知识库

### 3.1 登录功能最佳实践

文件：`openspec/skills/login.md`

```markdown
# Login Feature Skills

> 这是登录功能的最佳实践知识库。
> 当用户要实现登录功能时，AI 应逐条确认以下实践。

## 最佳实践清单

### 1. 双 Token 机制（dual-token）

**分类**: Security
**推荐**: ✅ 是
**说明**: 使用 Access Token（AT，短期，建议 15 分钟）+ Refresh Token（RT，长期，建议 7 天）。
AT 过期后用 RT 静默刷新，用户无感知。避免长期 Token 泄露风险。
**需确认的参数**: AT 有效期、RT 有效期、Token 存储方式（localStorage / httpOnly Cookie）

---

### 2. 登录按钮防抖（debounce）

**分类**: UX
**推荐**: ✅ 是
**说明**: 防止用户多次点击导致重复发送请求。建议 300ms 防抖 + 请求期间禁用按钮。
**需确认的参数**: 防抖时长（默认 300ms）

---

### 3. 实时表单校验（form-validation）

**分类**: UX
**推荐**: ✅ 是
**说明**: 用户输入时即时提示错误（邮箱格式、密码强度），减少提交后报错的挫败感。
**需确认的参数**: 校验时机（onBlur / onChange）、使用 Zod / Yup / 原生

---

### 4. 密码前端加密（password-encrypt）

**分类**: Security
**推荐**: ⚠️ 视情况
**说明**: 在 HTTPS 普及的情况下，前端加密价值有限，但对安全要求高的场景（金融/企业）建议开启。
**需确认的参数**: 加密算法（bcrypt 在前端不适用，通常用 SHA-256 或 RSA 公钥加密）

---

### 5. 记住我（remember-me）

**分类**: UX
**推荐**: ✅ 是
**说明**: 允许用户选择是否保持登录状态更长时间（延长 RT 有效期或使用持久化存储）。
**需确认的参数**: 记住时长（默认 30 天）、实现方式

---

### 6. 验证码（captcha）

**分类**: Security
**推荐**: ⚠️ 视情况
**说明**: 防止暴力破解。可以在连续失败 N 次后触发（而非每次都要求）。
**需确认的参数**: 触发条件（失败几次后）、类型（图片/短信/行为验证）

---

### 7. 细分错误类型（granular-errors）

**分类**: UX
**推荐**: ✅ 是
**说明**: 区分"账号不存在"和"密码错误"的提示，帮助用户定位问题（注意：某些场景出于安全考虑故意模糊）。
**需确认的参数**: 是否区分（部分场景为防止账号枚举攻击，应统一返回"账号或密码错误"）

---

### 8. Loading 状态（loading-state）

**分类**: UX
**推荐**: ✅ 是
**说明**: 登录请求期间展示 Loading 指示器，防止用户以为没有响应而重复点击。
**需确认的参数**: 展示方式（按钮 loading / 全屏遮罩）

---

### 9. 前端限流（rate-limiting）

**分类**: Security
**推荐**: ✅ 是
**说明**: 前端记录失败次数，超过阈值后锁定登录一段时间（配合后端限流双重保障）。
**需确认的参数**: 最大失败次数（默认 5）、锁定时长（默认 15 分钟）
```

### 3.2 README

文件：`openspec/skills/README.md`

```markdown
# OpenSpec Skills 知识库

这里存放各功能模块的最佳实践知识库，供 `requirement-loop` artifact 检索使用。

## 结构

- `login.md` — 登录/认证相关最佳实践
- `payment.md` — 支付相关最佳实践（待补充）

## 如何使用

当 AI 执行 `requirement-loop` artifact 时，会自动读取本目录下与当前功能相关的文件。
也可以在 `openspec/config.yaml` 的 context 里显式声明 Skills 路径。

## 如何扩展

为新功能添加 Skills：

1. 在此目录新建 `{feature}.md`
2. 按照现有格式填写最佳实践清单
3. 每条实践包含：分类、推荐程度、说明、需确认的参数
```

---

## 4. 项目配置

### 4.1 config.yaml

文件：`openspec/config.yaml`

```yaml
schema: loop-driven

context: |
  Tech stack: TypeScript, React 19, Vite, Tailwind CSS
  Form validation: Zod + React Hook Form
  Auth pattern: JWT (Access Token + Refresh Token)
  State management: React hooks (no Redux)

  当执行 requirement-loop 时，请读取 openspec/skills/ 目录下对应的 Skill 文件。

rules:
  requirement-loop:
    - 必须逐条询问，不得跳过任何 Skill
    - 每个问题都要说明"为什么需要它"
    - 用户的补充说明必须原文记录到 requirement-loop.md
    - 生成文档前必须得到用户对所有条目的明确答复
  specs:
    - 使用 Given/When/Then 格式
    - 每条 Requirement 必须能追溯到 requirement-loop.md 中的某个确认结果
  tasks:
    - 每个 Task 必须注明对应的 spec Requirement ID
```

---

## 5. 完整演示流程

### 5.1 路径 A 演示（隐式触发：模糊需求 → AI 主动建议）

```plain
开发者: "帮我实现一个登录功能"

AI:     "你的需求描述比较简短，为确保实现符合最佳实践，
         建议先用 /opsx:propose 完善需求细节，是否继续？"

开发者: "好的"

AI:     "请简单描述你的登录场景（比如：B端还是C端？
         有无特殊安全要求？目标用户量？）"

开发者: "C端用户，日活10万，需要比较严格的安全控制"

AI:     "明白了。检索登录知识库...
         找到 9 条相关实践，我们逐一确认 ↓"
         [进入 Loop →]
```

### 5.2 路径 B 演示（显式触发：直接 /opsx:propose）

```plain
开发者: /opsx:propose add-login

AI:     "请简单描述你的登录功能需求。"

开发者: "标准账号密码登录，C端，安全性要求较高"

AI:     "好的，检索登录知识库... 找到 9 条相关实践，逐一确认 ↓"
         [进入 Loop →]
```

### 5.3 Loop 对话（两条路径汇合后相同）

```plain
AI：[1/9] 双 Token 机制
    建议使用 Access Token（短期，15分钟）+ Refresh Token（长期，7天）。
    AT 过期后用 RT 静默刷新，用户无感知，避免长期 Token 泄露。
    你的项目需要这个吗？如果需要，AT 和 RT 的有效期用默认值吗？

用户：需要，RT 改成 30 天

AI：记录 ✅ 双 Token，AT=15min，RT=30天。

    [2/9] 登录按钮防抖
    防止多次点击重复发送请求，建议 300ms 防抖 + 请求期间禁用按钮。需要吗？

用户：需要

...（9条全部确认）

AI：需求确认完成！
    生成 requirement-loop.md ✓
    生成 proposal.md ✓
    生成 specs/auth-login/spec.md ✓
    生成 design.md ✓
    生成 tasks.md ✓

    所有文档已就绪，请审阅后运行 /opsx:apply 开始实现。
```

---

## 6. 实施顺序

| 步骤 | 任务                       | 文件                                                         | 说明                                           |
| ---- | -------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| 1    | 安装 OpenSpec CLI          | —                                                            | `npm install -g @fission-ai/openspec@latest`   |
| 2    | 初始化 OpenSpec            | `openspec/`                                                  | `openspec init` 生成基础目录                   |
| 3    | Fork 内置 schema           | `openspec/schemas/loop-driven/`                              | `openspec schema fork spec-driven loop-driven` |
| 4    | 编写 Skill 知识库          | `openspec/skills/login.md`                                   | 核心产物，包含 9 条登录最佳实践                |
| 5    | 修改 schema.yaml           | `openspec/schemas/loop-driven/schema.yaml`                   | 新增 `requirement-loop` artifact，调整依赖链   |
| 6    | 编写 Loop 模板             | `openspec/schemas/loop-driven/templates/requirement-loop.md` | AI 生成 requirement-loop 文档的结构模板        |
| 7    | 配置 config.yaml           | `openspec/config.yaml`                                       | 设置默认 schema + 注入 context + Loop 规则     |
| 8    | 验证 schema                | —                                                            | `openspec schema validate loop-driven`         |
| 9    | 执行演示 Loop              | `openspec/changes/add-login/`                                | `/opsx:propose add-login` 跑通完整流程         |
| 10   | 对照 tasks.md 实现登录组件 | `src/components/Login/`                                      | 这是最终的代码产物                             |
| 11   | 执行 verify                | —                                                            | `/opsx:verify` 验证覆盖率                      |

---

## 7. 核心设计哲学

1. **Skill 库 = 沉淀在版本控制里的最佳实践**
   - 不是散落在 Wiki 里的文档，而是 `openspec/skills/*.md`，随代码一起 git 管理
   - 新人入职可以直接读；AI 接任务也可以直接读

2. **Loop = OpenSpec 工作流的前置环节，不是独立 App**
   - 通过自定义 Schema 的 `requirement-loop` artifact 实现
   - 运行在 AI IDE 的对话框里，用户体验与正常聊天无异
   - 完成后自动衔接后续的 proposal/specs/design/tasks

3. **OpenSpec = 唯一真相来源**
   - `spec.md` 里的 GIVEN/WHEN/THEN 是可验证的规范
   - `requirement-loop.md` 存档了"为什么这样设计"的决策过程
   - `tasks.md` 是代码实现的 checklist

4. **Verify = 闭环，不是摆设**
   - `/opsx:verify` 让 AI 对照 spec.md 逐条检查实现
   - 每个 task 都能追溯到 spec 的 Requirement，形成完整的可追溯链

5. **可扩展性**
   - 想支持支付功能？新建 `openspec/skills/payment.md` 即可
   - 这套 Schema 和 Skills 库可以在团队内所有项目共享
