# 参考池重选 —— 第一轮选错了几个对标对象

第一轮我按「同领域 + 有名」挑了十个。这一轮把 App Store 池子扩到 **45 个真实产品**
（`appstore2/pool.json`，带评分人数、更新日期、类目），重新按**「它解决的问题和我们像不像」**筛。
结论：**第一轮里有三四个对标对象是选错的**，而池子里躺着几个和我们几乎同构、用户量还更大的产品。

---

## 第一轮漏掉的、真正同构的产品

### ⭐ GoodNotes（443,855 条评分）—— 这个几乎就是我们
应用内截图（`appstore2/goodnotes-1.jpg`）：**上半屏是用户自己手写的那一页**，
下半屏是一个面板：`TELL ME MORE ABOUT` 后面跟着话题芯片（Magma / Epicentre / Volcano），
再下面 `SUGGESTED QUESTIONS`：*"How do volcanoes form on divergent (constructive) plate boundaries?"*

**这就是「拿学生自己的材料生成问题」这件事，被一个 44 万评分的产品做出来的样子。**
它给出的答案是：*页在上、问在下、中间用话题芯片当把手*。
第一轮我拿 Blinkist（15 万）当对标，而真正同构的 GoodNotes 被漏掉了。

### ⭐ Babbel（750,907 条评分）—— 口试循环的最大同类
截图 2：*"Listen, then say it out loud"* → 一张图 + 提示句 `¿Cómo estás?`（带朗读按钮）
+ 下方译文 + **屏幕底部中央一个大号橙色麦克风**。
**「读给你听 → 你开口说 → 判定」正是我们的口试循环**，Babbel 用 75 万评分证明了这个形状能跑。
我们的语音输入现在是答题坞里一个 52×52 的小图标，和它差着一个数量级的重量。

### Chegg Study（204,684）—— 常驻多模态输入坞 + 起手提示芯片
首页是 `Pick back up` 列表 + **底部常驻输入条（相机 / 图片 / 麦克风 / 数学）**，
下面写 *"Not sure where to start? Choose a prompt:"* 加三枚提示芯片
（`Steps for…` / `How can I figure out…` / `What does this mean…`）。
**「不知道从哪开始」被当成一等场景处理** —— 我们的空状态目前只有一句话加一个范例卡。

### Elevate（539,777）—— 今天这一组，做成可勾选的清单
截图 2：一列今日项目，每项带类目标签与完成勾（Brevity ✓ / Recall / Averages / Attention / Processing），
顶上写 `Recommended`。**「今天要过的几问」可以就是这样一张清单**，比进度条讲得清楚。

### Busuu（100,261）—— 练习屏的顶栏该放什么
`True or False?` 屏：顶栏是 `[亮度] [进度条] [举报旗] [×]`，正文一段材料，下面两个大按钮。
**「举报这题有问题」在练习屏顶栏是一等控件** —— 对我们尤其重要：模型出的问题会有出错的时候，
学生需要一个不打断流程的方式说「这题问得不对」。**我们现在完全没有这个出口。**

### Notability（453,065）· Fabulous（88,737）· Readwise（1,512）
- Notability：文档 + 自动生成的结构化「Smart Notes」章节，含 *"Generating Smart Notes…"* 的等待态。
- Fabulous：把每日流程做成**印刷手账**（晨/午/晚分栏、每项带时间预算 15/20/30 MINS），一套完全不同的视觉语言。
- Readwise：`Daily Review` 一张卡 —— *"7 highlights from …"* + 一个 Review 按钮。**我们的回访就该是这一张卡。**

---

## 第一轮选错的对标对象（要换掉）

| 第一轮 | 问题 | 换成 |
|---|---|---|
| Blinkist（15 万） | 内容是**别人写的摘要**，我们的内容是**用户自己写的**。同构性很弱 | **GoodNotes（44 万）**：用户自己的页 + 生成的问题 |
| Notion（9 万） | 大纲树是对的，但 Notion 解决的是**创作与组织**，不是**被追问** | 保留，但降级为「信息架构参考」，不再当一整个方案的灵魂 |
| Brilliant（3 万） | 对话式判定这条是对的，但用户量在这批里最小 | 保留形状，**证据换成 Babbel（75 万）的说出声循环** |
| Craft（6,595） | 第一轮用过它的调色，用户量太小，不该作依据 | 删掉 |

## 这一轮的对标池（都附评分人数）

**同构最强**：GoodNotes 443,855 · Babbel 750,907 · Chegg 204,684 · Anki 2,319（间隔重复事实标准）
**会话形状**：Duolingo 5,399,774 · Quizlet 1,104,312 · Busuu 100,261 · Elevate 539,777 · Khan 110,169
**阅读与文档**：Speechify 517,576 · Notability 453,065 · Notion 89,863
**节奏与回访**：Structured 164,657 · Readwise 1,512 · Headspace 973,869 · Fabulous 88,737
**逐步解答**：Gauth 1,457,502 · Photomath 732,929 · Symbolab 26,136 · Socratic 5,868

⚠️ 口径说明：以上是 **App Store 官方元数据 + 官方应用内截图**（2026-08-25 抓取）。
截图能证明「这个界面存在」，不能证明「点下去发生什么」——后者靠三份子代理调研和我亲手走的 Khan。
