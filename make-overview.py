"""v7 R2 overview: ten product questions, each with its evidence on the card."""
from PIL import Image, ImageDraw, ImageFont

S = [
    ("01","那页纸 The Page","GoodNotes · Speechify","443,855","被追问的时候，我的原文该在哪？","页在上、问在下，页永不被替换","dock · reader · reader · 150/240ms · r18"),
    ("02","我读到的是这句 Read Back","GoodNotes","443,855","系统凭什么问我这一句？","先摊开「我读到 5 处站不住」让你逐条确认","topbar · confirm · anchored · 130/200ms · r8"),
    ("03","说出来 Say It","Babbel","750,907","口试为什么要打字？","先问「这次想怎么被考」，麦克风是唯一动作","tabs · spoken · spoken · 160/320ms · r16"),
    ("04","诚实条 The Honest Bar","Khan · Elevate","649,946","承认不会，为什么比编一个更难？","「我卡住了」和「提交」等大并排","topbar · honest · honest · 125/180ms · r4"),
    ("05","间隔 The Interval","Anki","2,319","自评到底在承诺什么？","按钮上写的是承诺：站住了 · 7 天后再问","toolbar · table · rating · 120/160ms · r5"),
    ("06","关卡 The Gate","Busuu · Structured","264,918","我到底在为哪一场准备？","真实场次是路上的门，每一问为它服务","rail · gates · agenda · 140/260ms · r10"),
    ("07","今日一组 Today's Set","Elevate · Readwise","541,289","今天做到什么程度算做完了？","今天 5 问，做完就结束，只给两行数字","tabs · set · set · 150/400ms · r22"),
    ("08","解答单 Worked Sheet","Gauth · Photomath · Chegg","2,395,115","一次口试结束后留下什么？","编号解答单，可打印；等待是三段状态线","topbar · scan · steps · 130/220ms · r14"),
    ("09","大纲 The Outline","Notion · Notability","542,928","一学期下来这些东西怎么组织？","没有卡片，只有树；阅读另起一套衬线","sidebar · outline · outline · 200/300ms · r5"),
    ("10","卡片 Commit First","Quizlet · Elevate · Busuu","1,744,549","判定之前，能不能先逼我表个态？","打字之前先按一个二值判断","topbar · deck · card · 120/200ms · r12"),
]

CJK="/System/Library/Fonts/Hiragino Sans GB.ttc"; MONO="/System/Library/Fonts/Menlo.ttc"
f_title=ImageFont.truetype(CJK,42); f_lead=ImageFont.truetype(CJK,19)
f_name=ImageFont.truetype(CJK,23); f_ask=ImageFont.truetype(CJK,17)
f_meta=ImageFont.truetype(CJK,15); f_axes=ImageFont.truetype(MONO,12); f_num=ImageFont.truetype(MONO,22)

SW,SH=300,650; COLS,PAD=5,26
CARD_W=SW*2+14; CARD_H=SH+152; HEAD=160
W=PAD+COLS*(CARD_W+PAD); H=HEAD+2*(CARD_H+PAD)+PAD
b=Image.new("RGB",(W,H),"#F4F2ED"); d=ImageDraw.Draw(b)
d.text((PAD,30),"我真会 · v7 R2 — 十个方案，每个回答一个不同的产品问题",font=f_title,fill="#1B1A17")
d.text((PAD,88),"依据是 45 个真实产品里筛出来的同类，每个附 App Store 评分人数。改的是结构、版式、动效、功能摆放——不是配色。",font=f_lead,fill="#55524D")
d.text((PAD,116),"左＝今天（首页）  右＝过一遍（口试中）      45 对两两比较：平均差异 60.6%，最接近的一对 24.4%",font=f_lead,fill="#7A756C")
d.text((PAD,140),"共同地基：逃生口 ≥44×44 且与提交同级 · 练习屏常驻「这题问得不对」· 最小字号 12px · 等待态给三段状态线",font=f_lead,fill="#0B6079")

for k,(sid,name,ref,ratings,ask,idea,axes) in enumerate(S):
    col,row=k%COLS,k//COLS
    x=PAD+col*(CARD_W+PAD); y=HEAD+row*(CARD_H+PAD)
    d.rounded_rectangle([x,y,x+CARD_W,y+CARD_H],14,fill="#FFFEFA",outline="#DCD6C8")
    d.text((x+16,y+14),sid,font=f_num,fill="#C0381D")
    d.text((x+48,y+15),name,font=f_name,fill="#1B1A17")
    d.text((x+16,y+46),ask,font=f_ask,fill="#20201D")
    d.text((x+16,y+70),f"对标 {ref} · {ratings} 条评分",font=f_meta,fill="#0B6079")
    d.text((x+16,y+92),idea,font=f_meta,fill="#55524D")
    d.text((x+16,y+114),axes,font=f_axes,fill="#8A857C")
    for i,s in enumerate(("today","run")):
        im=Image.open(f"shots-v7r2/{sid}-{s}.png").resize((SW,SH))
        px=x+8+i*(SW+6); b.paste(im,(px,y+134))
        d.rectangle([px,y+134,px+SW-1,y+134+SH-1],outline="#E2DCD0")
b.save("shots-v7r2/OVERVIEW.png"); b.resize((W//2,H//2)).save("shots-v7r2/OVERVIEW-half.png")
print("OVERVIEW",b.size)
