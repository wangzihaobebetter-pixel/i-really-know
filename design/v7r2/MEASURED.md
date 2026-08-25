# 实测规格库 —— 从活着的产品上量出来的数字

方法：无痕 Chrome，iPhone UA，390×844，DPR 2，只访问公开页面（不登录、不输入任何账号）。
对每个页面读取 computed style：按覆盖面积加权的字体组合、实际圆角、声明的过渡时长与缓动、
常驻（fixed/sticky）元素的高度与位置、按面积排序的背景色、可点元素的命中尺寸。
脚本 `measure-refs.cjs`，原始数据 `measure/measurements.json`，截图 `measure/*.png`。

⚠️ 口径：这些页面多数是**营销站**，不等于 App 内界面。它们能证明的是**该团队的排版/圆角/动效/色彩语言**，
不能证明 App 内的导航结构——那部分靠 App Store 应用内截图和三份子代理调研。两边不要混着引用。

## Khan Academy exercise (public, no login)

- 来源：https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs/x2f8bb11595b61c86:slope/e/slope-from-two-points
- 文档高度 898px · 可点元素 23 个 · 命中高度 最小/中位/最大 = 24 / 40 / 56 px
- **字体层级**（按覆盖面积排序）：
  - `Lato | 16px | 400 | lh 22px`
  - `Lato | 13.1px | 400 | lh 19.68px`
  - `Lato | 16px | 700 | lh 20px`
  - `Lato | 16px | 400 | lh 20px`
  - `Lato | 13.1px | 600 | lh 18.368px`
  - `Lato | 16px | 700 | lh 22px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`4px`(22)、`8px`(4)、`844px`(4)、`2px`(4)、`2.5px`(1)
- **动效**（声明值）：`transition 0.125s ease`；`transition 0.1s ease-in-out`；`transition 0.125s, 0s, 0s ease, ease, ease`；`transition 0.3s ease-out`
- **常驻元素**：div fixed 距顶359 距底-20 高505 底色rgba(0, 0, 0, 0) ／ div fixed 距顶396 距底10 高438 底色rgb(255, 255, 255)
- **主要面色**：`rgb(255, 255, 255)`、`rgb(11, 33, 73)`、`rgb(237, 243, 254)`、`rgb(49, 49, 48)`、`rgb(24, 101, 242)`
- **最大的可点对象**：「Give now」343×40 r4px、「Accept All Cookies」309×44 r2px、「Strictly Necessary Only」309×44 r2px、「Cookies Settings」309×44 r2px

## Quizlet public set

- 来源：https://quizlet.com/us/560091745/biology-chapter-1-flash-cards/
- 文档高度 6173px · 可点元素 65 个 · 命中高度 最小/中位/最大 = 24 / 32 / 48 px
- **字体层级**（按覆盖面积排序）：
  - `hurme_no2-webfont | 16px | 600 | lh 24px`
  - `hurme_no2-webfont | 14px | 600 | lh 20px`
  - `hurme_no2-webfont | 12px | 600 | lh 16px`
  - `hurme_no2-webfont | 16px | 700 | lh 24px`
  - `Osaka | 20.8px | 400 | lh 33.8px`
  - `hurme_no2-webfont | 16px | 400 | lh 26px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`4px`(80)、`8px`(58)、`200px`(33)、`100%`(28)、`50%`(20)、`16px`(19)
- **动效**（声明值）：`transition 0.12s cubic-bezier(0.47, 0, 0.745, 0.715)`；`transition 0.3s ease`；`transition 0.1s cubic-bezier(0.37, 0, 0.53, 1)`；`transition 0.1s, 0.1s cubic-bezier(0.37, 0, 0.53, 1), cubic-bezier(0.37, 0, 0.53, 1)`
- **常驻元素**：header sticky 距顶0 距底724 高120 底色rgba(0, 0, 0, 0) ／ div fixed 距顶0 距底0 高844 底色rgb(255, 255, 255) ／ iframe fixed 距顶708 距底0 高136 底色rgba(0, 0, 0, 0)
- **主要面色**：`rgb(255, 255, 255)`、`rgb(246, 247, 251)`、`rgb(219, 223, 255)`、`rgb(237, 239, 255)`、`rgb(31, 28, 139)`
- **最大的可点对象**：「使用学习模式学习」148×40 r200px、「—」129×40 r0px、「—」129×40 r0px、「HSC」200×24 r0px

## Duolingo marketing/home

- 来源：https://www.duolingo.com/
- 文档高度 8684px · 可点元素 2 个 · 命中高度 最小/中位/最大 = 50 / 50 / 50 px
- **字体层级**（按覆盖面积排序）：
  - `feather | 36px | 700 | lh normal`
  - `duolingo-sans | 17px | 500 | lh 24px`
  - `duolingo-sans | 32px | 700 | lh normal`
  - `duolingo-sans | 15px | 700 | lh 22px`
  - `duolingo-sans | 19px | 700 | lh 26.6px`
  - `duolingo-sans | 13px | 700 | lh 16px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`12px`(7)
- **动效**（声明值）：`transition 0.3s, 0.4s ease, cubic-bezier(0.22, 1, 0.36, 1)`
- **常驻元素**：div fixed 距顶0 距底772 高72 底色rgb(255, 255, 255) ／ div fixed 距顶0 距底0 高844 底色rgba(0, 0, 0, 0.4) ／ div fixed 距顶0 距底0 高844 底色rgba(0, 0, 0, 0.3)
- **主要面色**：`rgb(221, 244, 255)`、`rgb(88, 204, 2)`、`rgb(16, 15, 62)`、`rgba(0, 0, 0, 0.4)`、`rgba(0, 0, 0, 0.3)`
- **最大的可点对象**：「已有帐户」330×50 r12px、「免费体验 1 周」330×50 r12px

## Brilliant home

- 来源：https://brilliant.org/
- 文档高度 9190px · 可点元素 37 个 · 命中高度 最小/中位/最大 = 20 / 40 / 68 px
- **字体层级**（按覆盖面积排序）：
  - `CoFo Brilliant | 16px | 400 | lh 24px`
  - `CoFo Brilliant | 15px | 400 | lh 20.7px`
  - `CoFo Brilliant | 30px | 400 | lh 37.5px`
  - `CoFo Brilliant | 14px | 400 | lh 21px`
  - `CoFo Robert | 40px | 500 | lh 44px`
  - `CoFo Brilliant | 12px | 400 | lh 18px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`9999px`(32)、`17px`(15)、`20px`(7)、`16px`(4)、`14px`(4)、`32px`(2)
- **动效**（声明值）：`transition 0.3s ease`；`transition 0.2s, 0.2s, 0.2s ease, ease, ease`；`transition 0.2s, 0.2s ease-out, ease-out`；`transition 0.1s ease-out`
- **常驻元素**：div fixed 距顶16 距底774 高54 底色rgba(0, 0, 0, 0) ／ div fixed 距顶602 距底0 高242 底色rgb(248, 248, 248)
- **主要面色**：`rgb(245, 243, 241)`、`rgb(255, 255, 255)`、`rgb(0, 0, 0)`、`rgb(240, 248, 250)`、`rgb(231, 238, 226)`
- **最大的可点对象**：「Get started」308×68 r9999px、「I’m a learner」342×56 r9999px、「I’m a parent or teacher」342×56 r9999px、「Science」93×44 r9999px

## Notion product page

- 来源：https://www.notion.com/product
- 文档高度 4067px · 可点元素 4 个 · 命中高度 最小/中位/最大 = 20 / 38 / 44 px
- **字体层级**（按覆盖面积排序）：
  - `NotionInter | 14px | 500 | lh 20px`
  - `Lyon Text | 18px | 400 | lh 28px`
  - `NotionInter | 14px | 400 | lh 20px`
  - `NotionInter | 32px | 700 | lh 40px`
  - `NotionInter | 42px | 600 | lh 48px`
  - `NotionInter | 22px | 700 | lh 28px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`8px`(45)、`4px`(15)、`6px`(11)、`12px`(8)、`9999.01px`(7)、`100%`(3)
- **动效**（声明值）：`transition 0.2s cubic-bezier(0.42, 0, 1, 1)`；`animation 85s linear`；`transition 0.3s cubic-bezier(0.86, 0, 0.07, 1)`；`transition 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)`
- **常驻元素**：div sticky 距顶0 距底780 高64 底色rgba(0, 0, 0, 0) ／ div fixed 距顶944 距底-154 高54 底色rgba(0, 0, 0, 0)
- **主要面色**：`rgb(255, 255, 255)`、`rgb(249, 249, 248)`、`rgb(246, 245, 244)`、`rgb(9, 127, 232)`、`rgb(255, 177, 16)`
- **最大的可点对象**：「English (US)」166×38 r9999.01px、「Do Not Sell or Share My 」187×20 r0px、「Cookie settings」103×20 r0px、「—」44×44 r0px

## Speechify home

- 来源：https://speechify.com/
- 文档高度 22698px · 可点元素 65 个 · 命中高度 最小/中位/最大 = 24 / 56 / 199 px
- **字体层级**（按覆盖面积排序）：
  - `abc_diatype | 16px | 400 | lh 24px`
  - `abc_diatype | 18px | 400 | lh 24px`
  - `abc_diatype | 18px | 500 | lh 24px`
  - `abc_diatype | 30px | 500 | lh 34px`
  - `abc_diatype | 24px | 400 | lh 32px`
  - `abc_diatype | 24px | 500 | lh 28px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`3.35544e+07px`(58)、`16px`(23)、`12px`(16)、`24px`(6)、`32px`(1)、`30px`(1)
- **动效**（声明值）：`transition 0.15s cubic-bezier(0.4, 0, 0.2, 1)`；`animation 0.15s cubic-bezier(0.14, 1, 0.34, 1)`；`animation 0.08s cubic-bezier(0.14, 1, 0.34, 1)`；`animation 0.8s ease-in-out`
- **常驻元素**：div sticky 距顶0 距底738 高106 底色rgba(0, 0, 0, 0) ／ div fixed 距顶688 距底0 高156 底色rgb(17, 17, 18)
- **主要面色**：`rgb(30, 30, 31)`、`rgb(255, 255, 255)`、`rgb(23, 23, 23)`、`rgb(0, 0, 0)`、`rgb(17, 17, 18)`
- **最大的可点对象**：「How does Speechify compa」358×104 r0px、「How is Speechify differe」358×80 r0px、「Can Speechify replace ot」358×80 r0px、「What is voice cloning? D」358×80 r0px

## Blinkist home

- 来源：https://www.blinkist.com/
- 文档高度 9158px · 可点元素 58 个 · 命中高度 最小/中位/最大 = 20 / 48 / 344 px
- **字体层级**（按覆盖面积排序）：
  - `CeraPRO | 16px | 400 | lh 24px`
  - `CeraPRO | 14px | 400 | lh 36px`
  - `CeraPRO | 16px | 500 | lh 24px`
  - `CeraPRO | 32px | 700 | lh 40px`
  - `blinkist-serif | 16px | 400 | lh 24px`
  - `CeraPRO | 18px | 700 | lh 24px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`2px`(74)、`8px`(38)、`16px`(13)、`9999px`(3)、`20px`(3)、`6px`(2)
- **动效**（声明值）：`transition 0.2s cubic-bezier(0, 0, 0.2, 1)`；`animation auto linear`；`transition 0.15s cubic-bezier(0.4, 0, 0.2, 1)`；`transition 0.3s cubic-bezier(0, 0, 0.2, 1)`
- **常驻元素**：div sticky 距顶0 距底771 高73 底色rgb(255, 255, 255) ／ ol fixed 距顶0 距底812 高32 底色rgba(0, 0, 0, 0)
- **主要面色**：`rgb(239, 245, 243)`、`rgb(214, 233, 255)`、`rgb(235, 230, 255)`、`rgb(255, 243, 214)`、`rgb(3, 48, 73)`
- **最大的可点对象**：「Listen
02:06」256×344 r16px、「Listen
01:01」256×344 r16px、「Listen
01:02」256×344 r16px、「Listen
01:51」256×344 r16px

## Headspace home

- 来源：https://www.headspace.com/
- 文档高度 8347px · 可点元素 36 个 · 命中高度 最小/中位/最大 = 10 / 44 / 76 px
- **字体层级**（按覆盖面积排序）：
  - `Headspace Apercu | 16px | 400 | lh 24px`
  - `Headspace Apercu | 12px | 500 | lh 13.8px`
  - `Headspace Apercu | 20px | 700 | lh 24px`
  - `Headspace Apercu | 32px | 700 | lh 36.8px`
  - `Headspace Apercu | 20px | 500 | lh 26px`
  - `Headspace Apercu | 40px | 700 | lh 44px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`16px`(21)、`32px`(18)、`50%`(18)、`24px`(12)、`8px`(7)、`2px`(4)
- **动效**（声明值）：`transition 0.15s, 0.15s, 0.15s, 0.15s, 0.15s cubic-bezier(0.32, 0.94, 0.6, 1), cubic-bezier(0.32, 0.94, 0.6, 1), cubic-bezier(0.32, 0.94, 0.6, 1), cubic-bezier(0.32, 0.94, 0.6, 1), cubic-bezier(0.32, 0.94, 0.6, 1)`；`transition 0.3s ease`；`transition 0.4s, 0.4s cubic-bezier(0.32, 0.94, 0.6, 1), cubic-bezier(0.32, 0.94, 0.6, 1)`；`transition 0.1s ease-out`
- **常驻元素**：div fixed 距顶498 距底0 高346 底色rgb(249, 244, 242)
- **主要面色**：`rgb(249, 244, 242)`、`rgb(0, 97, 239)`、`rgb(255, 255, 255)`、`rgb(255, 206, 0)`、`rgb(0, 164, 255)`
- **最大的可点对象**：「Stress less」342×76 r8px、「Sleep soundly」342×76 r8px、「Manage anxiety」342×76 r8px、「Process thoughts」342×76 r8px

## Anki manual (studying)

- 来源：https://docs.ankiweb.net/studying.html
- 文档高度 9600px · 可点元素 2 个 · 命中高度 最小/中位/最大 = 50 / 50 / 50 px
- **字体层级**（按覆盖面积排序）：
  - `Open Sans | 16px | 400 | lh 23.2px`
  - `Open Sans | 14px | 400 | lh 21px`
  - `Open Sans | 24px | 700 | lh normal`
  - `Open Sans | 16px | 700 | lh 23.2px`
  - `Open Sans | 24px | 200 | lh 50px`
  - `Source Code Pro | 14px | 400 | lh 10px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`5px`(2)
- **动效**（声明值）：`transition 0.5s ease`；`transition 0.3s ease`；`transition 0.3s, 0.3s ease, ease`
- **常驻元素**：nav fixed 距顶0 距底0 高844 底色rgb(40, 45, 63) ／ div sticky 距顶0 距底794 高50 底色rgba(0, 0, 0, 0)
- **主要面色**：`rgb(22, 25, 35)`、`rgb(40, 45, 63)`、`rgb(31, 36, 50)`
- **最大的可点对象**：「—」33×50 r0px、「—」32×50 r0px

## Duolingo design system

- 来源：https://design.duolingo.com/
- 文档高度 2104px · 可点元素 1 个 · 命中高度 最小/中位/最大 = 14 / 14 / 14 px
- **字体层级**（按覆盖面积排序）：
  - `din-round | 15px | 400 | lh 23.25px`
  - `feather | 36px | 700 | lh 36px`
  - `din-round | 15px | 700 | lh 15px`
  - `din-round | 16px | 700 | lh 16px`
  - `feather | 44px | 700 | lh 44px`
  - `din-round | 15px | 700 | lh 23.25px`
- **圆角**（≥24px 的元素，括号内为出现次数）：`16px`(5)
- **动效**（声明值）：`transition 0.3s ease`
- **常驻元素**：section fixed 距顶0 距底782 高62 底色rgb(88, 204, 2) ／ div fixed 距顶0 距底0 高844 底色rgb(75, 75, 75) ／ div fixed 距顶0 距底0 高844 底色rgb(255, 255, 255) ／ section fixed 距顶844 距底-68 高68 底色rgb(255, 255, 255)
- **主要面色**：`rgb(75, 75, 75)`、`rgb(88, 204, 2)`、`rgb(255, 255, 255)`、`rgb(247, 247, 247)`、`rgb(28, 176, 246)`
- **最大的可点对象**：「—」20×14 r0px
