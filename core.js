"use strict";
(function(root){
 const MODES={mock:'模擬面接',q1:'No.1',q2:'No.2',opinion:'No.3・4'};
 const flows={mock:['enter','hand','seat','greet','card','silent','read','q1','prepare','q2','flip','q3','q4','close','review'],q1:['silent','q1','review'],q2:['prepare','q2','review'],opinion:['q3','q4','review']};
 const answerKeys=['read','q1','q2','q3','q4'];
 function validate(value,sets){
  if(!value||value.app!=='eiken-interview-notebook'||value.version!==1||!Array.isArray(value.records)||value.records.length>500)throw Error('対応するバックアップ形式ではありません（上限500件）。');
  const ids=new Set();
  const records=value.records.map(r=>{
   if(!r||typeof r.id!=='string'||!/^[\w-]{1,80}$/.test(r.id)||ids.has(r.id)||!sets.some(s=>s.id===r.setId)||!Object.hasOwn(flows,r.mode)||!Number.isInteger(r.stage)||r.stage<0||r.stage>=flows[r.mode].length||typeof r.complete!=='boolean'||typeof r.updated!=='string'||!Number.isFinite(Date.parse(r.updated))||!r.answers||typeof r.answers!=='object'||Array.isArray(r.answers))throw Error('履歴の内容を確認できません。未対応の問題セットや重複IDがないか確認してください。');
   ids.add(r.id);const answers={};
   for(const key of Object.keys(r.answers)){
    const a=r.answers[key];
    if(!answerKeys.includes(key)||!flows[r.mode].includes(key)||!a||typeof a.text!=='string'||a.text.length>5000||!Number.isInteger(a.rating)||a.rating<0||a.rating>3||typeof a.weak!=='boolean'||!Array.isArray(a.checks)||a.checks.length>10||a.checks.some(b=>typeof b!=='boolean')||!['','yes','no'].includes(a.choice))throw Error('回答データの形式が正しくありません。');
    answers[key]={text:a.text,rating:a.rating,weak:a.weak,checks:[...a.checks],choice:a.choice};
   }
   return {id:r.id,setId:r.setId,mode:r.mode,stage:r.stage,complete:r.complete,updated:r.updated,answers};
  });return {app:value.app,version:1,records};
 }
 function merge(current,incoming){const map=new Map(incoming.map(r=>[r.id,r]));current.forEach(r=>map.set(r.id,r));if(map.size>500)throw Error('履歴が500件を超えるため取り込めません。');return [...map.values()].sort((a,b)=>b.updated.localeCompare(a.updated));}
 const api={MODES,flows,answerKeys,validate,merge,emptyAnswer:()=>({text:'',rating:0,weak:false,checks:[],choice:''}),envelope:records=>({app:'eiken-interview-notebook',version:1,records})};
 root.InterviewCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
