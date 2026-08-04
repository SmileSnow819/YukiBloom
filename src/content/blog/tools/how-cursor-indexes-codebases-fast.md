---
title: Cursor 如何快速索引代码库
link: how-cursor-indexes-codebases-fast
catalog: true
date: 2026-08-04 16:00:00
description: 译自 Engineer's Codex，梳理 Cursor 如何通过 Merkle 树、代码分块、向量嵌入和增量同步快速索引大型代码库。
tags:
  - Cursor
  - Merkle Tree
  - 代码索引
  - RAG
  - AI IDE
categories:
  - 转载
cover: /img/cover/tools.webp
---

> 转载译文说明：本文翻译整理自 Engineer's Codex 的文章 [How Cursor Indexes Codebases Fast](https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast)，原文发布于 2025-05-10。本文仅作学习记录与技术复盘。
>
> 译者注：原文中的推广信息已略去，不影响正文技术内容。

Cursor 是一款流行的 AI IDE。它的代码库索引能力之所以能做得比较快，一个核心原因是使用了 **Merkle Tree（默克尔树）** 来判断代码库中哪些文件发生了变化，从而避免每次都全量重新索引。

在理解 Cursor 的实现之前，先看一下 Merkle Tree 是什么。

## Merkle Tree 是什么？

Merkle Tree 是一种树形数据结构。它的每个叶子节点保存某个数据块的加密哈希值，每个非叶子节点保存其子节点哈希值组合后的哈希值。

换句话说，它像是一套分层的数据指纹系统：

1. 每个数据块，比如一个文件，都会生成自己的唯一指纹，也就是 hash。
2. 相邻的指纹会被组合起来，再生成一个新的上层指纹。
3. 这个过程不断向上合并，直到得到一个根节点 hash。

根 hash 可以概括整个数据集合的状态。只要底层任意一块数据发生变化，它对应的 hash 会变化，上层节点也会跟着变化，最终导致根 hash 改变。

![Merkle Tree 示意图](https://substackcdn.com/image/fetch/$s_!Lb0A!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff2e51d80-fe7d-4756-a47e-9b27b126bea4_772x467.jpeg)

## Cursor 如何使用 Merkle Tree？

根据 Cursor 创始人在论坛中的说明以及 Cursor 的安全文档，Cursor 会把 Merkle Tree 作为代码库索引能力的核心组件之一。

![Cursor 代码库索引流程示意图](https://substackcdn.com/image/fetch/$s_!dBf0!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9d7452a3-81c2-4788-bea7-a087cd2463da_6400x4800.png)

当用户开启 codebase indexing 后，Cursor 会先在本地扫描编辑器中打开的文件夹，找到所有有效文件，并基于这些文件计算出一棵 Merkle Tree。随后，这棵 Merkle Tree 会和 Cursor 服务端进行同步。

在实际索引前，Cursor 会先在本地对代码文件进行分块，把代码切成更有语义意义的小片段。分块完成后，这些 chunk 会被发送到 Cursor 的服务端，用嵌入模型生成 embeddings。原文推测这里可能使用 OpenAI 的 embedding API，也可能是 Cursor 自研或定制的 embedding 模型，但没有得到完全验证。

这些向量表示会捕获代码片段的语义信息。随后，embedding 会连同起止行号、文件路径等元数据一起存入远程向量数据库 Turbopuffer。为了在支持路径过滤的同时尽量保护隐私，Cursor 不会直接保存明文相对路径，而是保存混淆后的相对路径。

Cursor 创始人曾说明，Cursor 的数据库不会长期保存用户代码内容；代码内容只在请求生命周期内使用。

Cursor 会每 10 分钟检查一次 hash 是否匹配。如果 Merkle Tree 显示某些文件已经变化，它只需要上传变化过的文件，而不需要重新上传整个代码库。这就是 Merkle Tree 在代码索引中的核心价值：让增量更新变得足够便宜。

## 代码分块为什么重要？

代码库索引效果很大程度上取决于代码是如何分块的。粗糙的分块方式可能只按字符、单词或行数切分，但这很容易切断代码的语义边界，导致 embedding 质量下降。

常见的分块策略包括：

1. **按固定 token 数切分**：实现简单，但可能把一个函数、类或代码块切到一半。
2. **递归文本切分**：根据更高层级的分隔符切分，比如类定义、函数定义、空行等，尽量保留语义边界。
3. **基于 AST 切分**：通过抽象语法树理解代码结构，按深度优先遍历把代码拆成满足 token 限制的子树。为了避免 chunk 过碎，还可以在不超过 token 限制的前提下合并兄弟节点。

AST 分块是更优雅的方案。借助 [tree-sitter](https://tree-sitter.github.io/tree-sitter/) 这类工具，可以解析多种编程语言，并按照真实的语法结构切分代码。

## Embedding 生成后怎么用？

当你在 Cursor 中使用 `@Codebase` 或快捷键向 AI 提问时，前面生成的代码向量就会派上用场。大致流程如下：

1. **生成查询向量**：Cursor 会为你的问题或当前代码上下文计算一个 embedding。
2. **向量相似度搜索**：这个查询向量会被发送到 Turbopuffer，由向量数据库查找语义上最相近的代码片段。
3. **返回本地定位信息**：客户端拿到结果后，会得到混淆后的文件路径和行号范围。真正的代码内容仍然留在本机。
4. **组装上下文**：Cursor 客户端再从本地文件中读取相关代码片段，把它们作为上下文发送给服务端，让大模型结合问题一起处理。
5. **生成更准确的回答**：大模型拿到代码库上下文后，就能给出更贴近当前项目的解释、补全或修改建议。

这种基于 embedding 的检索能力可以支撑几类场景：

1. **上下文感知的代码生成**：生成新代码时参考项目中已有的实现方式，保持风格一致。
2. **代码库问答**：针对当前项目提问，而不是得到泛泛的通用答案。
3. **智能补全**：补全逻辑可以感知项目内部的约定、模式和上下文。
4. **辅助重构**：系统可以在代码库中找到相关片段，帮助识别哪些地方可能需要同步修改。

## Merkle Tree 带来的收益

使用 Merkle Tree 后，Cursor 可以快速判断上一次同步之后具体哪些文件发生过变化。

如果没有这种结构，大型代码库每次索引都可能需要重新上传大量文件，带宽和计算成本都会很高。Merkle Tree 让 Cursor 可以只上传发生变更的文件，从而显著降低同步和重新索引的成本。

这套分层 hash 结构也能帮助 Cursor 校验本地正在索引的文件是否与服务端记录一致。如果传输或缓存过程中出现不一致，hash 对比可以更快发现问题。

除此之外，Cursor 会使用 chunk hash 作为缓存索引。相同代码库第二次索引时，很多 chunk 可以直接命中缓存，因此速度会快很多。对团队协作来说，如果多位开发者处理的是同一个代码库，这种缓存机制也能减少重复计算。

## 路径混淆与 Git 历史索引

为了保护文件路径中的敏感信息，Cursor 会做路径混淆。原文提到的一种方式是：把路径按 `/` 和 `.` 拆成多个片段，再用保存在客户端的密钥分别加密这些片段。

这种方式仍然可能暴露一部分目录层级信息，但可以隐藏大多数具体路径细节。

如果在 Git 仓库中开启代码库索引，Cursor 还会索引 Git 历史。它会保存 commit SHA、父提交信息以及混淆后的文件名。

为了让同一 Git 仓库、同一团队中的用户共享这套索引数据结构，Cursor 会根据最近提交内容的 hash 派生出用于混淆文件名的密钥。

## Embedding 模型与 token 限制

Embedding 模型的选择会直接影响代码搜索和代码理解的质量。

一些系统会使用开源模型，比如 [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)。Cursor 则很可能使用 OpenAI 的 embedding 模型，或针对代码场景定制过的模型。

如果专门面向代码语义理解，也可以考虑类似 Microsoft 的 [unixcoder-base](https://huggingface.co/microsoft/unixcoder-base) 或 Voyage AI 的 [voyage-code-2](https://docs.voyageai.com/embeddings/models/)。

embedding 的另一个挑战是 token 限制。例如 OpenAI 的 [text-embedding-3-small](https://platform.openai.com/docs/guides/embeddings) 有输入 token 上限。好的分块策略需要在不超过 token 限制的前提下，尽可能保留代码语义完整性。

## 同步时的握手流程

Cursor 的 Merkle Tree 同步中还有一个关键步骤：握手。

从 Cursor 应用日志来看，初始化 codebase indexing 时，Cursor 会创建一个 `merkle client`，并和服务端进行 `startup handshake`。

这个握手过程会把本地计算出的 Merkle Tree 根 hash 发送给服务端。服务端拿到根 hash 后，就能判断本地代码库和服务端索引之间是否一致，以及哪些部分需要同步。

GitHub 上一些 Cursor issue 的日志也能看到类似过程：Cursor 会先计算代码库的初始 hash，再发送给服务端进行校验。

## 实现挑战与安全风险

Merkle Tree 方案虽然高效，但实现上并不简单。

Cursor 的索引服务可能会在高负载下出现请求失败，导致文件需要多次上传才能完整索引。用户有时会观察到对 `repo42.cursor.sh` 的网络请求流量比预期更高，这很可能和重试机制有关。

另一个挑战是 embedding 安全。学术研究已经证明，在某些条件下，embedding 可能被反推回部分原始文本。虽然当前攻击通常依赖攻击者能访问 embedding 模型，并且更适合短文本场景，但如果攻击者拿到了向量数据库，理论上仍可能从 embedding 中推断出部分代码库信息。

所以 Cursor 这类系统需要在“让 AI 理解代码库”和“保护代码隐私”之间做工程权衡。

## 小结

Cursor 的代码库索引并不是简单地把整个项目丢给大模型，而是一套结合本地扫描、代码分块、向量检索、远程缓存、路径混淆和 Merkle Tree 增量同步的工程系统。

其中 Merkle Tree 解决的是“如何快速知道什么变了”；代码分块和 embedding 解决的是“如何让 AI 找到相关代码”；本地文件访问和路径混淆则是在效率与隐私之间做折中。

这也是 AI IDE 体验能变好的关键：真正的难点不只是调用大模型，而是如何把代码库上下文高效、准确、低成本地喂给模型。
