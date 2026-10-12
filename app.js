import {freshState,pool,startRound,grade,stats,loadState} from './state.js';
const KEY='cell-study-unit-2-v1';
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=loadState(localStorage,KEY),questions=[],byId={},inspecting=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-state').textContent='Saved on this device';}catch{$('#save-state').textContent='Storage unavailable · keep this tab open';}}
function ids(mode=state.round.mode){return pool(questions,state,mode,$('#include-recovered').checked);}
function begin(mode,shuffle=false){startRound(state,ids(mode),mode,shuffle);inspecting=null;save();render();}
function picture(im,label){return `<a class="image-link" href="${im.src}" target="_blank" rel="noopener" title="Open full-size image"><img class="source-image" src="${im.src}" width="${im.width}" height="${im.height}" alt="${escape(label)} — original PDF page ${im.page}. Open for full size." loading="lazy"></a>`;}
function pictures(images,label){return images.map(im=>picture(im,label)).join('');}
function render(){
 const r=state.round,q=byId[r.order[r.index]],mcqStats=stats(state,questions.filter(q=>q.type==='mcq').map(q=>q.id)),all=stats(state,questions.map(q=>q.id));
 $('#accuracy').textContent=(mcqStats.attempted?Math.round(mcqStats.correct/mcqStats.attempted*100):0)+'%';
 $('#mastery').value=mcqStats.correct;$('#correct-count').textContent=mcqStats.correct+' / 183';$('#attempted-count').textContent=mcqStats.attempted;
 $('#mobile-progress').textContent=`MCQ: ${mcqStats.correct} correct / ${mcqStats.attempted} answered · ${all.missed} need practice`;
 $('#needs-count').textContent=all.missed;$('#missed-count').textContent=all.missed;
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===r.mode);b.setAttribute('aria-current',b.dataset.mode===r.mode?'page':'false');});
 $('#history-control').hidden=r.mode!=='missed';$('#mode-label').textContent=({mcq:'MULTIPLE CHOICE',frq:'FREE RESPONSE',missed:'MISSED-QUESTION PRACTICE'})[r.mode]+(r.shuffle?' / SHUFFLED':'');
 $('#round-position').textContent=r.order.length?`${r.finished?'Round complete':`Problem ${r.index+1} of ${r.order.length}`}`:'Your practice queue';
 const results=Object.values(r.answers),correct=results.filter(a=>a.correct).length;
 $('#round-score').textContent=`This round: ${correct} / ${results.length} correct`;
 $('#quiz-body').setAttribute('aria-busy','false');$('#navigation').hidden=!q||r.finished;
 $('#browse').disabled=!r.order.length;$('#shuffle').disabled=!ids().length;$('#shuffle-side').disabled=!ids().length;
 if(!q){$('#quiz-body').innerHTML=`<div class="question-card completion"><span class="symbol">✓</span><h2>No missed questions to practice.</h2><p>Questions you answer incorrectly appear here automatically.<br>After you get one right in a new round, it leaves this queue.</p><button class="btn btn-primary" id="back-to-mcq">Practice multiple choice →</button></div>`;$('#back-to-mcq').onclick=()=>begin('mcq');return;}
 if(r.finished){$('#quiz-body').innerHTML=`<div class="question-card completion"><span class="symbol">✧</span><p class="eyebrow">ROUND COMPLETE</p><h2>${correct} right. Keep connecting.</h2><p>${results.length} answered · ${r.order.length-results.length} skipped · ${results.length-correct} missed<br>Your saved history stays with you through every shuffle.</p><button class="btn btn-primary" id="again">Shuffle another round ⇄</button><button class="btn" id="review-missed">Practice missed questions →</button></div>`;$('#again').onclick=()=>begin(r.mode,true);$('#review-missed').onclick=()=>begin('missed',true);return;}
 const answered=r.answers[q.id],reveal=r.revealed[q.id];
 $('#previous').disabled=r.index===0;$('#next').textContent=r.index===r.order.length-1?'Finish round ✓':'Next question →';
 $('#quiz-body').innerHTML=`<article class="question-card"><div class="question-head"><h2>Question ${q.id} <span class="source-label">/ ${q.type==='mcq'?'Multiple choice':'Free response'}</span></h2><span class="source-label">PDF · p. ${q.page}</span></div><div class="prompt-area">${q.contextImages.length?`<div class="context"><p class="eyebrow">SHARED EXPERIMENT / CONTEXT</p>${pictures(q.contextImages,'Shared context for question '+q.id)}</div>`:''}${pictures(q.images,'Question '+q.id)}<p class="zoom-hint">Tap any problem image to open it full size.</p><details><summary>Text transcript · use original images for figures and equations</summary><div class="transcript">${escape(q.text)}</div></details></div>${q.type==='mcq'?`<div class="choices-section"><p class="instruction">${answered?'Explore any choice. Your first answer is saved for this round.':'Select an answer to see the explanation.'}</p><div class="choices" role="group" aria-label="Answer choices">${q.choices.map(c=>`<button class="choice ${answered?(c===q.correct?'correct':c===answered.answer?'wrong':''):''} ${answered?.answer===c?'selected':''}" data-choice="${c}" aria-label="Answer ${c}" aria-pressed="${answered?.answer===c}">${c}</button>`).join('')}</div><div id="feedback" aria-live="polite"></div></div>`:`<div class="draft-area ${reveal?'compare':''}"><div><label for="response">Your response</label><textarea id="response" placeholder="Explain your reasoning. Label each part (a), (b), (c)…">${escape(state.drafts[q.id]||'')}</textarea><p class="small">Autosaved on this device. For drawing questions, sketch on paper and describe your graph here.</p><button class="btn btn-primary" id="reveal">${reveal?'Hide answer':'Get answer →'}</button></div>${reveal?`<section class="rubric"><p class="eyebrow">ORIGINAL SCORING GUIDE</p><h3>Compare your reasoning.</h3><p class="small">Check each requested part against the rubric. This is a self-assessment, not automatic grading.</p>${pictures(q.answerImages,'Scoring guide for question '+q.id)}<div class="self-grade"><p>${answered?'Self-assessment saved for this round.':'How did you do?'}</p><button class="btn btn-primary" id="frq-correct" ${answered?'disabled':''}>I got it right ✓</button><button class="btn" id="frq-missed" ${answered?'disabled':''}>Needs practice ↺</button>${answered?`<p>${answered.correct?'Marked correct.':'Added to missed questions.'}</p>`:''}</div></section>`:''}</div>`}</article>`;
 if(q.type==='mcq'){
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answer(b.dataset.choice));
  if(answered)feedback(q,inspecting||answered.answer);
 }else{
  $('#response').oninput=e=>{state.drafts[q.id]=e.target.value;save();};
  $('#reveal').onclick=()=>{r.revealed[q.id]=!reveal;save();render();};
  if(reveal){$('#frq-correct').onclick=()=>{grade(state,q.id,'self-assessment',true);save();render();};$('#frq-missed').onclick=()=>{grade(state,q.id,'self-assessment',false);save();render();};}
 }
}
function feedback(q,choice){const correct=choice===q.correct;$('#feedback').innerHTML=`<section class="feedback ${correct?'':'incorrect'}"><p class="eyebrow">${escape(q.explanationSource)}</p><h3>${correct?`Correct — ${q.correct}`:`Choice ${choice} is incorrect. The answer is ${q.correct}.`}</h3><p>${escape(q.explanation)}</p>${q.answerImages.length?`<details><summary>View the original explanation with all notation</summary>${pictures(q.answerImages,'Original explanation for question '+q.id)}</details>`:''}</section>`;}
function answer(choice){const q=byId[state.round.order[state.round.index]];if(q?.type!=='mcq'||!q.choices.includes(choice)||state.round.finished)return;grade(state,q.id,choice,choice===q.correct);inspecting=choice;save();render();}
function move(delta){const r=state.round;if(delta>0&&r.index===r.order.length-1)r.finished=true;else r.index=Math.max(0,Math.min(r.order.length-1,r.index+delta));inspecting=null;save();render();$('.toolbar').scrollIntoView({behavior:'smooth',block:'start'});}
function library(){const r=state.round;$('#question-grid').innerHTML=r.order.map((id,i)=>`<button class="q-link ${state.records[id]?(state.records[id].latestCorrect?'good':'bad'):''} ${i===r.index?'current':''}" data-index="${i}" aria-label="Question ${id}, ${state.records[id]?(state.records[id].latestCorrect?'correct':'needs practice'):'unanswered'}">${id}</button>`).join('');document.querySelectorAll('[data-index]').forEach(b=>b.onclick=()=>{r.index=Number(b.dataset.index);r.finished=false;inspecting=null;save();$('#navigator').close();render();});$('#navigator').showModal();}
async function init(){try{
 const res=await fetch('./questions.json');if(!res.ok)throw Error('Question bank unavailable');questions=await res.json();byId=Object.fromEntries(questions.map(q=>[q.id,q]));
 const r=state.round;
 if(!r||!['mcq','frq','missed'].includes(r.mode)||!Array.isArray(r.order)||r.order.some(id=>!byId[id])||!Number.isInteger(r.index)||r.index<0||r.index>=Math.max(1,r.order.length)||!r.answers||!r.revealed)startRound(state,pool(questions,state,'mcq'),'mcq');
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(b.dataset.mode!==state.round.mode)begin(b.dataset.mode);});
 $('#previous').onclick=()=>move(-1);$('#next').onclick=()=>move(1);$('#shuffle').onclick=$('#shuffle-side').onclick=()=>begin(state.round.mode,true);
 $('#include-recovered').onchange=()=>begin('missed');$('#browse').onclick=library;$('#close-navigator').onclick=()=>$('#navigator').close();
 $('#reset').onclick=()=>$('#reset-dialog').showModal();$('#cancel-reset').onclick=()=>$('#reset-dialog').close();$('#confirm-reset').onclick=()=>{state=freshState();$('#reset-dialog').close();begin('mcq');};
 document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;if(/^[a-e]$/i.test(e.key)){answer(e.key.toUpperCase());}else if(!state.round.finished&&state.round.order.length&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
 save();render();
}catch(error){$('#quiz-body').innerHTML=`<div class="question-card completion"><h2>Couldn't load the questions.</h2><p>Start the app with <code>npm start</code> and open the local URL, or use its hosted URL.</p><button class="btn" onclick="location.reload()">Try again</button></div>`;console.error(error);}}
init();
