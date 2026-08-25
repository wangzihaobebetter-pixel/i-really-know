"""v7 R2 · One page Wang can open: the ten schemes, each with its own frames,
its reasoning, and what picking it commits the product to.

Built from the files that already hold the thinking (SCHEMES-V2.md, DECISION.md)
rather than restating them, so the page cannot drift from the branch. Images are
inlined as base64 so the file works when opened straight off disk, mailed, or
printed to PDF with no server."""
import base64, html, re, pathlib

ROOT = pathlib.Path(__file__).parent
D = ROOT / 'design' / 'v7r2'
SHOTS = D / 'shots'

def b64(path):
    return base64.b64encode(pathlib.Path(path).read_bytes()).decode()

def inline(name):
    p = SHOTS / name
    return f'data:image/jpeg;base64,{b64(p)}' if p.exists() else ''

# ── markdown → html, deliberately small: only what these files actually use ──
def md(text):
    out, lines, i = [], text.split('\n'), 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('|') and i + 1 < len(lines) and set(lines[i+1].replace('|','').strip()) <= set('-: '):
            head = [c.strip() for c in line.strip('|').split('|')]
            i += 2
            body = []
            while i < len(lines) and lines[i].startswith('|'):
                body.append([c.strip() for c in lines[i].strip('|').split('|')])
                i += 1
            out.append('<table><thead><tr>' + ''.join(f'<th>{ip(c)}</th>' for c in head) + '</tr></thead><tbody>'
                       + ''.join('<tr>' + ''.join(f'<td>{ip(c)}</td>' for c in r) + '</tr>' for r in body)
                       + '</tbody></table>')
            continue
        if re.match(r'^\s*[-*] ', line):
            items = []
            while i < len(lines) and re.match(r'^\s*[-*] ', lines[i]):
                items.append(ip(re.sub(r'^\s*[-*] ', '', lines[i])))
                i += 1
            out.append('<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>')
            continue
        if re.match(r'^\s*\d+\. ', line):
            items = []
            while i < len(lines) and re.match(r'^\s*\d+\. ', lines[i]):
                items.append(ip(re.sub(r'^\s*\d+\. ', '', lines[i])))
                i += 1
            out.append('<ol>' + ''.join(f'<li>{x}</li>' for x in items) + '</ol>')
            continue
        if line.startswith('### '): out.append(f'<h4>{ip(line[4:])}</h4>'); i += 1; continue
        if line.strip() == '---': out.append('<hr>'); i += 1; continue
        if line.strip():
            # A paragraph runs until a real block marker. Testing startswith('*')
            # here swallowed every line opening with **bold**, which in these
            # files is how each scheme's 依据 / 设计逻辑 / 交互逻辑 begins — the
            # first cut silently dropped one paragraph per scheme.
            def is_block(t):
                return t.startswith(('#', '|')) or re.match(r'^\s*([-*]\s|\d+\.\s)', t) or t.strip() == '---'
            buf = []
            while i < len(lines) and lines[i].strip() and not is_block(lines[i]):
                buf.append(lines[i]); i += 1
            if buf: out.append(f'<p>{ip(" ".join(buf))}</p>')
            else: i += 1
            continue
        i += 1
    return '\n'.join(out)

def ip(s):
    s = html.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    return s

# ── source content ──────────────────────────────────────────────────────────
schemes_md = (D / 'SCHEMES-V2.md').read_text()
decision_md = (D / 'DECISION.md').read_text()

blocks = re.split(r'\n## (?=\d\d · )', schemes_md)
intro = blocks[0]
scheme_blocks = []
for b in blocks[1:]:
    head, _, body = b.partition('\n')
    sid, _, title = head.partition(' · ')
    scheme_blocks.append((sid.strip(), title.strip(), body.strip()))

def section_of(text, start, stop=None):
    m = re.search(re.escape(start), text)
    if not m: return ''
    rest = text[m.end():]
    if stop:
        s = re.search(re.escape(stop), rest)
        if s: rest = rest[:s.start()]
    return rest.strip()

pick = section_of(decision_md, '## 1. 默认选型', '## 2.')
grows = section_of(decision_md, '## 2. 选了 02+01 之后，功能往哪长（这是 Wang 要的那个答案）', '## 3.')

SECTIONS = [('s-how', '怎么读这份东西'), ('s-sheet', '一张总表：十个方案并排')]
SECTIONS += [(f's-{sid}', f'{sid} · {title}') for sid, title, _ in scheme_blocks]
SECTIONS += [('s-pick', '我的推荐（默认值，你随时可以推翻）'), ('s-grow', '选了主线之后，功能往哪长'),
             ('s-night', '这一夜实际做了什么，和没做到的')]

night = """
**这一夜的账，先说不好看的那部分。**

- 上一棒最后一次写盘是 **02:13**，会话死掉，**03:00** 才被接上——**中间 47 分钟没有任何进程在跑**。
- 03:00 之后一直在跑，产出见下。

**做完的（每条都能在分支上复核）**

1. **声明屏此前不在任何走查路径上。** P28 的实现早就 push 了，但三个端到端门禁都还在等一块已经被它挡住的屏，`verify:all` 当场是红的。修好之后 e2e 会走进去、断言它说了什么、并断言它不会在被确认之后还活着。顺带查出两个真 bug：一个 TDZ 崩溃（tsc 看不见，浏览器一进就炸），一个是它在 390×844 上把唯一的动作放在半屏高度、下面空着 390px。
2. **总表是 P28 之前拍的**，每一张「过一遍」都是新用户第一眼看不到的屏。重拍五十帧，并给十个方案各补一张声明屏。
3. **肉眼漏掉的重复**：04 和 06 在同一屏上把「还剩 5 问」印了两遍。已修，并写成门禁——**修之前它在 06 上真的报错**。
4. **不再拿 Notion 说事。** 砍 09 的理由原来挂着「截图推断、未验证」的标记。改成量我们自己的 09：侧栏在 1440 上是 232×900，在 390 上塌成 390×61 的底栏；题干每行从 47–49 字掉到 19–20 字；树的可点行两个视口都是 32px，低于 44px 触控下限。修到下限之后树高从 205px 涨到 250px——**这就是在手机上选树的价格**。
5. **总表上印着的「共同地基」，此前有一条是假的。** 「逃生口 ≥44×44 且与提交同级」——逃生口守住了 44，提交钮一直是 42。写成门禁之后**十个方案里七个当场报错**。已全部改成 44。
6. **01 的顶栏把内容顶出了视口 2px**（`scrollWidth 392 > 390`）：图标钮的 CSS 规则没限定作用域，把带文字的「这题问得不对」压成 36px 的方块，文字渲染到边框外。01 是我推荐的主线之壳，而那句话是总表上写的共同地基之一。已修。
7. **自评那一步十个方案全部合格**（行高 58–65px，最窄一项 115px），没有要修的，门禁是防回归用的。

**没做到 / 仍然是未知**

- **仍然没有走进 Notion 编辑器**（要账号）。但现在不需要它了——命题已经在我们自己的构建上证到了。
- **旗标钮「这题问得不对」在十个方案里都是 32px**，故意留在 44px 门禁之外：抬高它会改变全部十个方案的 chrome 密度，那是设计决定，不是缺陷修复，我不替你做。
- **自评仍然是三档。**「扩到四档」是我写下的默认值，但它动的是已存数据的语义，属于产品改动，等你拍板。
- **十个方案里另外六个的触控下限**只在答题坞和自评这两处量过，不是全屏所有控件都量过。
"""

how = """
**这份东西是干什么的**：十个方案不是十张皮，是**十个不同的产品主张**。每个方案回答一个不同的问题，
依据是一个真正有受众的同类产品（每个都附 App Store 评分人数）。改的是**结构、版式、动效、功能摆放**，不是配色。

**怎么看每一节**：先看「它回答的问题」，再看「交互逻辑」那一段逐步骤的走法——那才是方案本身。
「选它意味着什么」写的是**如果主线走这个方案，产品后面的功能只能往哪长**，以及**它解决不了什么**。

**怎么自己动手看**：本机预览 `http://127.0.0.1:4174/#/schemes`，十个方案在那一页可以直接切换，
切换后整个应用（首页 / 阅读 / 过一遍 / 自评 / 结果）都跟着变。分支 `v7` 已 push。

**「它们真的不一样」这件事是量出来的，不是我说的**：45 对两两像素比较，平均差异 **60.7%**，
最接近的一对 **24.5%**。低于 20% 脚本会直接判红——那是重新贴皮，不是重新设计。

**十个方案共同吃下的地基**（不是某一个方案的卖点）：进第一问之前先声明「说不清是这里的正常状态」·
逃生口 ≥44×44 且与提交同级 · 练习屏常驻「这题问得不对」· 最小字号 ≥12px · 等待态给三段状态线。
"""

CSS = """
:root { --ink:#1B1A17; --ink2:#55524D; --ink3:#7A756C; --line:#DCD6C8; --app:#F4F2ED; --sheet:#FFFEFA; --accent:#0B6079; --flag:#C0381D; }
* { box-sizing:border-box; }
body { margin:0; background:var(--app); color:var(--ink);
  font:16px/1.75 "Hiragino Sans GB","PingFang SC","Songti SC",-apple-system,sans-serif; }
.sheet { max-width:1040px; margin:0 auto; padding:56px 48px 72px; background:var(--sheet); }
h1 { font-size:38px; line-height:1.25; margin:0 0 10px; }
h2 { font-size:26px; margin:56px 0 6px; padding-top:18px; border-top:2px solid var(--ink); }
h3 { font-size:19px; margin:26px 0 6px; }
h4 { font-size:16px; margin:20px 0 4px; color:var(--accent); }
p { margin:10px 0; }
ul,ol { margin:10px 0; padding-left:22px; }
li { margin:5px 0; }
code { font:13px/1.5 Menlo,monospace; background:#EFEDE7; padding:1px 5px; border-radius:3px; }
table { border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; }
th,td { border:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top; }
th { background:#F0EDE6; font-weight:600; }
hr { border:0; border-top:1px solid var(--line); margin:22px 0; }
.lead { color:var(--ink2); font-size:17px; }
.meta { color:var(--ink3); font-size:14px; }
.toc { margin:26px 0 0; padding:20px 24px; border:1px solid var(--line); background:#FBF9F4; }
.toc ol { columns:2; column-gap:36px; padding-left:20px; }
.toc a { color:var(--ink); text-decoration:none; }
.frames { display:flex; gap:14px; margin:18px 0 6px; flex-wrap:wrap; }
.frame { width:236px; }
.frame img { width:100%; display:block; border:1px solid var(--line); border-radius:8px; }
.frame span { display:block; margin-top:6px; font-size:13px; color:var(--ink3); }
.wide img { width:100%; display:block; border:1px solid var(--line); border-radius:8px; margin:14px 0 4px; }
.sheetimg img { width:100%; display:block; border:1px solid var(--line); }
.chip { display:inline-block; margin:0 8px 8px 0; padding:3px 10px; border:1px solid var(--line);
  border-radius:999px; font-size:13px; color:var(--ink2); background:#F6F4EE; }
.num { color:var(--flag); font-weight:700; }
@media print {
  body { background:#fff; }
  .sheet { max-width:none; padding:0 12mm; }
  h2 { break-before:page; page-break-before:always; }
  h2:first-of-type { break-before:auto; page-break-before:auto; }
  .frames, table, .wide, .sheetimg { break-inside:avoid; }
}
"""

def frames_for(sid):
    parts = [('today', '今天（首页）'), ('prime', '进第一问之前的声明屏'), ('run', '过一遍（口试中）')]
    cells = []
    for key, label in parts:
        src = inline(f'{sid}-{key}.jpg')
        if src:
            cells.append(f'<div class="frame"><img src="{src}" alt="{sid} {label}"><span>{label}</span></div>')
    wide = inline(f'{sid}-wide.jpg')
    out = f'<div class="frames">{"".join(cells)}</div>'
    if wide:
        out += f'<div class="wide"><img src="{wide}" alt="{sid} 桌面"><span class="meta">1440 桌面宽度</span></div>'
    return out

body = [f'<h1>我真会 · v7 R2 —— 十个 UI 方案</h1>',
        f'<p class="lead">十个方案，每个回答一个不同的产品问题。依据是 45 个真实产品里筛出来的同类，'
        f'每个附 App Store 评分人数。</p>',
        f'<p class="meta">2026-08-25 · 分支 <code>v7</code> · 本机预览 <code>http://127.0.0.1:4174/#/schemes</code></p>',
        '<div class="toc"><strong>目录</strong><ol>'
        + ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in SECTIONS) + '</ol></div>']

body.append(f'<h2 id="s-how">怎么读这份东西</h2>{md(how)}')

ov = inline('OVERVIEW.jpg')
body.append(f'<h2 id="s-sheet">一张总表：十个方案并排</h2>'
            f'<div class="sheetimg"><img src="{ov}" alt="十个方案总表"></div>'
            f'<p class="meta">左＝今天（首页），右＝过一遍（口试中）。原图在分支上：'
            f'<code>design/v7r2/shots/OVERVIEW.jpg</code></p>'
            + md(section_of(intro, '## 十个方案先放一张总表')))

for sid, title, block in scheme_blocks:
    body.append(f'<h2 id="s-{sid}">{sid} · {html.escape(title)}</h2>{frames_for(sid)}{md(block)}')

body.append(f'<h2 id="s-pick">我的推荐（默认值，你随时可以推翻）</h2>{md(pick)}')
body.append(f'<h2 id="s-grow">选了主线之后，功能往哪长</h2>{md(grows)}')
body.append(f'<h2 id="s-night">这一夜实际做了什么，和没做到的</h2>{md(night)}')

doc = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width,initial-scale=1">'
       '<title>我真会 · v7 R2 · 十个 UI 方案</title>'
       f'<style>{CSS}</style></head><body><div class="sheet">'
       + '\n'.join(body) + '</div></body></html>')

out = D / 'REVIEW.html'
out.write_text(doc)
print('REVIEW.html', f'{out.stat().st_size/1024/1024:.1f} MB', 'sections:', len(SECTIONS))
