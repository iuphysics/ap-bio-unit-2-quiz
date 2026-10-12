"""Reproduce exact problem/rubric crops from the user-supplied scoring guide.
Usage: python scripts/extract.py /path/to/source.pdf
Requires pymupdf, pillow, numpy. Source PDF is not bundled.
"""
from pathlib import Path
import sys, re, json
import pymupdf as fitz
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
pdf=fitz.open(sys.argv[1]); lines=[]; marks=[]
for pi,pg in enumerate(pdf):
 for b in pg.get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   t=''.join(s['text'] for s in l['spans']).strip();x,y,x1,y1=l['bbox']
   if y<65 or y>764:continue
   a=dict(p=pi,y=y,bottom=y1,x=x,text=t);lines.append(a)
   if re.fullmatch(r'\d+\.',t) and x<55:marks.append(dict(id=int(t[:-1]),p=pi,y=y-4))
marks.sort(key=lambda a:(a['p'],a['y']));lines.sort(key=lambda a:(a['p'],a['y'],a['x']))
assert [m['id'] for m in marks]==list(range(1,278))
def pos(m):return m['p'],m['y']
def between(a,b):return [l for l in lines if pos(a)<=pos(l)<pos(b)]
# Shared experimental setups preceding numbered questions.
contexts=[(2,5,1,marks[1]['y']),(6,8,2,marks[5]['y']),(40,42,23,marks[39]['y']),(57,59,31,marks[56]['y']),(101,103,55,marks[100]['y'])]
# A new shared setup belongs to the next group, not the previous question.
contexts += [(a,b,marks[a-1]['p'],marks[a-1]['y']) for a,b in [(186,188),(190,192),(199,201),(211,212),(214,216),(220,221),(226,228),(240,241),(251,252)]]
contexts += [(16,20,6,marks[15]['y']),(93,95,52,marks[92]['y'])]
context_starts={16:330,93:333}
ends={start-1:dict(p=p,y=context_starts.get(start,69)) for start,last,p,y in contexts}
# Change answer-key graphic colors before rasterization. Pixel filtering would
# damage antialiased black text/diagrams painted over a green background.
clean=fitz.open(sys.argv[1])
streams=set()
for pg in clean:
 streams.update(pg.get_contents());streams.update(x[0] for x in pg.get_xobjects())
pattern=re.compile(rb'([0-9.]+) ([0-9.]+) ([0-9.]+) (rg|RG)\b')
def whiten(m):
 r,g,b=map(float,m.group(1,2,3))
 return b'1 1 1 '+m.group(4) if (r,g,b) in {(0.902,1.0,0.902),(0.228,0.569,0.247),(0.89,1.0,0.871),(0.0,0.502,0.0)} else m.group(0)
for xref in streams:
 raw=clean.xref_stream(xref)
 if raw:clean.update_stream(xref,pattern.sub(whiten,raw))
cache={}
def page_image(p):
 if p not in cache:
  # Omit the decorative page-footer rule so it does not retain blank margins.
  clean[p].draw_rect(fitz.Rect(36,760.5,576,762),color=None,fill=(1,1,1),overlay=True)
  pix=clean[p].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
  cache[p]=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
 return cache[p]
def crops(a,b,name):
 out=[]
 for p in range(a['p'],min(b['p']+1,len(pdf))):
  y0=max(69,a['y']) if p==a['p'] else 69
  y1=min(766,b['y']) if p==b['p'] else 766
  if y1-y0<4:continue
  im=page_image(p).crop((70,int(y0*2),1154,int(y1*2)))
  # Trim empty bottom margin, leaving room around content.
  ink=np.any(np.asarray(im)<220,axis=2);rows=np.flatnonzero(ink.any(axis=1))
  if not len(rows):continue
  im=im.crop((0,0,im.width,min(im.height,int(rows[-1])+12)))
  filename=f'assets/{name}-{p+1}.webp'; 
  im.save(ROOT/filename,'WEBP',quality=95,method=2)
  out.append(dict(src=filename,page=p+1,width=im.width,height=im.height))
 return out
cs={}
for start,last,p,y in contexts:
 cs[start]=crops(dict(p=p,y=context_starts.get(start,69)),dict(p=p,y=y),f'context-{start}')
records=[]
for idx,m in enumerate(marks):
 qid=m['id']; end=ends.get(qid,marks[idx+1] if idx+1<len(marks) else dict(p=len(pdf)-1,y=766));ls=between(m,end)
 q=dict(id=qid,type='mcq' if qid<=183 else 'frq',page=m['p']+1)
 if qid<=183:
  answers=[l for l in ls if re.fullmatch('Answer [A-E]',l['text'])]
  stop=answers[0] if answers else end
  choices=[l for l in between(m,stop) if re.match(r'^\([A-E]\)',l['text'])]
  q['choices']=list(dict.fromkeys(l['text'][1] for l in choices))
  green=[]
  for l in choices:
   for d in pdf[l['p']].get_drawings():
    c=d['fill'];r=d['rect']
    if c and len(c)==3 and c[1]>.97 and .85<c[0]<.96 and r.x0<90 and abs(r.y0-l['y'])<3:green.append(l['text'][1])
  q['correct']=answers[0]['text'][-1] if answers else (list(set(green))[0] if len(set(green))==1 else None)
  if answers and green: assert set(green)=={q['correct']},(qid,green,q['correct'])
  q['explanation']=' '.join(l['text'] for l in between(dict(p=stop['p'],y=stop['y']+1),end)) if answers else ''
  q['explanationSource']='PDF scoring guide' if answers else 'Added study explanation'
  if not answers:q['explanation']=json.loads((ROOT/'scripts/study-explanations.json').read_text())[str(qid)]
  q['answerImages']=crops(stop,end,f'answer-{qid}') if answers else []
 else:
  rub=[l for l in ls if re.match(r'^(Part [A-F](?:\b)|General$|Identification & Explanation$)',l['text'])]
  stop=dict(p=rub[0]['p'],y=rub[0]['y']-5) if rub else dict(p=328,y=69)
  q['answerImages']=crops(stop,end,f'answer-{qid}')
 q['images']=crops(m,stop,f'question-{qid}')
 q['text']='\n'.join(l['text'] for l in between(m,stop))
 q['contextImages']=[]
 for start,last,p,y in contexts:
  if start<=qid<=last:q['contextImages']=cs[start]
 assert q['images'],qid
 if qid<=183:assert q['correct'] in q['choices'],(qid,q['correct'],q['choices'])
 records.append(q)
(ROOT/'questions.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('Extracted',len(records),'questions;',sum(q.get('explanationSource')=='PDF scoring guide' for q in records),'source explanations')
print('Missing study explanations:',[q['id'] for q in records if q['type']=='mcq' and not q['explanation']])
