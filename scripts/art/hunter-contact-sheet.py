"""Arrange exact rendered mesh evidence; no model pixels are retouched."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[2]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 25)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 19)
canvas = Image.new('RGB', (1536, 660), '#18212c')
draw = ImageDraw.Draw(canvas)
draw.text((24, 20), 'HUNTER REBUILD / ACTUAL EXPORTED MESHES', font=font, fill='#f3eadb')
entries = [('.art/baseline/hunter.png', 'Original'),
           ('.art/hunter-concept/hunter-review-three-quarter.png', 'Rebuilt / grounded idle'),
           ('.art/hunter-validation/hunter-qa-run-6-hero-front.png', 'Rebuilt / running flight')]
for i, (file, title) in enumerate(entries):
    with Image.open(root / file) as image:
        canvas.paste(image.convert('RGB').resize((512, 512), Image.Resampling.LANCZOS), (i*512, 65))
    draw.text((i*512+256, 600), title, font=font, fill='#f3eadb', anchor='mm')
draw.text((24, 632), 'Offline Cycles mesh review; poses differ. Not browser screenshots or a frame-rate test.', font=small, fill='#c5d0d8')
canvas.save(root / '.art/hunter-concept/hunter-comparison.png')
