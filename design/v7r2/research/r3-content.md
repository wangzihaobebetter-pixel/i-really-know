# 内容组织/阅读型：信息架构与导航逻辑深挖

**研究范围**：Notion、Speechify、Structured、Blinkist 四款 App 的信息架构与导航逻辑。
**目标**：为一款学习验证类产品的 UI 方案提供可套用的证据。
**数据采集时间**：2026-08-25；所有结论附 URL；查不到的明确写「不确定」。

---

## Notion（App Store 89,863 条评分，参考：https://en.wikipedia.org/wiki/Notion_(productivity_software)）

### 1 信息架构

**核心模型：一切皆 block，page 是 block 的容器，database 是 page 的多视图集合。**

- 「Notes consist of "blocks," which make up every line or paragraph. These can contain text, images, subpages, and databases.」（Wikipedia：https://en.wikipedia.org/wiki/Notion_(productivity_software)）
- 官方键盘快捷键页明确说 **"Everything in Notion is a block — from a line of type (or paragraph) to an image or embed."**（https://www.notion.com/help/keyboard-shortcuts）
- **数据库 = page 的集合**：官方文档原话 "Databases in Notion are collections of pages. Every item you enter into your database is a Notion page."（https://www.notion.com/help/intro-to-databases）—— 这是「一张表/一个 board 的每一行/每一张卡片 = 一篇 Notion 页面」的本质。
- **page 可无限嵌套**："Organize your work on infinite levels — you can nest pages inside other pages with no limit."（https://www.notion.com/help/navigate-with-the-sidebar）
- 顶级容器有三层：Workspace → Teamspace（Open/Closed/Private，Business 及以上才支持 Private）→ Page → Block（https://www.notion.com/help/intro-to-teamspaces）
- 官方建议 "Most likely, you'll only need one default teamspace, and we'd recommend no more than three default, even for large workspaces." —— 即不鼓励把 Teamspace 拆碎（https://www.notion.com/help/intro-to-teamspaces）

**导航形状由模型直接决定**：
- 因为 block 即一切，**没有「文档/数据库/任务」三种对象，只有 page 一种对象，只是渲染方式不同**——同一份数据可以是 page、是 table 行、是 board 卡片、是 calendar 事件、是 timeline 横条、是 gallery 缩略图、是 form 输入口（https://www.notion.com/help/views-filters-and-sorts）
- 同一个 database 可以有多个 view，每个 view 独立保存 filter/sort/group/conditional color/打开方式（"Each database view has its own settings"）
- 页面打开方式有三档：side peek（右侧抽屉）、center peek（中间模态）、full page。Table/Board/List/Timeline 默认 side peek，Gallery/Calendar 默认 center peek（同上）

### 2 移动端 vs 桌面端

桌面端有左侧 sidebar（cmd/ctrl + \ 切换），里面是一组**顶级 tab**（每个 tab 一个图标 + 自己的内容）：Workspace switcher、Search、Home、Chats with Notion AI、Meetings、Inbox、Library；底部还有「+ new chat/page/meeting note/database」快捷入口（https://www.notion.com/help/navigate-with-the-sidebar）。

**移动端的具体变形，我没能找到 Notion 官方 help center 的 mobile 专属文章**——所有 `notion.com/help/mobile*`、`notion.com/help/working-with-mobile-and-tablet-apps` 类 URL 都返回 404，只有一个产品下载落地页 https://www.notion.com/mobile 提到了「For iOS / For Android」并链接到 App Store/Play Store。**移动端 sidebar → bottom tab 的具体形态没有官方文档可引用，不确定。**

（可信推测依据来自第三方常识与 Notion 的纯 page/block 模型：sidebar 压缩成底栏，page 树折叠成回退栈，database 在手机上 Table 会自动退化为 List——但**这条只能算「不确定」，写 UI 方案前请直接对照最新版本 App 截图或自己跑一遍**。）

### 3 一次核心会话（打开一篇 page → 完成一次操作）

**桌面**：侧栏选中 page → 中央正文铺满 → 顶部一行小图标（share / comments / updates / favorites / •••），第一行是 emoji + 标题，下方是任意 block 序列 → 任何空行输 `/` 唤出 slash menu → 选中 block 类型即可插入 → 选中文本浮出 mini formatting toolbar。

**打开 database 行**：默认 right-side peek（半屏抽屉），左侧 db 仍可滚动浏览；点卡片中央 → center peek；点卡片顶 ⤡ → 切到 full page（同上 views 文档）。

### 4 可见控件的取舍

- **常驻**：顶部 page 标题、分享按钮、评论、⭐；每个 block 左边 hover 出 ⋮⋮ 拖拽柄；database 顶部 sticky 的 view tabs、settings 按钮、+ New。
- **藏进菜单**：所有格式化（粗体/斜体/code/链接）由 `/command` 或 markdown 触发（输入 `**`、`#`、`>`、`[]`、`[[`、`@` 即时变形），不是 toolbar 按钮（https://www.notion.com/help/keyboard-shortcuts）。
- **核心动作「新建」**：每个 sidebar tab 底部都有一个 `+ new` 行（chat/page/meeting note/database 各自独立入口），desktop 上是 4 个并排按钮，移动端**应该**是 bottom tab + FAB 模式但官方文档没确认，**不确定**。
- **FAB**：Notion 桌面/web 没有浮动 FAB；所有创建动作都走 sidebar 入口或 `/` 命令。这是 Notion 跟 Structured / Speechify 最大的一个 UI 哲学差。

### 5 首次使用与空状态

新用户登录后落在**一个空 workspace**，左边只有 Workspace switcher + Search + 一个空的侧栏 + 右下角暗示「按 + 创建你的第一个 page」。**没有任何模板强推**——Notion 的策略是给 100% 自由度，空状态文案基本是 "Press / to start" 或类似的最轻提示；复杂功能靠用户自己探索或装模板。

Wikipedia 提到 Notion 用 templates + Notion AI 做教育（"Notion uses AI and a library of free and fee-based templates."），但 onboarding 入门流程页面（"building basics"）URL 都 404 了，**模板卡片的具体形态不确定**。

### 6 文本排版

- 正文有正文样式 block，无论文档级「字号/行高/列宽」配置——**Notion 没有显式的 typography control**；宽度由 viewport + page 内 `column layout` 决定。
- column layout：page 可分 2-6 列（https://www.notion.com/help/column-layout slug 在多处链接里被引用，但具体页面**没抓到正文，不确定**当前是否仍是 column 2/3/4/5/6 切换器）。
- 朗读高亮：不适用——Notion 自己不朗读。但 Notion AI 有 inline actions：空格或选中文本后弹出 AI 菜单，可改写、翻译、缩短、做总结（"highlight text in a page or hit space in a page and have Notion AI make edits..."，https://www.notion.com/help/notion-ai-faqs）。

### 7 动效与转场

不确定——官方帮助文档几乎没有 motion/animation 章节。能确认的是：
- Slash menu 是即时 inline 浮层，无 modal。
- Side peek 抽屉是水平 slide-in（这是 iOS 标准做法）。
- 折叠/展开 toggle 是高度自适应的 0.2–0.3s ease-in-out（这是 web/Notion 横滑式动画的默认推测，**没有官方文档明示**）。

### 8 被批评的地方

Wikipedia 引用的批评集中在：
- **Notion Mail 2026 年 9 月 22 日下线**，官方承认转向 agent-based email workflows（https://en.wikipedia.org/wiki/Notion_(productivity_software)）。
- 长期被吐槽「启动慢、客户端重」——Wikipedia 没直接引用，**这是社区常识，没有可信 teardown URL 可引**，不确定具体出处。
- 学习曲线陡——「everything is a block」对老用户是 power，对新用户是空白页焦虑。

### 可偷的模式（可执行规则）

1. **「一切皆同一种对象」的统一模型**——你只有「卡片/页」一种东西，靠 view（表格/时间线/列表/画廊）变形，不必为不同内容类型建不同的 IA。Notion 把这个推到极端，代价是空状态，但好处是 view 之间转换零成本。
2. **view = filter + sort + group + open-mode 的打包快照**——同一份数据上做"今日高优/本周所有/只看逾期"无需复制 db，加 view 即可。每一档 view 独立保存设置，给用户一个"同一份数据的多个镜头"。
3. **侧栏顶级 tab 化**（Home / AI / Meetings / Inbox / Library）而不是单一长列表，把"工作流场景"作为一级导航，比按数据类型分类更贴用户。
4. **`/` 命令 + markdown 触发**取代 toolbar，强制让动作"长在键盘上"——适合 power 用户，对新手是负担。
5. **side peek vs center peek vs full page** 三档打开方式，给同一行数据三种深度递进。

### 不适合我们的地方

1. **空状态几乎为零**——Notion 假设用户知道要建什么。学习验证类产品需要更多引导，留白是负担。
2. **侧栏无限层级 + 没有强力的 nav 兜底**——一旦 page 树深了，移动端回退会很痛。我们的产品层级更浅，可以不抄。
3. **Notion 自身不朗读**——所以"学习验证+朗读"的 pattern 在 Notion 里找不到直接证据；这块必须靠 Speechify。

---

## Speechify（App Store 517,576 条评分，参考：https://en.wikipedia.org/wiki/Speechify）

### 1 信息架构

**核心模型：内容（document/URL/照片/剪贴板文本）→ 渲染成可朗读的「current item」，控制面板始终是「内容 + 一个浮在内容上的 mini player」。**

- Speechify 自我定位 **"Voice AI Productivity Assistant"**——把 TTS、Voice Typing、AI note taker、AI podcast、Voice AI Assistant 装进同一个 shell（https://speechify.com/）。
- 内容来源四路：(1) 用户上传文件 PDF/EPUB/DOCX/XLSX/TXT，(2) 粘贴文本，(3) 拍照 OCR（"scan physical printed text"，https://speechify.com/text-to-speech-online/），(4) web 链接。
- 内容被存进用户的 **library**（"A free Speechify account saves your documents and syncs your library across devices."），Speechify "remembers your place so you can listen to long reads across multiple sessions on any device."
- 跨平台五种形态：Web app / iOS / Android / native Mac app / Chrome extension（https://speechify.com/ios/）。
- **Speechify 的「navigation 形状」由两个决定**：(a) library 是文档网格/列表（横向坐标），(b) reader 是单篇沉浸式纵向滚动（纵向坐标）；其余功能（voice typing、AI assistant）作为补充 tab 出现。

### 2 移动端 vs 桌面端

- **桌面 Web**：`text-to-speech-online` 是 paste/upload textbox + voice 选择器 + 速度滑块 + play/pause + Download 按钮，单页直达（https://speechify.com/text-to-speech-online/）。
- **桌面 Mac**：是**菜单栏 app + 全局快捷键 + 截图 OCR**——不是常驻窗口。"you can listen with the Speechify Mac app by highlighting text and pressing ⌥ A or using screenshot to listen with ⌥ X, or by accessing these options from the menu bar icon." 音频播放时浮一个 **mini player menu**，可以从那里调 speed/voice（https://speechify.com/text-to-speech-mac/）。
- **Voice Typing（Mac）**：按住 Fn/globe 说话 = 短句模式；按 Fn+Space 切换 = 长段免提模式；可用 right Alt（Windows）作为等价物。所有快捷键可在 Settings 自定义（https://speechify.com/voice-typing-dictation/）。
- **移动 iOS/Android**：uploads 是入口主按钮。OCR 是核心差异化（iOS 单反 Android 都能拍照扫书页）。
- 跨设备切换："Speechify works seamlessly across computers, tablets, and smartphones... you can seamlessly switch between devices and keep listening wherever you go."（https://speechify.com/ios/）——这一句直接确认 Speechify 是以「同一篇文档 + 同一播放进度」为同步单位。

### 3 一次核心会话（打开一篇 → 听完一篇）

Web 端路径：进入 /text-to-speech-online → 顶部 textbox（或 "Upload a File" 按钮）→ 选文件/粘贴文本 → 选 voice（顶部 filter：language / gender / age）→ 按 play → 文本区出现逐词高亮（speech marks），音频同步播 → 用 speed 滑块调速（"up to several times faster than average reading speed"，https://speechify.com/text-to-speech-online/）→ 顶部 Download 按钮导出 mp3。

移动端推测（基于多源拼接，**不是直接证据**）：底部 tab 含 Library / Reader / Settings（具体形态**不确定**），点击 Library 中的文档进入 Reader，Reader 是一个全屏文本视图 + 顶部悬浮 speed/voice 控件 + 底部 play/pause/skip。

### 4 可见控件的取舍（核心：mini player）

**Mac 上的 mini player 是 Speechify "always-on, never-leave-page" 范式的最具体实现**（https://speechify.com/text-to-speech-mac/）：
- 触发：从菜单栏图标、从 ⌥A 全局热键、从 ⌥X 截图 OCR。
- 形态：「mini player menu while audio is playing」，浮在 macOS 菜单栏下方，不抢占任何 app 的窗口焦点。
- 控件：voice 选择、speed 调整。
- 消失规则：未明说，但 Speechify 的逻辑是**音频停 = mini player 收起来**；标准 macOS 菜单栏 app 行为。

**iOS / Web reader 上的播放器是「永远在内容上方、不挡内容」**：
- Web TTS 页本身就是 textbox 占满 + 控件贴顶部一行；播放时文本逐词高亮（来自 API 的 `speech marks` 能力：https://docs.speechify.ai/ —— "Word-level timestamps for highlighting, captions, and audio-text sync."）。
- 「reader text is on screen, controls float over it」——这是 Speechify 的核心承诺，没有直接 URL 引到 iOS reader 截图（**不确定** iOS 是否有 FAB-style mini player，但 macOS 菜单栏 + Web 顶部控件已经证明这套架构）。

### 5 首次使用与空状态

- 落点：Onboarding URL 有，但只对 source 参数敏感（`source_page=_ios&source_category=ios`），证明它有 per-platform onboarding（https://speechify.com/ios/）。
- 第一次开 iOS app 的常规路径（推测，依据 Speechify 的 TTS 页文字 "Upload a File to have the tool read documents out loud instead of pasting text. You can upload any document format such as PDF, DOCX, TXT, EPUB"，加上 source_page 参数化 onboarding）：选 listening preferences → 弹免费试用 → 进入 Library（空）→ 一个大大的 `Upload` 按钮在屏幕中央 → 用户可以扫页/粘贴/上传。**具体 onboarding 截图没找到，不确定**。
- 6,500+ titles（Blinkist 是这个数）；Speechify 的库是用户自产内容（用户自己的 PDF/扫描），不是预置 content。**这意味着空状态是 Speechify 最大的 UX 考验**——他们用 OCR + 浏览器扩展 + 系统全局热键来保证"用户一开始没东西也能用"。

### 6 文本排版（这是 Speechify 套路的核心）

**Web TTS 页**（https://speechify.com/text-to-speech-online/）：
- textbox 占满上方、播放控件贴顶部一行——典型的"内容优先、控件贴边"。
- 高亮实现：API 返回的 word-level timestamps + 客户端按时间刷当前词的 background color。**Speechify 的竞争力之一就是高亮的精度**——"text highlighting features that make it easier to follow along, which NaturalReader struggles with"（https://speechify.com/blog/speechify-vs-natural-reader/）。
- 速度："Use the speed selector to slow the voice down for language learning and proofreading, or speed it up to get through long documents faster — up to several times faster than average reading speed, while the audio stays clear and natural."
- voice 数量：**1,000+ voices / 60+ languages**，含 Snoop Dogg / Gwyneth Paltrow 名人声线（同上）。

**iOS reader 的排版**没抓到具体字号/行宽——**不确定**。但 Speechify 一致的设计语言是「字号偏大、行高宽松、当前词背景高亮、控件远离文字区域」。

### 7 动效与转场

- 文本高亮切换是逐词级的 fade/crossfade（web TTS 演示），不是 scroll-jacking（不是那种逐行 auto-scroll）；用户文字位置不动，光标/高亮在字上跑。
- 控件隐藏/出现：mini player 用 macOS 标准菜单栏 popover 动效（snappy、不夸张）。
- 跨设备：进度"remember your place"，意味着同步是用 listen position（offset / sentence index），不是滚动像素。
- **iOS reader 的翻页/转场动效不确定**，没有可信截图或文档。

### 8 被批评的地方

- 我没找到一篇聚焦 Speechify 移动端 reader UI 的公开 teardown。所有 teardown 链接（Growth.Design / UX Collective / Smashing）要么 404 要么要订阅——Growth.Design 的 Blinkist 那个 teardown 标题存在但需要订阅（https://web.archive.org/web/20250105122659/https://growth.design/case-studies/blinkist-user-onboarding）。
- 历史批评点（来自 Wikipedia references + Speechify 自家页面文字暗示）：
  - **免费版功能受限**："not all of the features are available with the free version. While the free version is impressive, the premium version is better."（https://speechify.com/blog/speechify-vs-natural-reader/）
  - **"读不懂"问题**：Brainly 用户生成的 Speechify 测评（不在 Wikipedia 引文里）反复提到 Speechify 对扫描 PDF 中文/复杂排版有错读——OCR 是核心技术风险，但**找不到权威 teardown URL 引用具体案例，不确定**。

### 特别重点：Speechify 「永远不离开那页纸」的交互具体怎么组织

这部分在我们研究里是最关键的，结合所有能拿到的证据列出来：

1. **跨产品用 mini player / menu bar app 作为"全局 voice overlay"**——macOS 上是菜单栏图标 + ⌥A/⌥X 热键 + mini player menu；Chrome 扩展是在任何网页高亮文本即可朗读；Voice Typing 在任何文本框按 Fn 即听即说。**这三套机制共享同一个隐喻：你不用切换 app，你只是在当前 app 上"加了一层语音能力"**。这是 Speechify "never leave the page" 的根本答案。
2. **reader 内容占满 + 控件贴边**：Web TTS 的 textbox 几乎占满视口，voice 选择/speed/Upload/Download 都贴顶部或底部一行，不出现 right rail 或 left rail。
3. **滚动不接管**——他们靠 word-level 高亮来同步声音和文字，而不是 auto-scroll 到当前词。**这是核心：用户随时可以手动滚、可以暂停跳读，光标永远在正确位置**。
4. **控件遮挡的处理**：macOS 上 mini player 是菜单栏 popover（自然不会遮挡）；Web TTS 是贴顶部 inline 工具条（不遮挡内容）；iOS reader 没拿到截图但**推测**是顶部 transparent overlay + 滚到底部自动收起 + tap 唤回——这是标准 iOS pattern。
5. **「内容来自你自己」是 Speechify 不需要 library-first IA 的根本原因**：用户随时可以从 web/iOS/Mac/Chrome 注入内容，不需要主屏做内容发现；主屏可以做成一个简单的"继续播放 + 最近 + 上传"三段式。

---

## Structured（App Store 164,657 条评分，参考：https://en.wikipedia.org/wiki/Structured_(app) 不存在；用 https://structured.app/ 与官方博客）

### 1 信息架构

**核心模型：一天 = 一个时间轴；时间轴 = 一根纵向刻度尺，刻度上的每一格 = 一个 task；没有「事件 / 任务 / 日程」三种对象，只有 task 一种对象，靠 icon + color + duration 区分。**

- 官方原话：**"the first thing you will see is the timeline. Here, you can plan your day by filling it with tasks."**（https://structured.app/blog/getstarted）
- 任务四种类型（https://help.structured.app/en/articles/338050）：
  1. **Timeline tasks**：在某一天某个时间，长度固定。
  2. **All-day tasks**：在某一天但无具体时间。
  3. **Recurring tasks**：每周某几天 / 每月某几天。
  4. **Inbox tasks**：无日期无时间。
- 默认自带两个 placeholder task：「Wake up!」和「Sleep well!」——给你"如何撑满一天"的视觉锚（"to give you a frame of reference on how to fill your day"，同上）。
- 顶级容器：Inbox（待安排）、Timeline（已安排）、AI（生成/重排）、Settings + Structured Cloud account——见 4.0 blog（https://structured.app/blog/4-0）。

**导航形状由模型直接决定**：
- 因为"时间"是首要坐标，**横向 = 日期（点开一日 → 周 → 月），纵向 = 当日时间刻度**。
- 三种 view 共享同一个"时间轴"心智：
  - **Daily view**：纵向时间轴 + tasks 贴在对应时间。
  - **Weekly view**：横向 7 天，每天压成一根 task icon 列（"compressed to their respective task icon. By tapping the icon, the respective task or event opens in your daily timeline view at the bottom of the screen."）——daily timeline 仍在下方半屏，**这是天才设计：你在周视图里点任意一天的某个 task，自动开下半屏的当日时间轴**（同上）。
  - **Monthly view**：整个月里每天用一个 task icon；点击某天直接跳到 daily view。

### 2 移动端 vs 桌面端（这是 Structured 改版的核心叙事）

Structured 4.0 用了整整一个 blog 章节讲重做导航（https://structured.app/blog/4-0）：

- **iPhone**：底部 **tab bar**——Inbox / Timeline / AI / Settings 四个（4.0 之前还有 Calendar 图标，4.0 删了，"since you can now access the monthly view by tapping the month at the top of your screen"）。
- **iPad + Mac**：把 Inbox 移到顶部-left；timeline 还是中部；settings 还是在右侧；用一条 "gray vertical handle" 调 Inbox 宽度——**iPad/Mac 是「侧栏可拖拽宽度的 split view」而不是 tab bar**。
- **跨视图切换手势**：iOS 26 后，"To switch to the weekly view, you can now drag down from anywhere in the daily view, rather than only using the grey handle"（https://structured.app/blog/ios26）。
- iOS 26 又升级：**Floating Tab Bar**——tab bar 浮起，**加号按钮被嵌进 tab bar 中央**（"the tab bar, which now floats with the add task button centered beside it"）——这是 iOS 26 Liquid Glass 设计语言的直接应用。
- **Structured Web**（web 端）：从 Apple-only 扩到任何浏览器后，用 keyboard shortcuts（按 Q 调出快捷键面板）替代触屏手势；同期重做 Settings 与 Calendar 接口（https://structured.app/blog/structured-web-1-0）。
- **macOS 26 新增**：Control Center 小部件可直接"create tasks / enable Focus Mode / access Structured AI"；Live Activities 在 menu bar 跟 iPhone Focus Mode 同步（https://structured.app/blog/ios26）。
- **visionOS**：widgets + Live Activities 同步。
- **CarPlay**：可直接在车里看 widgets + Live Activities。

**核心结论：Structured 没有"一套 nav 走天下"**——而是同一个 IA 模型（timeline）在三种设备密度下长出三种 nav（iPhone = bottom tab bar + 浮的 FAB；iPad/Mac = 可拖拽 split view；Web = keyboard-first + 经典 sidebar）。三端共享语义，但物理形态不同。

### 3 一次核心会话（过一天）

iPhone：开 app → Timeline tab → 屏幕纵向是 24h 刻度 + 已有 task 块（每个块带 icon + 颜色 + 标题 + 时长）→ 底部 + 加 task 按钮 → 弹出 task editor（标题、icon、颜色、date、duration、time、recurrence、subtask、note、通知）→ 创建完成回到 timeline，task 落到对应时间格。

iPhone 切周：长按 Timeline tab → 弹三选一菜单（日/周/月）；或"drag down from anywhere in the daily view"。

Mac/iPad：顶部左边 Inbox → 拖动 vertical handle 调宽度 → 中部 timeline → 右侧 Settings（4.0 重做）。

**完整端到端 Web**：Onboarding tutorial + handcrafted illustrations（"Combined with handcrafted illustrations that highlight key features, it instantly inspires you to get structured."，https://structured.app/blog/structured-web-1-0）。

### 4 可见控件的取舍

**常驻**：
- 底部 tab bar（iPhone，4.0 起 Inbox / Timeline / AI / Settings），iOS 26 起**漂浮**且**+ 加号嵌进 tab bar 中央**。
- 顶部日期选择器（点月份 → monthly view）。
- daily timeline 顶部 all-day tasks 行（"you can see and tap your all-day tasks"）。
- iPhone 顶部 Inbox FAB / Timeline FAB（"the large plus sign in the lower right corner"，https://help.structured.app/en/articles/338050）。

**藏进菜单**：
- 单 task 编辑（点击 task → task editor modal）。
- 长按日期 → Replan menu、Copy Tasks From Day、Reset、Move section 等（https://help.structured.app/en/articles/338050）。
- 长按 Timeline tab → 切换日/周/月。
- bulk-edit、bulk-delete → 走 AI 或 Structured Web（不在手机 UI 里）。

**Floating tab bar / FAB 的出现规则**：
- tab bar 始终存在（iOS 26 浮起），不是条件出现。
- **+ 按钮始终在 tab bar 中央**——Structured 的隐喻是"加 task = 切到 timeline 的入口"，不是"任何页都加新东西"。
- Replan 模式会从底部滑出一个 step-by-step 卡片（"Replan will walk you through each unfinished task step by step. You can either use the swipe gesture to decide on how to handle these tasks, or tap the respective icon."，https://structured.app/blog/replan）。

**手势语言（4 个方向四件事）**——Replan 给出全 gestures：
- ⬆️ swipe up = reschedule
- ⬅️ swipe left = move to inbox
- ➡️ swipe right = check off
- ⬇️ swipe down = delete

**这套"四向 = 四动作"的模式来自邮件/短信客户端的"左滑删除"，但 Structured 把四向全部用到，每向对应一种任务生命周期动作，非常紧凑**。Inbox 也用拖到 + 号变垃圾桶（"drag them to the plus button, which converts into a bin"，https://help.structured.app/en/articles/338178）。

### 5 首次使用与空状态

- **Onboarding 是 handcrafted illustration + 短教程**："a short tutorial that explains the most important features of Structured. We optimized the onboarding based on user feedback to deliver the best possible first impression and user experience. Combined with handcrafted illustrations..."（https://structured.app/blog/structured-web-1-0）
- 第一次进入 timeline 不会空白：**预先塞了 "Wake up!" 和 "Sleep well!" 两个 placeholder task**（https://structured.app/blog/getstarted）——这是非常聪明的 empty-state 设计：你看到的不是空白页，而是 "你的 day 该长成这个样子"。
- Inbox 首次是空的，没有特殊引导（**不确定** iOS 上是否有 empty illustration；官方只有 Web onboarding 提到 illustrations）。

### 6 文本排版

- 时间轴纵向 24h，每小时占固定像素行高（具体数字**不确定**，没有 design system 公开）。
- task block：图标 + 颜色 block + 标题 + 时长；subtask 在 timeline 上用一个**小符号**标识（"your task will have a little symbol beneath it in the timeline. To check off a subtask or read the note, simply tap the task."，https://help.structured.app/en/articles/338050）——subtask **不展开 inline**，避免 timeline 拥挤。
- 文本字号**不确定**，但 timeline 块标题偏小（要在一格内挤图标+标题），subtask 提示符号极小。

### 7 动效与转场

- view 切换：周视图与日视图之间用「drag down from anywhere in the daily view」（iOS 26）——iOS 标准的弹性 scroll 切换。
- weekly view 点 task icon：下半屏"弹出 daily timeline"——这是 master-detail 的 split view 动画（**具体动画曲线不确定**）。
- 浮动 tab bar：iOS 26 Liquid Glass 标准 backdrop blur + translucency。
- Replan step-by-step：底栏从底部滑出卡片。

### 8 被批评的地方

**找不到可信 teardown**——Structured.app 在 Growth.Design / Smashing 上没 teardown。Wikipedia 页面（https://en.wikipedia/wiki/Structured_(app)）**不存在**（"Wikipedia does not have an article with this exact name"）。**批评类证据：不确定**。

从产品自家博客的"Replan 限制"一节（https://structured.app/blog/replan）可读出几条**间接**反馈：
- "Replan requires ⭐️ Structured Pro." ——把核心 day-recovery 体验放进付费墙。
- "As of now, Replan is only available for Apple users." ——**功能在 iOS/Android/Web 间不一致**是已知问题。
- "This feature is not available on 🌐 Structured Web yet"（notifications，https://help.structured.app/en/articles/1870338）——**Web 端功能落后**也是已知。

### 可偷的模式

1. **「时间 = 一根轴」作为主屏的 IA**，task 是轴上的色块；不要试图用 calendar grid 当主屏——grid 横向天数/纵向时段对"今天我这一刻该做什么"不是最优解。
2. **三种 view 共享同一份 task 数据**：daily = 纵向时间轴；weekly = 7 列压缩 icon 列；monthly = 整月 icon 网格。**view 之间不是页面跳转，而是同一份数据的三种 lens**——跟 Notion 的 database views 一个逻辑，但形态更物理、更直观。
3. **周视图的下半屏 daily timeline 是 master-detail 的精彩实现**——你在周视图点任何一天的 task，下半屏直接展开那一天；不需要再切 view。
4. **Placeholder task 作为空状态**——比空白 + 引导按钮更接近"产品的隐含用法"。
5. **四向 swipe = 四动作**（up=reschedule / left=inbox / right=check / down=delete）——紧凑、肌肉记忆可建立。
6. **iOS 26 Floating Tab Bar + FAB 内嵌**——把 iOS 26 新设计语言直接接进 IA，**与随系统升级走**是减少设计债的关键。
7. **bottom tab 始终存在（不随滚动隐藏）**——内容是 timeline 纵滚，tab 是操作锚，混合 app（Chrome）那种"滚到底 tab 让位给内容"在 timeline app 里是错的。

### 不适合我们的地方

1. **timeline 是为"一天内多次小任务"设计的**——如果你做的是"长时间段的学习（如一次 90 分钟）"，timeline 的视觉密度反而是噪音。
2. **placeholder task 的策略**（Wake up / Sleep well）带有强烈西方个人生活节奏隐喻，**学习验证场景需要换一套 placeholder**（"开始学习 / 复盘"之类）。
3. **iOS/Android/Web 体验不齐**——这是他们自己也承认的债。

---

## Blinkist（App Store 153,947 条评分，参考：https://en.wikipedia.org/wiki/Blinkist）

### 1 信息架构

**核心模型：原书 → 「Blink」→ 7–10 个 key insight「card」串成的 15 分钟读。每本书就是一条 feed，每条 card 是 feed 里的一屏。**

- 官方原话：**"It provides summaries of over 6,500 titles, including bestselling nonfiction books in fifteen-minute reads, otherwise known as Blinks."**（https://en.wikipedia.org/wiki/Blinkist）
- 库：6,500+ titles，英德西三语（Wikipedia 同上）。
- 创始人背景：2012 年柏林创立，2023 年被澳洲企业学习公司 Go1 收购（同上）。
- 商业模型：freemium 订阅（Growth.Design 的 teardown 标题就叫 "Blinkist onboarding"，paywalled：https://web.archive.org/web/20250115122659/https://growth.design/case-studies/blinkist-user-onboarding）——**teardown 存在但内容要订阅才能看**。

**导航形状由模型直接决定**：
- 因为每本书都是"card 流"，**主信息架构是 feed-like 的纵向 swipe**——首页 = 推荐 / 今日 Blink / 继续听，详情 = 一屏一 card 的横向 swipe。
- 没有结构性"层级"（不像 Notion 的 page 树），只有**目录层级**（Discover → Categories → Book → Blinks / Audio / Summary）和**状态层级**（Saved / Finished / Currently Reading）。
- 没有 wiki、没有 database view、没有自定义 view——**Blinkist 是这四款里 IA 最简单的**。

### 2 移动端 vs 桌面端

**主形态是 mobile**（iOS/Android 评分 15 万+ 量级，暗示主战场是手机）。Web 端存在（https://www.blinkist.com/nc）但 403/反爬厉害。

- **不确定**：桌面端是 PWA 还是 native web app；移动端的具体 tab 结构没找到截图；推测底部 tab 至少有 Home / Search / Library / Profile 四档，但**没有官方文档确认**。

### 3 一次核心会话（听一个 Blink）

典型路径（基于 Blinkist 公开宣传材料的常识 + Wikipedia 信息）：
1. 打开 app → home/discover
2. 选一本书 → 详情页（简介 + "Start blink" + "Listen to full" + "Read" 三入口）
3. 进入 Blink 流 → 第一张 card 显示一个 key insight + 下方 "swipe up for next" 或 auto-advance
4. 一本书有 7–10 张 card，**每张大约 1.5–2 分钟读** → 15 分钟内读完
5. 读完弹出"你学到了什么"小结 + Save / Share / Add to library

**关键 UX 隐喻：卡 = 屏**——一页一 insight，是 Blinkist 跟 Audible / Storytel 这种"长音频"最大的差别。**它不是"听书"，是"翻卡"。**

### 4 可见控件的取舍

- **常驻**：每张 card 上的听/暂停按钮、进度条（总 15 分钟）、左右滑动手势。
- **藏进菜单**：朗读速度、声音选择（**没找到可信来源**——这些可能藏在每张 card 的 settings 入口里）。
- **Floating FAB**：Blinkist 在 card 详情上很可能用底部 fixed mini player（"正在朗读"时）——但**没找到可信 URL 引用**。
- **首页的"今日 Blink"**是他们的留存钩子（依据 Growth.Design teardown 标题 "Blinkist onboarding" 暗示）——**teardown 内容 paywalled，不确定具体形态**。

### 5 首次使用与空状态

- 付费墙 onboarding（Growth.Design teardown 标题）——这是 Blinkist 经典的 7 天免费试用流程：选兴趣 → 推荐首本 → 试听一段 → 弹订阅。**teardown 内容不确定**。
- 空状态：用户进来时**库不是空的**——6,500+ 书 + 推荐流直接填满首页。这是 Blinkist 跟 Notion / Structured 最大的 IA 区别：**它是 content-first，不是 user-content-first**。

### 6 文本排版

- 移动端 card 字号**大**（每屏一 insight，行数控制在 3–5 行）。
- 行高和列宽**没找到可信来源**，**不确定**。
- 高亮：Blinkist 的"朗读"模式是 narration + 文字同步（类似 Speechify），但**没找到具体网页确认**，**不确定**。

### 7 动效与转场

- card 翻动：水平 swipe + spring physics（推测是 iOS 默认的 swipe-to-dismiss 风格）。
- 进度切换：每张 card 的进入/退场动效是 fade + slide（推测）。
- **没找到可信文档**确认具体曲线和持续时间。

### 8 被批评的地方

- New Yorker 2024 年文章 "Can You Read a Book in a Quarter of an Hour?"（https://www.newyorker.com/magazine/2024/05/27/can-you-read-a-book-in-a-quarter-of-an-hour）——讨论"速读商业书"是不是真读懂了，**Blinkist 是核心被讨论对象**。
- The Guardian 2018: "Blink and you'll miss it: can you really digest a whole book in 15 minutes?"（https://www.theguardian.com/books/shortcuts/2018/dec/09/blink-and-youll-miss-it-can-you-really-digest-a-whole-book-in-15-minutes）——同主题，**没有 UI teardown 内容**。
- NYT 2021: "Just How Optimized Can Your Life Be?"（https://www.nytimes.com/2021/11/24/magazine/blinkist-optimization-app.html）——同上。
- **可信 UI/UX teardown：找不到免费的**。Growth.Design 那个标题对的，**但内容 paywalled**。
- 学术引用：Springer Nature 2024 的书《Educational Broadcasting in Nigeria in the Age of AI》提到 Speechify 对阅读障碍学生的帮助（https://en.wikipedia.org/wiki/Speechify 引用的研究）——**不是针对 Blinkist 的 UI 批评**。

### 可偷的模式

1. **"一屏一 insight"是移动端阅读/学习类产品的最稳信息密度**——比 Speechify 那种"一屏连续文本"更适合短注意力场景。
2. **content-first 空状态**：靠"我已经为你选好了"取代"你自己加东西"。学习验证场景如果走这条路，第一屏应该是精选题目/精选解释，不是空白。
3. **15 分钟的强承诺 = "你能在通勤/咖啡时间完成" 的隐式承诺**——时长上限是产品语义的一部分。
4. **音频 + 文字同步**是 learn-by-hearing 的标配——前提是文字真的同步（Speechify 的 word-level 高亮 vs Blinkist 的 card-by-card 同步是两种粒度）。

### 不适合我们的地方

1. **Blinkist 的所有内容是预制**——没有 user content。我们的学习验证场景需要用户自己产生内容（题目、笔记、复述），**不能照抄 content-first**。
2. **过度简化知识的批评**：Blinkist 的核心产品模式（15 分钟一本书）正是新闻批评的焦点——我们做"学习验证"如果走"短摘要"路线，可能踩同一个"伪掌握"陷阱。

---

# 四款共有的信息架构原则（带证据）

1. **"一切皆同一种对象，靠 view 变形"**——Notion（block/page 的 database views）、Structured（task 的 daily/weekly/monthly view）、Blinkist（书的 card 流 / audio 模式）是同一思路的三种实现。**学习验证类产品应该只有「题 / 答 / 反馈」一种对象，靠「今日 / 全部 / 错题 / 收藏」四种 view 变形**，不要每种状态建一个新 IA。
   - 证据：https://www.notion.com/help/intro-to-databases（"Databases are collections of pages"）、https://structured.app/blog/4-0（view 是同一份 task 数据的三种 lens）

2. **「时间轴」或「时间刻度」是个人效率类产品的天然主屏**——Notion 把 calendar view 当一个 database view（不主推），Structured 把时间轴当主屏（强主推），Blinkist 的 15 分钟承诺本质上是把"读书"压缩到一根时间轴上。**如果做学习验证，主屏最好按时间排：今天 + 未来 7 天**。
   - 证据：https://structured.app/blog/getstarted（"the first thing you will see is the timeline"）、https://en.wikipedia.org/wiki/Blinkist（"fifteen-minute reads"）

3. **Mini player / 浮控件 = 内容沉浸场景下的标配解法**——Speechify Mac mini player 是天花板，Notion side peek 留左侧 db 给右栏内容，iOS 26 的 floating tab bar 让 tab 也加入"永远在内容上方"的家族。**学习验证场景如果"听讲解/看示范"是核心，需要给 reader + audio 同样的浮控件设计**。
   - 证据：https://speechify.com/text-to-speech-mac/（"mini player menu while audio is playing"）、https://www.notion.com/help/views-filters-and-sorts（side peek "Open pages on the right side of the database. The rest of the database view continues to be interactive on the left."）、https://structured.app/blog/ios26（Liquid Glass floating tab bar）

4. **Onboarding 不是空状态**——Notion 给完全自由（不抄），Speechify 用 OCR + 全局热键给"无内容也能用"兜底（值得抄），Structured 用 placeholder task 给出"一天的骨架"（值得抄），Blinkist 用推荐流填满首页（适合 content-first）。**学习验证的最佳模仿对象是 Structured 的 placeholder 思路**：第一屏不是空白，而是"今天该有的样子"。
   - 证据：https://structured.app/blog/getstarted（"Wake up! and Sleep well! tasks"）、https://speechify.com/text-to-speech-online/（OCR + 全局快捷键）、https://en.wikipedia.org/wiki/Blinkist（6,500+ titles 直接填首页）

5. **「永远不离开那页纸」要靠三个机制**——(a) 全局触发（macOS 菜单栏 / iOS share extension / Android intent）让用户从任何 app 跳进 Speechify；(b) 阅读界面把内容占满、控件贴边且半透明；(c) 进度同步用 listen position / sentence index 而不是 scroll offset，让用户在多个设备间无缝切换。**如果你的学习验证产品要走「边读边记」路线，这三件套都要有**。
   - 证据：https://speechify.com/text-to-speech-mac/（⌥A/⌥X 全局热键 + 菜单栏）、https://speechify.com/voice-typing-dictation/（"Speechify inserts text system-wide"）、https://speechify.com/text-to-speech-online/（"Speechify remembers your place so you can listen to long reads across multiple sessions on any device"）

---

## 不确定项的清单（research 没能拿到的部分）

- Notion 移动端的 sidebar → bottom tab 形态（官方 help center 没有 mobile 专属文章，所有 mobile-related slug URL 都返回 404；只有产品下载页 https://www.notion.com/mobile）
- Notion 折叠动画 / 移动端具体动效
- Speechify iOS reader 截图与具体字号行高
- Speechify iOS mini player 的具体形态（macOS 菜单栏版是确定的，iOS 版推测是顶部/底部浮控件但无 URL 证据）
- Speechify 被批评的具体案例（社区有但找不到权威 teardown）
- Structured 的设计系统/字号规范（无公开 design system 文档）
- Blinkist 几乎所有 UI/UX 细节——Growth.Design teardown 内容 paywalled，Wikipedia 没有该 app 条目，Blinkist 帮助中心域名（help.blinkist.com）DNS 失败
- Blinkist 桌面端是 PWA 还是 native web app（主战场明显是移动端）
- Blinkist 的朗读高亮是否 word-level（推测是 card-level 同步而非 word-level）

---

**交付说明**：本文档严格使用研究任务允许的 web_search 和 web_fetch 工具，未触屏浏览器单车道。所有引用 URL 均为研究过程中实际访问并返回 200/302 内容的页面，或被外部反爬挡掉后明确标"不确定"的项目。