"""Arrange already-rendered boss reviews without changing model imagery."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont
root=Path(sys.argv[1])
entries=[('ghostTeacher','Ghost teacher'),('ghostGirl','School ghost'),('giantZombie','Giant zombie'),('zombieKing','Zombie king'),('lightningGolem','Lightning golem'),('frankenstein','Frankenstein'),('kraken','Kraken'),('seaWitch','Sea witch'),('werewolfChief','Werewolf chief'),('dracula','Dracula'),('skeletonKnight','Skeleton knight'),('skullKing','Skull king')]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
canvas=Image.new('RGB',(1536,1260),'#18212c');draw=ImageDraw.Draw(canvas)
for i,(id,label) in enumerate(entries):
    x=(i%4)*384;y=(i//4)*420
    with Image.open(root/(id+'.png')) as img:canvas.paste(img.convert('RGB').resize((384,384),Image.Resampling.LANCZOS),(x,y))
    draw.text((x+192,y+401),label,font=font,fill='#eee5d3',anchor='mm')
canvas.save(root/'boss-lineup.png')
