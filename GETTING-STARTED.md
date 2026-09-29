# 快速开始

欢迎使用 astro-koharu 博客主题！本文档将帮助你在 5 分钟内启动你的博客。

## 1. 环境准备

确保你的电脑已安装：

- **Node.js** 18.0 或更高版本
- **pnpm** 包管理器

如果没有安装 pnpm，运行：

```bash
npm install -g pnpm
```

## 2. 三步启动

### 第一步：获取代码

```bash
# 方式一：克隆仓库
git clone https://github.com/cosZone/astro-koharu.git
cd astro-koharu

# 方式二：使用 GitHub 模板（推荐）
# 点击仓库页面的 "Use this template" 按钮
```

### 第二步：安装依赖

```bash
pnpm install
```

### 第三步：启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 http://localhost:4321 即可看到你的博客！

## 3. 配置你的博客

### 基本信息

编辑 `config/site.yaml`：

```yaml
site:
  title: 你的博客名称 # 网站标题
  alternate: myblog # 英文短名，用于 logo
  subtitle: 你的副标题 # 副标题
  name: 你的名字 # 作者名
  description: 博客简介 # 一句话介绍
  author: 你的名字 # 文章作者
  url: https://your-domain.com/ # 部署后的域名
  defaultOgImage: /img/avatar.webp # 默认 Open Graph 图片
  startYear: 2024 # 建站年份
  avatar: /img/avatar.webp # 头像路径
  showLogo: true # 是否显示 logo
  keywords: # SEO 关键词
    - 博客
    - 技术
```

### 替换头像

将你的头像图片替换到 `public/img/avatar.webp`

### 社交链接

在 `config/site.yaml` 中配置社交媒体链接：

```yaml
social:
  github:
    url: https://github.com/your-username
    icon: ri:github-fill
    color: "#191717"
  email:
    url: mailto:your@email.com
    icon: ri:mail-line
    color: "#55acd5"
  rss:
    url: /rss.xml
    icon: ri:rss-line
    color: "#ff6600"
  # 添加更多社交链接...
```

## 4. 写第一篇文章

在 `src/content/blog/` 目录下创建 Markdown 文件。

### 基础模板

```markdown
---
title: 我的第一篇文章
date: 2024-01-01 12:00:00
tags:
  - 标签1
  - 标签2
categories:
  - 分类名
cover: /img/cover/1.webp
---

文章正文内容...
```

### Frontmatter 字段说明

| 字段          | 必填 | 说明                            |
| ------------- | ---- | ------------------------------- |
| `title`       | ✅   | 文章标题                        |
| `date`        | ✅   | 发布日期                        |
| `tags`        | ❌   | 标签列表                        |
| `categories`  | ❌   | 分类，支持嵌套如 `[笔记, 前端]` |
| `cover`       | ❌   | 封面图片路径                    |
| `description` | ❌   | 文章摘要                        |
| `sticky`      | ❌   | 设为 `true` 置顶文章            |
| `draft`       | ❌   | 设为 `true` 标记为草稿          |

### 分类使用

单层分类：

```yaml
categories:
  - 随笔
```

嵌套分类：

```yaml
categories:
  - [笔记, 前端]
```

## 5. 部署上线

### Vercel 一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu&project-name=astro-koharu&repository-name=astro-koharu)

1. 点击上方按钮
2. 登录 GitHub 账号
3. 等待自动部署完成

### 自定义域名

1. 在 Vercel 项目设置中添加域名
2. 按照提示配置 DNS
3. 更新 `config/site.yaml` 中的 `site.url` 字段

### Docker 部署

如果你更喜欢使用 Docker 部署：

```bash
# 1. 复制环境变量文件并填写配置
cp .env.example .env

# 2. 构建并启动（从仓库根目录运行）
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build

# 3. 访问博客
open http://localhost:4321
```

**重要**: 生成脚本需要在本地运行：

```bash
# 添加新图片/文章后，先本地运行：
pnpm generate:all

# 然后提交更改
git add src/assets/*.json
git commit -m "chore: update generated assets"

# 最后重建 Docker
./docker/rebuild.sh
```

详细说明请参考[使用指南的 Docker 部署章节](./src/content/blog/tools/astro-koharu-guide.md)。

## 6. 进阶功能

### 周刊/系列文章

在 `config/site.yaml` 中配置 `featuredSeries`：

```yaml
featuredSeries:
  categoryName: 周刊
  label: 我的周刊
  fullName: 我的技术周刊
  description: 每周技术分享
  cover: /img/weekly/2026-05_10.webp
  enabled: true
  links:
    github: https://github.com/SmileSnow819
    rss: /rss.xml
```

然后在 `src/content/blog/` 目录创建周刊文章。

### 多语言支持（i18n）

博客内置多语言支持。在 `config/site.yaml` 中配置：

```yaml
i18n:
  defaultLocale: zh # 默认语言（URL 无前缀）
  locales:
    - code: zh
      label: 中文
    - code: en
      label: English
```

配置后，博客会自动生成带语言前缀的页面（如 `/en/post/xxx`），导航栏和移动端抽屉中会出现语言切换器。

**添加翻译文章**：将翻译文章放在 `src/content/blog/<locale>/` 目录下，保持与默认语言相同的路径结构：

```plain
src/content/blog/
├── tools/getting-started.md        # 默认语言 (zh)
└── en/tools/getting-started.md     # 英文翻译
```

没有对应翻译的文章会自动回退显示默认语言内容，并标注提示。

更多详细配置（内容翻译、添加新语言等）请参考 [README 的多语言配置章节](./README.md#多语言配置i18n)。

### 背景音乐（BGM）

在 `config/site.yaml` 中配置背景音乐播放器：

```yaml
bgm:
  enabled: true
  # metingApi: https://163.hyc.moe/  # 自定义 Meting API 地址（默认 https://163.hyc.moe/）
  audio:
    - title: 我的歌单
      list:
        - https://music.163.com/playlist?id=你的歌单ID
```

音频播放器通过 [Meting](https://github.com/metowolf/meting) API 解析音乐平台链接，默认使用公共 API，**推荐自部署以获得更稳定的服务**。

### 内容生成（可选）

按需运行内容资产生成任务：

```bash
pnpm generate:lqips         # 生成 LQIP 图片占位符
pnpm generate:summaries     # 生成 AI 摘要
pnpm generate:all           # 依次执行以上全部任务
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |
| `pnpm lint` | 代码检查 |
| `pnpm generate:all` | 生成全部内容资产 |

## 7. 更新主题

更新前先提交或备份个人文章、配置和上传文件，再通过 Git 合并上游版本。合并冲突需要按文件检查并解决，尤其注意自己的内容和配置。

```bash
# 首次更新时添加上游仓库
git remote add upstream https://github.com/cosZone/astro-koharu.git

# 获取并合并上游更新
git fetch upstream
git merge upstream/main

# 更新依赖并验证
pnpm install
pnpm build
```

已有 `upstream` 远程仓库时跳过第一条命令。需要恢复内容时，使用更新前自行创建的备份或 Git 提交。

### 更新后检查

更新完成后，建议检查以下内容：

1. **配置兼容性**：如果 `config/site.yaml` 有新增字段，参考 `.env.example` 或文档补充
2. **依赖更新**：运行 `pnpm install` 确保依赖正确安装
3. **构建测试**：运行 `pnpm build` 确保构建成功
4. **功能测试**：运行 `pnpm dev` 检查页面是否正常显示

### 注意事项

- 如果你修改了主题的源代码（如组件样式），合并时可能会产生冲突，需要手动解决
- 建议在更新前使用 `git stash` 或创建分支保存本地修改
- 重大版本更新请查看 [Release Notes](https://github.com/cosZone/astro-koharu/releases) 了解破坏性变更

## 获取帮助

- 📖 [详细使用指南](./src/content/blog/tools/astro-koharu-guide.md)
- 🐛 [提交 Issue](https://github.com/cosZone/astro-koharu/issues)
- ⭐ [GitHub 仓库](https://github.com/cosZone/astro-koharu)

---

祝你搭建愉快！
