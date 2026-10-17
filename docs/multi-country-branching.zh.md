# 多国家分支模型：main + main-<国家>

> 一句话：**分支即站点**。`main` 是基准站（AU）兼代码唯一来源；每新增一个国家 =
> 新增一条 `main-<国家>` 分支。代码只从 `main` 向外流动（一次修改，所有国家生效）；
> 配置（全局设置、公告/页脚、模板内容）各分支独立，由线上主题编辑器直接修改、
> Shopify GitHub 集成自动 commit 回各自分支。没有构建步骤，分支本身就是该国完整主题。

## 1. 分支结构

| 分支 | 站点 | 连接 | 代码角色 | 配置角色 |
|---|---|---|---|---|
| `main` | AU（基准站） | `a53a82-be.myshopify.com` 主题 `153564315787` | **唯一来源**：一切代码改动只进这里 | AU 配置事实来源 |
| `main-us` | US | `fpay3g-yr.myshopify.com` 主题 `156990406813` | 只从 `main` 合入，禁止直接改代码 | US 配置事实来源 |
| `main-<country>` | 未来新国家 | 各自店铺主题 | 同上 | 该国配置事实来源 |
| `feature/*` | 开发分支 | 不连接 | PR → `main` | — |

**命名规则**：`main-<ISO 国家码小写>`，如 `main-us`、`main-uk`、`main-de`。
一条分支只允许连接一个店铺的一个主题（一个主题也只能连一条分支）。

## 2. 代码共享、配置隔离（核心规则）

### 2.1 路径划分

| 路径 | 类别 | 合并冲突时取向 | 说明 |
|---|---|---|---|
| `layout/` `sections/*.liquid` `snippets/` `assets/` `blocks/` `locales/` `config/settings_schema.json` | **代码（全站共享）** | 永远取 `main` | 国家分支不允许有自己的代码版本。某国需要不同行为时，用 section 设置 / 模板内容区分，**不分叉代码** |
| `config/settings_data.json` | 配置（各国隔离） | 取目标分支自己 | 主题全局设置（颜色、字体、动效等） |
| `sections/header-group.json` `sections/footer-group.json` | 配置（各国隔离） | 取目标分支自己 | 公告栏 / 页脚内容 |
| `templates/*.json` | 混合（隔离优先） | 冲突时取目标分支自己 | 未定制过的模板自动跟随 `main` 更新；某国定制过的模板不会再自动吃到 `main` 的改版，需人工判断移植（见 3.4） |

### 2.2 实现：`.gitattributes` + `merge=ours`

仓库根目录 `.gitattributes`（已提交，对所有国家分支通用）：

```gitattributes
# 纯配置：冲突时保留目标国家分支自己的
config/settings_data.json merge=ours
sections/header-group.json merge=ours
sections/footer-group.json merge=ours
# 模板：冲突（= 该国定制且 main 也改了）时保留该国定制
templates/*.json merge=ours
```

原理：`merge=ours` 里的 **ours 指被合并进入的目标分支**，与方向无关。
因此同一份 `.gitattributes` 对 `main → main-us`、`main → main-uk` 全部适用，
**新增国家不需要改它**。

### 2.3 前置条件：注册合并驱动（每个克隆一次）

```bash
git config merge.ours.driver true
```

未注册时，"两边都改过"的文件会留下冲突标记，不会自动取目标分支版本。
新同事 clone 后、CI 机器上都要执行（CI 已写入 workflow）。

### 2.4 三方合并行为矩阵（`git merge main` 于任意 `main-<国家>` 分支）

| 场景 | 结果 |
|---|---|
| 只有 `main` 改了（你的代码改动） | 自动带入国家分支 |
| 只有国家分支改了（该国编辑器的自动 commit） | 原样保留 |
| 两边都改，文件在隔离清单内 | `merge=ours` 自动保留国家分支版本 |
| 两边都改，文件是纯代码路径 | **合并失败告警** = 有人绕过流程在线上改了代码，需人工修复 |

## 3. 日常流程

### 3.1 改代码（一次修改，所有国家生效）

```bash
git switch main && git pull        # 先拉最新，编辑器可能刚落了 commit
# ...修改代码...
git add -A && git commit -m "..."
git push                           # AU 站即时生效

# 分发到各国家站（每站一组）
git switch main-us && git pull     # 先拿该国编辑器的新 commit
git merge main                     # 代码自动流入，配置自动保留
git push                           # US 站生效
# 新国家重复后三行
```

开发周期长时用 `feature/*` 分支，合并回 `main` 前先 rebase。

### 3.2 改配置

线上主题编辑器直接改 → Shopify 自动 commit 回该国所连分支。
**不需要任何本地操作**；回滚 = revert 对应的自动 commit，或在编辑器里改回。

### 3.3 预览开发

`git switch <分支>` → `shopify theme dev`（沙箱主题）。
**不要**用 `--theme` 指向已连接的线上主题（CLI 与集成共用分支会双向打架）。

### 3.4 查看 / 移植某国定制

```bash
git diff --name-only main main-us -- templates/   # 该国定制过的模板清单
```

`main` 上改版了某国定制过的模板时，该国**不会**自动更新（`merge=ours` 保住该国版本）。
需要人工 diff 判断是否移植；上 CI 后机器人 PR 会自动列出这些文件提醒。

## 4. 新增国家 SOP（= 增加一条分支）

前提：新国家店铺可用、已有线上主题。

1. `git switch main && git pull`（确保基于最新 `main`）
2. `git switch -c main-<country>`
3. 把新国家线上主题拉到临时目录：
   `shopify theme pull --store <新店铺> --path /tmp/<country>-live`
4. 用临时目录内容**只覆盖配置类路径**：
   `config/settings_data.json`、`sections/header-group.json`、`sections/footer-group.json`、
   `templates/`（含该国独有模板的新增、缺失模板的删除）
5. **校验代码路径 = `main` 版本**（必须为空输出）：
   ```bash
   git diff main --stat -- layout "sections/*.liquid" snippets assets blocks locales config/settings_schema.json
   ```
   不为空就把对应文件还原：`git checkout main -- <文件>`
6. 提交基线：`git commit -am "main-<country> baseline: live config & templates"`
7. `git push -u origin main-<country>`
8. 新店铺后台：Online Store → Themes → Add theme → Connect from GitHub →
   选本仓库与 `main-<country>` 分支。**连接会在主题库新建主题（以分支内容为准），
   不会动现有线上主题**
9. 预览验证后低峰时段 Publish；旧线上主题保留在库中不删，作为一键回滚
10. 在 CI 同步 workflow 的国家矩阵里加上该分支（见第 6 节）

## 5. 禁止事项

- 在 `main-<国家>` 分支上直接改代码（只允许：合入 `main` + 编辑器配置 commit）
- 对 `main` / `main-<国家>` 做 force push 或改写历史（集成按 commit 追踪，会断同步；回滚一律 `revert`）
- 在 Shopify admin 的"编辑代码"里直接改文件（绕过 review，员工权限建议关闭该入口）
- 一条分支连接多个主题（编辑器 commit 会互相覆盖，参见 Shopify/cli#3509）
- CLI `shopify theme dev --theme` 指向已连接主题（见 Shopify/shopify-cli#2452）

## 6. CI：main → 各国家分支自动同步机器人

`push` 到 `main` 触发，对每条国家分支（矩阵）执行合并并自动开 PR：
标题 `sync: main → <分支> @ <短SHA>`；正文两份清单——
**已自动更新**（本次带入的代码/模板）与**保留该国定制**（被 ours 保住的文件，人工判断移植）。
纯代码路径冲突 → 流程失败告警。

```yaml
name: sync main to countries
on:
  push: { branches: [main] }
permissions: { contents: write, pull-requests: write }
jobs:
  sync:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        branch: [main-us]   # 新增国家在这里加分支名
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: git config merge.ours.driver true
      - run: git config user.email bot@internal && git config user.name sync-bot
      - run: |
          git switch ${{ matrix.branch }}
          git merge main --no-ff -m "sync: main → ${{ matrix.branch }}"  # 纯代码路径冲突在此失败
      - run: git diff --name-only main ${{ matrix.branch }} -- templates/ config/ sections/ > kept.txt
      - uses: peter-evans/create-pull-request@v6
        with: { branch: sync/main-to-${{ matrix.branch }}, title: "sync: main → ${{ matrix.branch }}", body_path: kept.txt }
```

阶段一人工点合并（审核检查点）；稳定后可对"无保留定制清单"的 PR 开自动合并。
可选 PR 检查：主题结构完整性（`layout/theme.liquid` 等存在）、`shopify theme check`。

## 7. 回滚

| 场景 | 操作 |
|---|---|
| 代码回滚 | `main` 上 `git revert` 后 push，各国随同步生效 |
| 配置回滚 | 编辑器改回，或 revert 对应的 Shopify 自动 commit |
| 切换出错 | 旧主题原样保留在主题库，一键重新 Publish 即回滚，分钟级 |

## 8. 当前连接信息

| 站点 | 店铺 | 主题 ID | 分支 |
|---|---|---|---|
| AU | `a53a82-be.myshopify.com` | `153564315787` | `main` |
| US | `fpay3g-yr.myshopify.com` | `156990406813` | `main-us` |

两店各自在后台独立授权 Shopify GitHub App，指向同一仓库。
App 需在 GitHub 上安装到仓库所属组织/账户并授权本仓库，否则连接时仓库列表为空。

## 9. 已知待处理

- `locales` 例外：`main-us` 的 `locales/en.default.json` 带一条 US 专属
  `shipping_policy_html` 文案（`main` 上为空）。locales 属共享代码路径，下次
  `main` 改动 locales 合并时会覆盖掉它。二选一：
  ① 把该文案同步设置到 `main`（推荐，值是通用英文，AU 可共用）；
  ② 把 `locales/` 加入 `.gitattributes` 隔离清单（代价：`main` 新增的翻译键不再自动同步到各国）。
