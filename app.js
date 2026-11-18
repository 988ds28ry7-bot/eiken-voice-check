"use strict";
(() => {
 const $=id=>document.getElementById(id),C=window.InterviewCore,sets=window.PRACTICE_SETS;
 const key='eiken-interview-notebook:v1:'+location.pathname.replace(/index\.html$/,'');
 let records=[],active=null,screen='home',clock=null,deadline=0,readonlyStorage=false;
 const clips=new Map();let reviewUrls=[];
 const notice=text=>{$('storage-status').textContent=text;};
 try {const raw=localStorage.getItem(key);if(raw)records=C.validate(JSON.parse(raw),sets).records;notice('回答・自己評価はこのブラウザ内に保存します。');}
 catch{readonlyStorage=true;notice('保存データを読み込めません。この回は一時利用です。既存データは上書きせず、回答はエクスポートできます。');}
 function persist(){if(readonlyStorage)return;try{localStorage.setItem(key,JSON.stringify(C.envelope(records)));notice('回答・自己評価をこのブラウザに保存しました。');}catch{notice('端末に保存できません。ページを閉じる前に「復習・履歴」からエクスポートしてください。');}}
 const set=()=>sets.find(s=>s.id===active.setId);
 const stage=()=>C.flows[active.mode][active.stage];
 let workspaceOpen=false;
 const workspaceEligible=()=>!!active&&screen==='practice'&&['read','q1','q2'].includes(stage());
 function fitWorkspace(){
  if(!workspaceOpen)return;
  const viewport=window.visualViewport;
  const panel=$('answer-workspace');
  panel.style.setProperty('--workspace-top',`${viewport?.offsetTop||0}px`);
  panel.style.setProperty('--workspace-left',`${viewport?.offsetLeft||0}px`);
  panel.style.setProperty('--workspace-height',`${viewport?.height||window.innerHeight}px`);
  panel.style.setProperty('--workspace-width',`${viewport?.width||window.innerWidth}px`);
 }
 function openWorkspace(){
  if(!workspaceEligible())return;
  workspaceOpen=true;
  $('answer-workspace').classList.toggle('reading-workspace',true);
  document.body.classList.toggle('workspace-open',true);
  $('workspace-toolbar').hidden=false;
  $('answer-workspace').setAttribute('data-stage',stage());
  $('workspace-question').hidden=stage()!=='q1';
  $('workspace-question').textContent=stage()==='q1'?set().q1.prompt:'';
  fitWorkspace();
 }
 function closeWorkspace(blur=false){
  if(!workspaceOpen)return;
  if(blur)$('answer').blur();
  workspaceOpen=false;
  $('answer-workspace').classList.toggle('reading-workspace',false);
  document.body.classList.toggle('workspace-open',false);
  $('workspace-toolbar').hidden=true;
  $('workspace-question').hidden=true;
 }
 function answer(name=stage()){return active.answers[name]??=(C.emptyAnswer());}
 function save(){if(!active)return;active.updated=new Date().toISOString();persist();}
 function stopClock(){clearInterval(clock);clock=null;}
 function cleanReviewAudio(){reviewUrls.forEach(URL.revokeObjectURL);reviewUrls=[];document.querySelectorAll('#review audio').forEach(a=>a.pause());}
 function show(name){closeWorkspace(true);screen=name;['home','practice','review','history'].forEach(id=>$(id).hidden=id!==name);$('history-nav').disabled=false;window.scrollTo(0,0);}
 function home(){stopClock();window.VoiceLab?.reset();cleanReviewAudio();show('home');const draft=records.find(r=>!r.complete);$('resume').hidden=!draft;}
 function start(mode,setId){if(records.length>=500){notice('履歴の上限500件に達しました。バックアップ後、履歴から不要な練習を削除してください。');return;}active={id:globalThis.crypto?.randomUUID?.()||`r-${Date.now()}-${Math.random().toString(36).slice(2)}`,setId,mode,stage:0,complete:false,updated:new Date().toISOString(),answers:{}};records.unshift(active);save();renderStage();}
 const staticSteps={
  enter:['入室','ノックして入室する場面です。声に出して応答しましょう。','Please come in.','受験者：May I come in? → Thank you.'],
  hand:['面接カードを渡す','受付で用意する「面接カード」を渡す場面です。後で受け取る「問題カード」とは別です。','May I have your interview card, please?','受験者：Here you are.'],
  seat:['着席する','指示を受けてから座りましょう。','Please have a seat.','受験者：Thank you.'],
  greet:['名前・級の確認と挨拶','名前は架空のもので練習できます。例を見ながら声に出しましょう。','May I have your name? You are taking the Grade 2 test, right? How are you today?','受験者：My name is Alex. / Yes. / I am fine, thank you.'],
  card:['問題カードを受け取る','下のカードに英文と3コマの絵があります。次に20秒間の黙読を行います。','Here is your question card.','受験者：Thank you.'],
  silent:['20秒間の黙読','本文を静かに読みます。開始ボタンを押すと20秒を計ります。画面を離れた場合は20秒をやり直します。','Please read the passage silently for twenty seconds.'],
  read:['タイトルから音読','英文のタイトルから声に出して読んでください。録音して振り返ることもできます。','Please read the passage aloud, starting with the title.'],
  prepare:['No.2の準備・20秒','3コマの展開とカード下の書き出し文を確認しましょう。準備ができたら20秒を開始します。','Look at the pictures and prepare to tell the story. You have twenty seconds to prepare.'],
  flip:['問題カードを裏返す','No.3とNo.4は、カードを見ずに自分の意見を話します。','Please turn the card over.'],
  close:['カードを返して退室','挨拶をして終了です。この後、回答と模範解答を見比べます。','That is the end of the interview. Please return the card. Thank you.','受験者：Here you are. Thank you. Goodbye.']
 };
 function prompt(){if(!active||screen!=='practice')return '';const st=stage();if(st==='q4'&&answer().choice)return set().q4[answer().choice];return $('prompt').textContent;}
 function renderStage(){stopClock();window.VoiceLab?.reset();cleanReviewAudio();if(stage()==='review'){renderReview();return;}show('practice');const s=set(),st=stage(),isAnswer=C.answerKeys.includes(st),timed=['silent','prepare'].includes(st);
  const info=staticSteps[st]||[st==='q1'?'No.1 本文の内容':st==='q2'?'No.2 3コマを説明':st==='q3'?'No.3 テーマへの意見':'No.4 日常生活への意見',st==='q1'?'本文にある根拠を使って答えましょう。':st==='q2'?'カードにある書き出し文から、3コマを順に説明しましょう。':st==='q3'?'自分の立場を述べ、理由を加えましょう。':'Yes / Noを選んでから、続く質問に理由で答えましょう。',st==='q2'?`Please tell the story, beginning with this sentence: ${s.opening}`:s[st].prompt];
  $('stage-label').textContent=C.MODES[active.mode]+' / '+s.topic;$('stage-title').textContent=info[0];$('instruction').textContent=info[1];$('prompt').textContent=info[2]+(st==='q4'&&answer().choice?' '+(answer().choice==='yes'?'Yes. ':'No. ')+s.q4[answer().choice]:'');$('greeting-example').hidden=!info[3];$('greeting-example').textContent=info[3]||'';
  $('progress').max=C.flows[active.mode].length-1;$('progress').value=active.stage;$('progress-text').textContent=`${active.stage+1} / ${C.flows[active.mode].length} ステップ`;
  const front=['card','silent','read','q1','prepare','q2'].includes(st);$('question-card').hidden=!front;$('card-back').hidden=!['flip','q3','q4','close'].includes(st);
  $('passage-title').textContent=s.title;$('passage').textContent=s.passage;$('opening').textContent=s.opening;$('illustrations').innerHTML=window.Illustrations.render(s);
  $('answer-area').hidden=!isAnswer;$('answer').value=isAnswer?answer().text:'';$('branch').hidden=st!=='q4';
  $('open-workspace').hidden=!workspaceEligible();
  for(const choice of ['yes','no'])$(choice).setAttribute('aria-pressed',String(st==='q4'&&answer().choice===choice));
  $('countdown-box').hidden=!timed;$('countdown').textContent='20';$('timer-start').disabled=false;$('timer-status').textContent='説明を確認してから開始してください。';
  $('next').disabled=timed||(st==='q4'&&!answer().choice);$('next').textContent=st==='close'?'振り返りへ →':'次へ →';window.VoiceLab?.prepare(prompt());$('stage-title').focus();
 }
 function startTimer(){window.VoiceLab?.silence();stopClock();deadline=performance.now()+20000;$('timer-start').disabled=true;$('timer-status').textContent='計測中です。';clock=setInterval(()=>{const remaining=Math.max(0,Math.ceil((deadline-performance.now())/1000));$('countdown').textContent=remaining;if(!remaining){stopClock();$('next').disabled=false;$('timer-status').textContent='20秒経過しました。「次へ」で進んでください。';}},100);}
 function make(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function renderReview(){show('review');cleanReviewAudio();$('review-items').replaceChildren();const s=set();
  C.flows[active.mode].filter(k=>C.answerKeys.includes(k)).forEach(k=>{
   const a=answer(k),d=k==='read'?{model:s.title+'\n'+s.passage,explanation:'タイトルから読み、意味のまとまりで区切りましょう。発音や正確さは自動判定しません。',expressions:['意味のまとまりで区切る','聞き手に届く声で話す'],checks:['タイトルから読んだ','文末まで読み切った','意味を意識して区切った']}:s[k];
   const box=make('article',undefined,'card');box.append(make('h2',k==='read'?'音読':k.toUpperCase().replace('Q','No.')));
   if(k!=='read'&&k!=='q2'){const q=make('p',d.prompt,'question-small');q.lang='en';box.append(q);}
   box.append(make('h3','自分の回答'));const own=make('p',a.text||'回答文は未入力です。録音だけの場合は、聞き返して内容を思い出しましょう。','own-answer');own.lang='en';box.append(own);
   if(a.choice)box.append(make('p','最初の回答：'+(a.choice==='yes'?'Yes':'No')));
   const blob=clips.get(active.id+':'+k);if(blob){const url=URL.createObjectURL(blob);reviewUrls.push(url);const audio=make('audio');audio.controls=true;audio.src=url;audio.addEventListener('play',()=>{window.VoiceLab?.silence();document.querySelectorAll('#review audio').forEach(other=>{if(other!==audio)other.pause();});});box.append(audio,make('p','この録音はページを閉じると消えます。','hint'));}
   const details=make('details');details.append(make('summary','模範解答・解説を見る'));const model=make('p',d.model,'model');model.lang='en';details.append(model);if(d.alternative){const alt=make('p','別の立場の例：\n'+d.alternative,'model');alt.lang='en';details.append(alt);}details.append(make('p',d.explanation));details.append(make('h3','使える表現'));d.expressions.forEach(e=>details.append(make('p',e,'expression')));box.append(details);
   box.append(make('h3','回答のポイントを確認'));d.checks.forEach((text,i)=>{const label=make('label',undefined,'check'),input=make('input');input.type='checkbox';input.checked=!!a.checks[i];input.addEventListener('change',()=>{while(a.checks.length<=i)a.checks.push(false);a.checks[i]=input.checked;save();});label.append(input,document.createTextNode(text));box.append(label);});
   const rateLabel=make('label','自己評価'),select=make('select');select.setAttribute('aria-label',k+'の自己評価');['未評価','もう一度練習したい','助けがあれば話せた','自分の言葉で話せた'].forEach((text,i)=>{const option=make('option',text);option.value=i;select.append(option);});select.value=a.rating;select.addEventListener('change',()=>{a.rating=Number(select.value);save();});rateLabel.append(select);box.append(rateLabel);
   const weakLabel=make('label',undefined,'check'),weak=make('input');weak.type='checkbox';weak.checked=a.weak;weak.addEventListener('change',()=>{a.weak=weak.checked;save();});weakLabel.append(weak,document.createTextNode('★ 苦手な問題として残す'));box.append(weakLabel);
   const retry=make('button','この問題をもう一度','secondary');retry.addEventListener('click',()=>{active.complete=true;save();start(k==='read'?'mock':k==='q1'?'q1':k==='q2'?'q2':'opinion',s.id);if(k==='read'){active.stage=C.flows.mock.indexOf('read');save();renderStage();}});box.append(retry);$('review-items').append(box);
  });$('review-heading').focus();
 }
 function renderHistory(){stopClock();window.VoiceLab?.reset();cleanReviewAudio();show('history');$('history-items').replaceChildren();const list=records.filter(r=>!$('weak-only').checked||Object.values(r.answers).some(a=>a.weak));if(!list.length)$('history-items').append(make('p','まだ該当する履歴はありません。短い練習から始めましょう。'));
  list.forEach(r=>{const s=sets.find(s=>s.id===r.setId),box=make('article',undefined,'card');box.append(make('h2',s.topic+' / '+C.MODES[r.mode]),make('p',new Date(r.updated).toLocaleString('ja-JP')+(r.complete?' ・完了':' ・途中'),'hint'));const weak=Object.entries(r.answers).filter(([,a])=>a.weak).map(([k])=>k.toUpperCase()).join('・');if(weak)box.append(make('p','★ '+weak));const open=make('button','回答と振り返りを見る','secondary');open.addEventListener('click',()=>{active=r;renderReview();});box.append(open);if(!r.complete){const resume=make('button','続きから','quiet');resume.addEventListener('click',()=>{active=r;renderStage();});box.append(resume);}const del=make('button','この履歴を削除','quiet');del.addEventListener('click',()=>{if(!confirm('この練習の回答・自己評価を削除しますか？必要なら先にエクスポートしてください。'))return;records=records.filter(x=>x.id!==r.id);for(const k of C.answerKeys)clips.delete(r.id+':'+k);if(active?.id===r.id)active=null;persist();renderHistory();});box.append(del);$('history-items').append(box);});$('history-heading').focus();
 }
 function busy(){return window.VoiceLab?.busy();}
 $('set-select').replaceChildren(...sets.map((s,i)=>{const o=make('option',`${String(i+1).padStart(2,'0')}  ${s.topic} / ${s.title}`);o.value=s.id;return o;}));
 $('begin').addEventListener('click',()=>start($('practice-select').value,$('set-select').value));
 $('resume').addEventListener('click',()=>{active=records.find(r=>!r.complete);if(active)renderStage();});
 $('next').addEventListener('click',()=>{if(busy()||$('next').disabled)return;active.stage++;save();renderStage();});
 $('answer').addEventListener('input',()=>{if(active&&C.answerKeys.includes(stage())){answer().text=$('answer').value;save();}});
 // Keep the original textarea and card mounted: moving or replacing a focused
 // input can stop iOS dictation. Only change the surrounding layout.
 $('answer').addEventListener('pointerdown',openWorkspace);
 $('answer').addEventListener('focus',openWorkspace);
 $('open-workspace').addEventListener('click',openWorkspace);
 $('record-mode').addEventListener('click',openWorkspace);
 $('close-workspace').addEventListener('click',()=>{if(!busy()){closeWorkspace(true);$('open-workspace').focus({preventScroll:true});}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&workspaceOpen&&!busy()){closeWorkspace(true);$('open-workspace').focus({preventScroll:true});}});
 window.visualViewport?.addEventListener('resize',fitWorkspace);
 window.visualViewport?.addEventListener('scroll',fitWorkspace);
 window.addEventListener('resize',fitWorkspace);
 for(const choice of ['yes','no'])$(choice).addEventListener('click',()=>{if(busy())return;window.VoiceLab?.silence();answer().choice=choice;save();for(const ch of ['yes','no'])$(ch).setAttribute('aria-pressed',String(ch===choice));$('prompt').textContent=set().q4.prompt+' '+(choice==='yes'?'Yes. ':'No. ')+set().q4[choice];$('next').disabled=false;window.VoiceLab?.prepare(prompt());});
 $('timer-start').addEventListener('click',startTimer);
 $('leave').addEventListener('click',()=>{if(!busy()){save();home();}});
 $('brand').addEventListener('click',e=>{e.preventDefault();if(!busy()){save();home();}});
 $('history-nav').addEventListener('click',()=>{if(!busy()){save();renderHistory();}});
 $('history-home').addEventListener('click',home);$('weak-only').addEventListener('change',renderHistory);
 $('finish').addEventListener('click',()=>{active.complete=true;save();home();});
 $('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(C.envelope(records),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download='interview-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('transfer-status').textContent='バックアップを作成しました。端末のダウンロード先を確認してください。音声は含まれません。';});
 $('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50000000)throw Error('ファイルが大きすぎます（上限50MB）。');const incoming=C.validate(JSON.parse(await file.text()),sets);records=C.merge(records,incoming.records);persist();renderHistory();$('transfer-status').textContent=`${incoming.records.length}件の取り込み処理が完了しました。重複は現在の履歴を優先します。上部の保存状況も確認してください。`;}catch(err){$('transfer-status').textContent='取り込めませんでした。現在の履歴は変更していません。'+(err instanceof SyntaxError?'JSON形式のバックアップを選んでください。':err.message);}finally{e.target.value='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&clock){stopClock();$('countdown').textContent='20';$('timer-start').disabled=false;$('timer-status').textContent='画面を離れたため停止しました。20秒をもう一度開始してください。';$('next').disabled=true;}});
 window.InterviewApp={prompt,onRecording:blob=>{if(active)clips.set(active.id+':'+stage(),blob);},onDeleteRecording:()=>{if(active)clips.delete(active.id+':'+stage());},onBusy:locked=>{$('leave').disabled=locked;$('history-nav').disabled=locked;$('close-workspace').disabled=locked;for(const id of ['yes','no','timer-start'])$(id).disabled=locked;},canNext:()=>!!active&&!['silent','prepare'].includes(stage())&&(stage()!=='q4'||!!answer().choice)};
 home();
})();
