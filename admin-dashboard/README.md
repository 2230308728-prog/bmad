# Admin Dashboard

管理后台项目 - 基于 Next.js 15 + React 19 + TypeScript 5 + shadcn/ui

## 技术栈

- **框架**: Next.js 16.1.1 (App Router, Turbopack)
- **UI**: React 19.2.3
- **语言**: TypeScript 5.9.3 (strict mode)
- **样式**: Tailwind CSS 4
- **组件库**: shadcn/ui (Radix UI + Tailwind CSS)
- **代码质量**: ESLint 9, Prettier

## 项目结构

```
admin-dashboard/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 认证路由组
│   ├── (dashboard)/         # 主应用路由组
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── ui/                  # shadcn/ui 组件
│   ├── layout/              # 布局组件
│   └── features/            # 功能组件
├── lib/                     # 工具函数和客户端
│   ├── api-client.ts        # API 客户端
│   ├── auth.ts              # 认证工具
│   └── utils.ts             # 通用工具
├── types/                   # TypeScript 类型定义
│   └── index.ts             # 全局类型
├── public/                  # 静态资源
└── .prettierrc              # Prettier 配置
```

## 开始使用

### 开发环境要求

- Node.js 20+ LTS
- npm 11+

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3001](http://localhost:3001) 查看应用

### 构建生产版本

```bash
npm run build
npm start
```

### 代码检查

```bash
# ESLint 检查
npm run lint
```

## 开发规范

### TypeScript

- 严格模式已启用 (`strict: true`)
- 禁止使用 `any` 类型
- 使用 `unknown` 处理动态数据
- 显式类型注解

### 命名约定

- **React 组件**: PascalCase (`UserCard.tsx`)
- **函数/变量**: camelCase (`getUserData`)
- **类型/接口**: PascalCase (`UserData`)

### 导入顺序

1. 外部库
2. 内部模块 (@/...)
3. 类型导入
4. 相对路径

## 当前状态

**✅ Epic 1: 项目初始化与基础设施** (进行中)

- [x] Story 1.1: 初始化 Next.js 15 管理后台项目
- [ ] Story 1.2: 初始化 NestJS 后端 API 项目
- [ ] Story 1.3-1.8: 配置其他基础设施

## 计划功能

- **Epic 2**: 用户认证系统 (管理员登录、微信登录)
- **Epic 3**: 产品发现与管理
- **Epic 4**: 预订与支付
- **Epic 5**: 订单管理与通知
- **Epic 6**: 用户管理与分析

## 相关文档

- [技术架构](../../_bmad-output/planning-artifacts/architecture.md)
- [Epic 详细规划](../../_bmad-output/planning-artifacts/epics.md)
- [UX 设计规范](../../_bmad-output/planning-artifacts/ux-design-specification.md)
