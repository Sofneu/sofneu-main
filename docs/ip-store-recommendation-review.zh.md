# IP 店铺推荐弹窗：审核范围与验收

## 本次交付

只增加 IP 识别推荐弹窗以及首次关闭后的第一次普通加购提醒。按店主要求，本次不包含统计接入、统计开关或统计发布代码；不改 Google、GA、GTM、广告或转化设置。

| IP 地区 | 所在站 | 行为 |
|---|---|---|
| US | AU | 建议切美国店 |
| AU | US | 建议切澳洲店 |
| NZ | US | 建议切澳洲店并使用 country=NZ |
| 地区与店铺匹配、其他地区、识别失败 | 任意 | 不提示，不拦加购 |

不会自动跳转。用户点击原生链接确认切站。点击首次关闭按钮后，在商品页或快速选购任一入口第一次有效普通加购时再提醒，两种入口共享一次提醒状态。明确留站后不再提醒；第二次关闭或留站继续原加购一次。切站取消待执行的加购，购物车、商品规格及数量不跨店转移。Shop Pay 等快捷支付没有增加二次提醒。

## 文件边界

- 新增 assets/store-region-prompt.js、assets/store-region-rules.js、assets/store-region-prompt.css、snippets/store-region-prompt.liquid。
- layout/theme.liquid 只增加该 snippet 的调用。
- assets/product-form.js 与 assets/xt-quick-add-drawer.js 各增加一个加购前检查；弹窗失败时放行，保留原有加购请求和数量逻辑。
- config/settings_schema.json 只增加 Enable IP store recommendation（默认关闭）、Confirm on first add after dismissing recommendation（默认开启）。其他设置原文保留。
- CSS 选择器限定在 #sofneu-region-prompt 内，不修改页头、图标、购物车角标或其他弹窗样式。
- tests/ 下两个 Node 测试文件用于本功能离线验证；本说明是审核交接材料。

不修改 config/settings_data.json、header/footer-group、templates、locales、原国家切换文件、商品数据、政策、库存及配送设置。现有国家菜单无新增监听、无链接改写。弹窗仅读取现有菜单目标链接，保留原生点击跳转。

## 当前 GitHub 配置基线（2026-11-06）

- origin/main：0a227c4e4724ce98811c7909ff91fbd3cc5f73f7。
- origin/main-us：359bc9ef80e291ada68b14a10273cc2894af4a70。
- 两站 enable_store_switch=true，AU 域名 https://sofneu.com.au/，US 域名 https://sofneu.com/。
- AU 当前店铺采用已有 schema 的默认 AU；US 配置明确为 US。
- 两站尚未配置新弹窗开关。合并本代码后默认不启用，需在两国主题编辑器分别启用；不以本地 settings_data 覆盖运营配置。
- 本次修改的四个现有共享文件在两国基线上逐字节一致。美国已有 locale 文案差异不在本次范围。

## 已完成检查

- 14 项离线功能测试通过：推荐规则、两处入口共享提醒、留站恢复、切站取消、无效选项、异常存储、识别失败及不调用分析接口。
- 新增和修改的 JS 语法检查、git diff --check 通过。
- 原国家切换与国家配置文件逐字节保持基线。没有统计发布、gtag、dataLayer 或跨域跟踪标记。
- 店主已确认预览体验无问题。此前两国开发预览验证过商品页及手机 Quick Add 第二提醒，澳洲验证过实际留站加购一次。

执行：node --test tests/store-region-rules.test.cjs tests/store-region-flow.test.cjs

## 必须保留的验收边界

- 美国实际加购到配送结账、新西兰运费及完整结账尚未完成最终实测，不得标记全部通过。
- 本地开发域名曾出现 Shopify 离站提示；店主反馈正式域名的未发布预览跳转正常。本次不绕过平台确认页、不改旧菜单。
- IP 查询来自 api.country.is，超时或失败不弹窗；存在外部服务可用性依赖。浏览器会向该服务发起请求，本功能不保存完整 IP。
- 既有主题静态检查存在基线问题；应以新增问题比较判断，不能声称全主题零错误。

## 审核与发布顺序

本次根据店主明确要求推送审核分支并创建 PR，暂不合并，暂不更新 main/main-us 或启用正式主题。此审核交付优先于 AGENTS.md 中通常直接在 main 提交的流程。

审核重点：只包含上述功能文件、加购放行和恢复正常、旧菜单不变、配置与美国 locale 未覆盖、没有统计代码。

通过后先更新 main，再按 main → main-us 单向同步；同步时重新读取最新国家配置并比对，不能把 merge=ours 当作所有情形的绝对保护。新弹窗需分别启用；开关关闭可快速停用。代码回退用 revert，禁止 force push 或整体旧主题覆盖当前配置。
