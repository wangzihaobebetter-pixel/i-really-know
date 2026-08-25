"""v7 overview board: ten schemes, three surfaces each, with the evidence on it."""
from PIL import Image, ImageDraw, ImageFont
import json

SCHEMES = [
    ("01", "路径 The Path", "Duolingo", "5,398,782", "清场全屏 · 无导航", "tabs → none · path · clean"),
    ("02", "卡片 The Card", "Quizlet", "1,104,312", "一张全出血的卡", "topbar · deck · card"),
    ("03", "间隔 The Interval", "Anki", "2,319", "评级条写着几天后再问", "toolbar · table · rating"),
    ("04", "解答单 Worked Sheet", "Gauth · Photomath", "1,457,029", "编号解答单", "topbar · scan · steps"),
    ("05", "那页纸 The Page", "Speechify", "517,576", "永远不离开那页纸", "dock · reader · reader"),
    ("06", "时间轴 The Spine", "Structured", "164,657", "通往那几间房的时间线", "rail · timeline · agenda"),
    ("07", "每日一问 The Daily", "Blinkist", "153,947", "今天这一问 + 日历格", "tabs · daily · chapter"),
    ("08", "大纲 The Outline", "Notion", "89,863", "没有卡片，只有一棵树", "sidebar · outline · outline"),
    ("09", "引导 The Programme", "Headspace", "973,869", "四块瓷砖 + 引导程序", "tabs · tiles · guided"),
    ("10", "口试 The Tutor", "Brilliant", "31,957", "上面板 · 下对话", "topbar · panel · split"),
]

CJK = "/System/Library/Fonts/Hiragino Sans GB.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"
f_title = ImageFont.truetype(CJK, 40)
f_lead  = ImageFont.truetype(CJK, 19)
f_name  = ImageFont.truetype(CJK, 22)
f_meta  = ImageFont.truetype(CJK, 15)
f_idea  = ImageFont.truetype(CJK, 15)
f_axes  = ImageFont.truetype(MONO, 12)
f_num   = ImageFont.truetype(MONO, 22)
f_cap   = ImageFont.truetype(CJK, 13)

SW, SH = 300, 650          # one phone shot
COLS, PAD = 5, 26
CARD_W = SW * 2 + 14
CARD_H = SH + 132
HEAD = 150
W = PAD + COLS * (CARD_W + PAD)
H = HEAD + 2 * (CARD_H + PAD) + PAD

board = Image.new("RGB", (W, H), "#F4F2ED")
d = ImageDraw.Draw(board)
d.text((PAD, 34), "我真会 · v7 — 十个 UI 方案", font=f_title, fill="#1B1A17")
d.text((PAD, 88),
       "每个方案对标一个真正有受众的同类产品，改的是结构：导航模型 · 首页构成 · 一次「过一遍」怎么呈现 · logo 怎么处理。颜色是最后 5%。",
       font=f_lead, fill="#55524D")
d.text((PAD, 116),
       "左＝今天（首页）  右＝过一遍（口试中）      45 对两两比较，平均差异 73.5%，最接近的一对 22.6%",
       font=f_lead, fill="#7A756C")

for k, (sid, name, ref, ratings, idea, axes) in enumerate(SCHEMES):
    col, row = k % COLS, k // COLS
    x = PAD + col * (CARD_W + PAD)
    y = HEAD + row * (CARD_H + PAD)
    d.rounded_rectangle([x, y, x + CARD_W, y + CARD_H], 14, fill="#FFFEFA", outline="#DCD6C8")
    d.text((x + 16, y + 14), sid, font=f_num, fill="#C0381D")
    d.text((x + 48, y + 16), name, font=f_name, fill="#1B1A17")
    d.text((x + 16, y + 46), f"对标 {ref} · {ratings} 条评分", font=f_meta, fill="#0B6079")
    d.text((x + 16, y + 68), idea, font=f_idea, fill="#55524D")
    d.text((x + 16, y + 92), axes, font=f_axes, fill="#8A857C")
    for i, surf in enumerate(("today", "run")):
        im = Image.open(f"shots-v7/{sid}-{surf}.png").resize((SW, SH))
        px = x + 8 + i * (SW + 6)
        board.paste(im, (px, y + 114))
        d.rectangle([px, y + 114, px + SW - 1, y + 114 + SH - 1], outline="#E2DCD0")

board.save("shots-v7/OVERVIEW.png")
board.resize((W // 2, H // 2)).save("shots-v7/OVERVIEW-half.png")
print("OVERVIEW.png", board.size)
