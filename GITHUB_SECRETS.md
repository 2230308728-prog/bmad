# GitHub Secrets 配置指南

本文档说明如何配置 GitHub Actions CI/CD 所需的 Secrets。

## 配置位置

在 GitHub 仓库中，前往：
**Settings** → **Secrets and variables** → **Actions**

点击 **"New repository secret"** 添加以下密钥。

---

## 后端部署 Secrets

### 阿里云容器镜像服务 (ACR)

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `ALIYUN_REGISTRY` | 阿里云容器镜像仓库地址 | `registry.cn-hangzhou.aliyuncs.com` |
| `ALIYUN_USERNAME` | 阿里云用户名 | `your-username` |
| `ALIYUN_PASSWORD` | 阿里云密码 | `your-password` |

**获取方式：**
1. 登录阿里云控制台
2. 进入 **容器镜像服务**
3. 在 **访问凭证** 页面设置固定密码
4. 在 **镜像仓库** 页面获取仓库地址

### ECS 服务器部署

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `ECS_HOST` | ECS 服务器 IP 地址 | `123.56.78.90` |
| `ECS_USERNAME` | ECS 登录用户名 | `root` 或 `ecs-user` |
| `ECS_SSH_KEY` | ECS SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----\n...` |

**获取方式：**
1. 登录阿里云控制台
2. 进入 **云服务器 ECS**
3. 在 **实例** 页面获取公网 IP
4. 生成 SSH 密钥对或使用现有密钥
5. 将私钥内容完整复制到 `ECS_SSH_KEY`（包括 `BEGIN` 和 `END` 行）

**SSH 密钥生成示例：**
```bash
# 生成新的 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions

# 将公钥添加到 ECS
ssh-copy-id -i ~/.ssh/github_actions.pub root@your-ecs-ip

# 查看私钥内容（复制到 GitHub Secrets）
cat ~/.ssh/github_actions
```

---

## 前端部署 Secrets

### 阿里云 OSS (对象存储服务)

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `OSS_ACCESS_KEY_ID` | OSS Access Key ID | `LTAI5t...` |
| `OSS_ACCESS_KEY_SECRET` | OSS Access Key Secret | `xxxxx...` |
| `OSS_BUCKET` | OSS 存储桶名称 | `bmad-frontend` |
| `OSS_ENDPOINT` | OSS 端点地址 | `oss-cn-hangzhou.aliyuncs.com` |

**获取方式：**
1. 登录阿里云控制台
2. 进入 **对象存储 OSS**
3. 创建或选择 Bucket
4. 在 **AccessKey** 页面创建 AccessKey
5. 复制 AccessKey ID 和 Secret

### 阿里云 CDN

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 Access Key ID | 与 OSS 相同 |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 Access Key Secret | 与 OSS 相同 |
| `CDN_DOMAIN` | CDN 加速域名 | `https://cdn.bmad.com` |

**获取方式：**
1. 登录阿里云控制台
2. 进入 **CDN**
3. 添加域名并配置源站为 OSS
4. 复制加速域名

---

## 应用环境变量 Secrets

### 后端应用

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | JWT 密钥 | 随机生成的长字符串 |
| `REDIS_HOST` | Redis 主机地址 | `localhost` 或 Redis 内网地址 |
| `REDIS_PORT` | Redis 端口 | `6379` |

### 前端应用

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `API_URL` | 后端 API 地址 | `https://api.bmad.com` |
| `NEXT_PUBLIC_API_URL` | 公开 API 地址（Next.js） | 与 API_URL 相同 |

---

## 安全最佳实践

### 密钥管理原则

1. **最小权限原则**：为 GitHub Actions 创建专用的 AccessKey，仅授予必要的权限
2. **定期轮换**：每 90 天轮换一次 AccessKey 和 SSH 密钥
3. **独立密钥**：不要使用个人账户的 AccessKey，使用 RAM 子账号
4. **IP 限制**：在阿里云配置 IP 白名单，限制访问来源

### RAM 子账号配置示例

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cr:PushRepository",
        "cr:PullRepository"
      ],
      "Resource": "acs:cr:*:*:repository/bmad-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:ListObjects"
      ],
      "Resource": "acs:oss:*:*:bmad-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cdn:RefreshObjectCaches"
      ],
      "Resource": "*"
    }
  ]
}
```

### 密钥生成工具

**JWT Secret 生成：**
```bash
# 使用 OpenSSL 生成随机密钥
openssl rand -base64 64

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## 验证配置

配置完成后，验证 Secrets 是否正确：

### 验证步骤

1. **测试 CI 工作流**
   ```bash
   # 创建测试分支
   git checkout -b test-ci

   # 提交测试代码
   git push origin test-ci

   # 在 GitHub Actions 页面查看工作流执行状态
   ```

2. **测试后端部署**
   ```bash
   # 合并到 main 分支触发部署
   # 或在 Actions 页面手动触发 "Deploy Backend" 工作流
   ```

3. **测试前端部署**
   ```bash
   # 修改 admin-dashboard/ 目录下的文件
   git push origin main
   ```

### 常见问题排查

**问题 1：Docker 登录失败**
- 检查 `ALIYUN_REGISTRY`、`ALIYUN_USERNAME`、`ALIYUN_PASSWORD` 是否正确
- 确认容器镜像服务已开通且账户有权限

**问题 2：SSH 连接失败**
- 验证 `ECS_HOST` 和 `ECS_USERNAME` 正确
- 确认 `ECS_SSH_KEY` 格式正确（包含 BEGIN 和 END 行）
- 检查 ECS 安全组允许 SSH (端口 22)

**问题 3：OSS 上传失败**
- 检查 OSS Bucket 是否存在且权限正确
- 验证 `OSS_ENDPOINT` 与 Bucket 所在区域一致
- 确认 AccessKey 有 OSS 写权限

**问题 4：CDN 刷新失败**
- 确认 CDN 域名已配置且已备案
- 验证 AccessKey 有 CDN 刷新权限
- 检查 `CDN_DOMAIN` 格式正确（包含 https://）

---

## 参考文档

- [GitHub Actions 加密 Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [阿里云容器镜像服务文档](https://help.aliyun.com/product/60716.html)
- [阿里云 OSS 文档](https://help.aliyun.com/product/31815.html)
- [阿里云 CDN 文档](https://help.aliyun.com/product/27107.html)

---

**最后更新：** 2026-01-13
**维护者：** BMAD DevOps Team
