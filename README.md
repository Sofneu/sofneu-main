# Sofneu 主题仓库

Sofneu Shopify 多国家站点主题。**分支即站点**，无构建步骤，分支本身就是该国完整主题，
通过 Shopify 官方 GitHub 集成与各店铺双向同步。

| 分支 | 站点 | 店铺 |
|---|---|---|
| `main` | AU（基准站，代码唯一来源） | `a53a82-be.myshopify.com` |
| `main-us` | US | `fpay3g-yr.myshopify.com` |
| `main-<国家>` | 新国家 | 新增国家 = 新增分支，见文档第 4 节 SOP |

## 核心规则（一句话版）

- **代码共享**：`layout/`、`sections/*.liquid`、`snippets/`、`assets/`、`blocks/`、`locales/`、`settings_schema.json` 只在 `main` 上改，逐条合入各国家分支
- **配置隔离**：`config/settings_data.json`、header/footer-group、`templates/*.json` 各国分支独立，由线上主题编辑器修改并自动 commit 回各自分支
- 合并方向永远 `main` → `main-<国家>`；clone 后先执行 `git config merge.ours.driver true`

## 文档

- [docs/multi-country-branching.zh.md](docs/multi-country-branching.zh.md) — 完整方案：分支模型、路径划分、合并策略、日常流程、新增国家 SOP、CI 设计、回滚
- [AGENTS.md](AGENTS.md) — AI 助手 / 协作者操作规则速查
