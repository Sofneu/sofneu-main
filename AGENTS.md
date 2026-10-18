# AGENTS.md — 多国家 Shopify 主题仓库规则

本仓库是一个 Shopify 多国家站点主题。**分支即站点**：`main` 是基准站（AU）兼代码唯一来源，
每个国家站是一条 `main-<国家码小写>` 分支（现有 `main-us` = US 站）。
详细背景与 SOP 见 [docs/multi-country-branching.zh.md](docs/multi-country-branching.zh.md)。

## 分支 → 站点映射

| 分支 | 站点 | 角色 |
|---|---|---|
| `main` | AU（基准站） | 代码唯一来源 + AU 配置 |
| `main-us` | US | 代码只从 `main` 合入 + US 配置 |
| `main-<country>` | 新国家 | 同 `main-us` 模式 |
| `feature/*` | — | 开发分支，PR → `main` |

## 路径规则（最重要的规则）

**共享代码路径**（只存在于 `main`，国家分支永远与 `main` 保持一致）：

```
layout/  sections/*.liquid  snippets/  assets/  blocks/  locales/  config/settings_schema.json
```

**隔离配置路径**（每个国家分支各自维护，冲突时保留该国版本）：

```
config/settings_data.json  sections/header-group.json  sections/footer-group.json  templates/*.json
```

## 操作规则

1. **改代码**：只在 `main`（或 `feature/*` → PR → `main`）上改，然后逐条合入各国家分支：
   ```bash
   git switch main && git pull
   # ...修改代码...
   # ⚠️ 到此暂停：等人工 review 后的明确指令，再继续下面的 commit / push（见规则 7）
   git commit && git push
   git switch main-us && git pull && git merge main && git push   # 每个国家分支重复这组
   ```
2. **改某国配置/模板内容**：改该国分支（`main-<国家>`）。这些改动通常由运营在
   Shopify 主题编辑器完成并自动 commit 回分支，不要在本地代改，除非明确要求。
3. **合并方向永远是 `main` → `main-<国家>`**。禁止反向合并或把一国配置带入另一分支。
4. **合并冲突处理**：配置路径的冲突由 `.gitattributes` 的 `merge=ours` 自动解决
   （保留目标国家分支版本），不要手工"取 main 的版本"覆盖某国配置。
   **纯代码路径出现冲突 = 有人在线上改过代码，属于流程违规，停下来上报，不要擅自和解。**
5. **克隆后必须先执行**：`git config merge.ours.driver true`（否则 merge=ours 不生效）。
6. **新增国家** = 新增 `main-<国家>` 分支，严格按
   [docs/multi-country-branching.zh.md](docs/multi-country-branching.zh.md) 第 4 节 SOP 执行
   （从 `main` 拉分支 → 只覆盖该国配置路径 → 校验代码路径与 `main` 零差异 → 连接店铺）。
7. **提交纪律**：完成任何修改后**停在本地工作区，不要自行 `commit` / `push`，也不要自行
   合入国家分支**。先汇报改动内容，等待人工 review 后的明确指令，再执行第 1 条的提交与
   合入流程。

## 禁止事项

- ❌ 未经人工 review 及明确指令就 commit / push（改动先留在工作区，见操作规则 7）
- ❌ 在 `main-<国家>` 分支上直接修改共享代码路径（那是 `main` 的独占领地）
- ❌ force push 或改写 `main` / `main-<国家>` 的历史（Shopify 集成按 commit 追踪，会断同步；回滚一律 `git revert`）
- ❌ 修改 `.gitattributes` 中的 `merge=ours` 规则（除非整个分支模型变更）
- ❌ 用 `shopify theme dev --theme` 指向已连接集成的线上主题（会与集成双向打架；预览用沙箱）
- ❌ 把一条分支连接到多个 Shopify 主题

## 快速判断：这个改动该在哪条分支做？

| 改动内容 | 分支 |
|---|---|
| 新 section / snippet / 修 bug / 改样式 / 改 JS | `main`（再合入各国） |
| 改某国的首页排版、文案、公告栏、页脚 | 该国的 `main-<国家>` 分支（通常由编辑器自动完成） |
| 所有国家都要的翻译新增 | `main` 的 `locales/`（再合入各国） |
| 只有某国要的翻译差异 | 上报讨论，不要私自分叉 `locales/`（见已知例外） |
