# API 缓存摘要

更新时间：2026-09-29T03:53:30.880Z

## 文档分组

| 分组 | 路径数 | 接口数 | 缓存文件 |
| ---- | ------ | ------ | -------- |
| 全部 | 26 | 34 | `openapi/全部.json` |

## 接口索引

| 分组 | 方法 | 路径 | 摘要 | 缓存文件 |
| ---- | ---- | ---- | ---- | -------- |
| 全部 | PUT | `/api/v1/admin/footprints` | 整体保存足迹 | `operations/全部_put_-api-v1-admin-footprints.json` |
| 全部 | POST | `/api/v1/admin/login` | 管理员登录 | `operations/全部_post_-api-v1-admin-login.json` |
| 全部 | POST | `/api/v1/admin/logout` | 管理员退出 | `operations/全部_post_-api-v1-admin-logout.json` |
| 全部 | GET | `/api/v1/admin/media` | 查询图片库 | `operations/全部_get_-api-v1-admin-media.json` |
| 全部 | POST | `/api/v1/admin/media` | 上传图片 | `operations/全部_post_-api-v1-admin-media.json` |
| 全部 | DELETE | `/api/v1/admin/media/{id}` | 删除未引用图片 | `operations/全部_delete_-api-v1-admin-media-id.json` |
| 全部 | GET | `/api/v1/admin/pages` | 查询后台页面列表 | `operations/全部_get_-api-v1-admin-pages.json` |
| 全部 | POST | `/api/v1/admin/pages` | 创建页面草稿 | `operations/全部_post_-api-v1-admin-pages.json` |
| 全部 | DELETE | `/api/v1/admin/pages/{id}` | 删除页面 | `operations/全部_delete_-api-v1-admin-pages-id.json` |
| 全部 | GET | `/api/v1/admin/pages/{id}` | 查询后台页面详情 | `operations/全部_get_-api-v1-admin-pages-id.json` |
| 全部 | PATCH | `/api/v1/admin/pages/{id}` | 更新页面草稿 | `operations/全部_patch_-api-v1-admin-pages-id.json` |
| 全部 | POST | `/api/v1/admin/pages/{id}/publish` | 发布页面 | `operations/全部_post_-api-v1-admin-pages-id-publish.json` |
| 全部 | POST | `/api/v1/admin/pages/{id}/unpublish` | 撤回页面 | `operations/全部_post_-api-v1-admin-pages-id-unpublish.json` |
| 全部 | GET | `/api/v1/admin/posts` | 查询后台文章列表 | `operations/全部_get_-api-v1-admin-posts.json` |
| 全部 | POST | `/api/v1/admin/posts` | 创建文章草稿 | `operations/全部_post_-api-v1-admin-posts.json` |
| 全部 | DELETE | `/api/v1/admin/posts/{id}` | 删除文章 | `operations/全部_delete_-api-v1-admin-posts-id.json` |
| 全部 | GET | `/api/v1/admin/posts/{id}` | 查询后台文章详情 | `operations/全部_get_-api-v1-admin-posts-id.json` |
| 全部 | PATCH | `/api/v1/admin/posts/{id}` | 修改文章 | `operations/全部_patch_-api-v1-admin-posts-id.json` |
| 全部 | POST | `/api/v1/admin/posts/{id}/publish` | 发布文章 | `operations/全部_post_-api-v1-admin-posts-id-publish.json` |
| 全部 | POST | `/api/v1/admin/posts/{id}/unpublish` | 撤回文章 | `operations/全部_post_-api-v1-admin-posts-id-unpublish.json` |
| 全部 | POST | `/api/v1/admin/posts/markdown` | 上传 Markdown 并保存为草稿 | `operations/全部_post_-api-v1-admin-posts-markdown.json` |
| 全部 | POST | `/api/v1/admin/posts/markdown/preview` | 预览 Markdown 文章 | `operations/全部_post_-api-v1-admin-posts-markdown-preview.json` |
| 全部 | GET | `/api/v1/admin/session` | 查询管理员会话 | `operations/全部_get_-api-v1-admin-session.json` |
| 全部 | GET | `/api/v1/admin/site-content` | 查询后台站点内容 | `operations/全部_get_-api-v1-admin-site-content.json` |
| 全部 | PUT | `/api/v1/admin/site-content` | 整体保存站点内容 | `operations/全部_put_-api-v1-admin-site-content.json` |
| 全部 | PUT | `/api/v1/admin/timeline` | 整体保存实习经历 | `operations/全部_put_-api-v1-admin-timeline.json` |
| 全部 | GET | `/api/v1/footprints` | 查询公开足迹 | `operations/全部_get_-api-v1-footprints.json` |
| 全部 | GET | `/api/v1/health` | 检查 API 服务状态 | `operations/全部_get_-api-v1-health.json` |
| 全部 | GET | `/api/v1/pages/{slug}` | 查询公开独立页面 | `operations/全部_get_-api-v1-pages-slug.json` |
| 全部 | GET | `/api/v1/posts` | 查询公开文章列表 | `operations/全部_get_-api-v1-posts.json` |
| 全部 | GET | `/api/v1/posts/{slug}` | 按链接标识查询公开文章 | `operations/全部_get_-api-v1-posts-slug.json` |
| 全部 | GET | `/api/v1/site-content` | 查询公开站点内容 | `operations/全部_get_-api-v1-site-content.json` |
| 全部 | GET | `/api/v1/timeline` | 查询公开实习经历 | `operations/全部_get_-api-v1-timeline.json` |
| 全部 | GET | `/uploads/{key}` | 获取公开图片文件 | `operations/全部_get_-uploads-key.json` |

## 使用方式

- 更新缓存：`pnpm api:update`
- 检查缓存：`pnpm api:check`
