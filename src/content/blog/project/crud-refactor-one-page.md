---
title: 后台 CRUD 重构：三个页面合并成一个，维护效率翻倍
link: crud-refactor-one-page
date: 2026-04-24 14:00:00
description: 第一次独立做需求被同事 code review 点醒：新建、编辑、详情三个页面其实可以写在一起，用状态驱动替代页面复制。
tags:
  - Vue
  - CRUD
  - 重构
  - 实习日记
categories:
  - [项目, 前端]
cover: /img/cover/project1.webp
---

## 写在前面

这是我进公司后第一次独立负责一个完整需求——做一个业务单据的维护模块。

终于可以写点功能代码了！一顿操作：新建文件夹 → `Create.vue、Edit.vue、Detail.vue，`刚准备开始复制粘贴表单代码，mentor 过来 review 我的代码结构。

他看了看我的三个文件，问了一句："这三个页面表单长得一样，为什么不写在一起，用路由参数切换状态？"

我愣了一下，好像... 还真是这么回事，之前也没有想过这些事情，因为三个路由就像是理所当然的，虽然他们好像确实差不多...？

以前在学校写项目，都是要几个页面我就建几个 `.vue` 文件，从来没想过可以合并。mentor 这一句话给我打开了新世界的大门。

周末把这次重构的思路整理一下，算是给自己的第一次需求做个复盘。

## 核心思路：别被原型的"页面"框住

产品原型画了三个页面，不代表代码里就一定要三个组件。

跳出来看，这三个本质上就是**同一个表单的不同状态**：

| 状态 | 特点            | 操作       |
| ---- | --------------- | ---------- |
| 新建 | 无 ID，表单为空 | POST 新增  |
| 编辑 | 有 ID，回填数据 | PUT 更新   |
| 详情 | 有 ID，只读展示 | 无保存按钮 |

理清楚这个，代码结构就简单多了：**一个路由，状态驱动 UI**。

## 场景一：页面跳转（一个路由搞定）

如果表单字段比较多，需要跳转到新页面填写，可以用 Vue Router 的可选参数 `?` 来合并路由。

### 路由配置

```typescript
// router/index.ts
export default [
  {
    path: "/business/form/:id?", // :id? 表示参数可有可无
    name: "BusinessForm",
    component: () => import("@/views/business/CommonForm.vue"),
  },
];
```

### 组件实现

```vue
<template>
  <div class="form-container">
    <h2>{{ pageTitle }}</h2>

    <el-form :model="formData" :disabled="isDetail" label-width="120px">
      <el-form-item label="单据名称">
        <el-input v-model="formData.name" placeholder="请输入名称" />
      </el-form-item>

      <el-form-item>
        <el-button v-if="!isDetail" type="primary" @click="handleSave"
          >保存</el-button
        >
        <el-button @click="$router.back()">返回</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

// 1. 从路由取参数
const id = computed(() => route.params.id);
const type = computed(() => route.query.type);

// 2. 计算当前状态（后面所有的逻辑都靠这三个布尔值控制）
const isCreate = computed(() => !id.value);
const isDetail = computed(() => !!id.value && type.value === "detail");
const isEdit = computed(() => !!id.value && type.value !== "detail");

// 页面标题也根据状态变化
const pageTitle = computed(() => {
  if (isCreate.value) return "新建业务单";
  if (isEdit.value) return "编辑业务单";
  return "业务单详情";
});

const formData = ref({});

// 3. 只有非新建状态才需要拉数据回填
onMounted(async () => {
  if (!isCreate.value) {
    // formData.value = await fetchDetail(id.value)
  }
});

// 4. 保存时根据状态调用不同接口
const handleSave = async () => {
  if (isCreate.value) {
    // await createApi(formData.value)
  } else {
    // await updateApi(id.value, formData.value)
  }
};
</script>
```

改完之后删掉了两个文件，代码量少了将近一半，维护起来真的轻松多了。

## 场景二：弹窗表单（靠 Props 控制）

还有一种常见场景是不跳转页面，直接在列表页点弹窗。这种更简单，连路由都不用改，父组件传个 `mode` 进来就行。

```vue
<template>
  <el-dialog :title="dialogTitle" v-model="visible" width="500px">
    <el-form :model="formData" :disabled="isDetail" label-width="100px">
      <!-- 表单字段 -->
    </el-form>

    <template #footer v-if="!isDetail">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps<{
  mode: "create" | "edit" | "detail";
  rowId?: number | string;
}>();

const visible = defineModel<boolean>("visible");

const isCreate = computed(() => props.mode === "create");
const isDetail = computed(() => props.mode === "detail");

const formData = ref({});

// 监听弹窗打开，判断要不要拉数据
watch(
  () => visible.value,
  (show) => {
    if (show) {
      if (isCreate.value) {
        formData.value = {}; // 新建时清空上次的脏数据
      } else {
        // 去查详情回填...
      }
    }
  },
);
</script>
```

## 踩坑记录

### 1. 路由复用导致数据串台

Vue 的组件复用机制，从编辑页跳到新建页时不会重新创建组件。需要在 `<router-view>` 上加 `:key="$route.fullPath"`，或者在 `watch` 里监听路由变化手动清空表单。

### 2. 不是所有情况都适合合并

如果详情页的 UI 和表单完全不一样（比如加了审批时间轴、操作记录什么的），就别强行合了。老老实实写独立的 Detail.vue，不然一个文件里写几百个 `v-if` 会很恶心。

### 3. 前端禁用不等于后端安全

`disabled` 只能拦住普通用户，拦不住会改 URL 的人。把 `?type=detail` 删掉页面就变成可编辑了，所以后端接口一定要做好权限校验。

## 一点感悟

这次被 mentor 点拨之后，最大的收获是思维上的转变。

以前写代码是"页面驱动"——产品要几个页面，我就建几个文件，满脑子都是复制粘贴。现在开始有点"状态驱动"的意识了，会更关注组件在不同状态下应该有什么行为，而不是纠结于有几个页面。

果然上班和在学校自己瞎写还是不一样，得多和组里的前辈交流，看看别人是怎么设计代码结构的。光靠蛮力堆页面，只会给自己挖坑。

记录一下，继续学习～
