import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,startRound,grade,pool,shuffled,stats,loadState} from '../state.js';
import {readFileSync,existsSync} from 'node:fs';
const questions=JSON.parse(readFileSync(new URL('../questions.json',import.meta.url)));
test('all 277 original questions, answer keys, rubrics, and assets are available',()=>{
 assert.deepEqual(questions.map(q=>q.id),Array.from({length:277},(_,i)=>i+1));
 assert.equal(questions.filter(q=>q.type==='mcq').length,183);
 for(const q of questions){assert.ok(q.images.length,`prompt ${q.id}`);if(q.type==='mcq'){assert.ok(q.choices.includes(q.correct));assert.ok(q.explanation,`explanation ${q.id}`);}else assert.ok(q.answerImages.length,`rubric ${q.id}`);
 for(const im of [...q.images,...q.answerImages,...q.contextImages])assert.ok(existsSync(new URL('../'+im.src,import.meta.url)),im.src);}
});
test('first answer per round counts once, retries recover without erasing missed history',()=>{
 const s=freshState();startRound(s,[1,2],'mcq');assert.equal(grade(s,1,'B',false),true);assert.equal(grade(s,1,'A',true),false);
 assert.deepEqual(pool(questions,s,'missed'),[1]);assert.equal(stats(s,[1,2]).attempts,1);
 startRound(s,pool(questions,s,'missed'),'missed');grade(s,1,'A',true);
 assert.deepEqual(pool(questions,s,'missed'),[]);assert.deepEqual(pool(questions,s,'missed',true),[1]);assert.equal(s.records[1].attempts,2);assert.equal(s.records[1].correctAttempts,1);
});
test('missed round queue stays stable while answers remove items from next round',()=>{
 const s=freshState();startRound(s,[1,2],'mcq');grade(s,1,'B',false);grade(s,2,'B',false);startRound(s,pool(questions,s,'missed'),'missed');grade(s,1,'A',true);
 assert.deepEqual(s.round.order,[1,2]);assert.deepEqual(pool(questions,s,'missed'),[2]);
});
test('shuffle preserves every ID exactly once and never mutates the input',()=>{
 const ids=questions.map(q=>q.id),copy=[...ids];const out=shuffled(ids,()=>0.25);assert.deepEqual(ids,copy);assert.equal(new Set(out).size,277);assert.deepEqual([...out].sort((a,b)=>a-b),ids);assert.notDeepEqual(out,ids);
});
test('FRQ draft, reveal, self grade, and in-progress round survive storage roundtrip',()=>{
 const s=freshState();startRound(s,[184],'frq');s.drafts[184]='(a) Rectangular solid 1';s.round.revealed[184]=true;grade(s,184,'self-assessment',false);
 const restored=loadState({getItem:()=>JSON.stringify(s)},'test');assert.deepEqual(restored,s);assert.deepEqual(pool(questions,restored,'missed'),[184]);assert.equal(grade(restored,184,'self-assessment',true),false);
});
test('bad stored data recovers gracefully',()=>{assert.deepEqual(loadState({getItem:()=>'{bad'},'test'),freshState());assert.deepEqual(loadState({getItem:()=>'{"version":3}'},'test'),freshState());});
test('shared setups are available when related questions are shuffled individually',()=>{
 for(const id of [2,3,4,5,6,7,8,16,17,18,19,20,40,41,42,57,58,59,93,94,95,101,102,103,186,187,188,190,191,192,199,200,201,211,212,214,215,216,220,221,226,227,228,240,241,251,252])assert.ok(questions[id-1].contextImages.length,`context ${id}`);
});
test('clickable choice regions preserve every source pixel in order',()=>{
 for(const q of questions.filter(q=>q.type==='mcq')){
  assert.deepEqual([...new Set(q.regions.filter(r=>r.choice).map(r=>r.choice))],q.choices);
  for(const [index,image] of q.images.entries()){
   let cursor=0;
   for(const region of q.regions.filter(r=>r.image===index)){assert.equal(region.top,cursor,`Q${q.id} gap or overlap`);assert.ok(region.height>0);cursor+=region.height;}
   assert.equal(cursor,image.height,`Q${q.id} cropped content`);
  }
 }
 assert.equal(questions[45].regions.filter(r=>r.choice==='A').length,1,'Q46 directions are not duplicate buttons');
 assert.ok(questions[34].images.length>1,'multi-page diagram fixture');
});
