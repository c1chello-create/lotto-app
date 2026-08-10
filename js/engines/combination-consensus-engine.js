(function(global){
  'use strict';

  /* =========================================================
     Combination Consensus Engine v0.1
     - 기존 AI / Companion / Fusion / Reverse / Dream 계산식 변경 없음
     - 각 엔진이 이미 선택한 번호를 같은 가중치의 '엔진 표'로 모음
     - 입력 6개는 후보군에서 보존하되 최종 조합을 강제하지 않음
     - 8~12개 번호군으로 압축한 뒤 최대 C(12,6)=924개만 빠르게 1차 비교
     - 정밀 계산은 상위 후보만 실행하여 iPhone 연산 부담 제한
     ========================================================= */

  const VERSION='0.1';
  const CONFIG=Object.freeze({minPool:8,defaultPool:10,maxPool:12,preselect:30,top:10});
  const state={running:false,last:null};
  const clean=arr=>[...new Set((arr||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=45))].sort((a,b)=>a-b);
  const key=arr=>clean(arr).join(',');
  const clamp=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const sleep=(ms=0)=>new Promise(r=>setTimeout(r,ms));

  function currentSelection(){
    const raw=global.document?.getElementById('comboInput')?.value||'';
    return clean(raw.split(/[\s,]+/));
  }
  function currentRange(){
    try{return global.document?.querySelector('.range-btn.active')?.dataset?.range||'50';}catch(e){return'50';}
  }
  function includeBonus(){return global.document?.getElementById('includeBonus')?.checked!==false;}
  function allRows(){
    const rows=(global.LOTTO_DATA||global.lottoData||[]).slice();
    return rows.sort((a,b)=>Number(b.round)-Number(a.round));
  }
  function scopedRows(scope=currentRange()){
    const rows=allRows();
    return scope==='all'?rows:rows.slice(0,Number(scope)||50);
  }
  function rowPool(row,bonus=includeBonus()){
    const nums=clean(row?.numbers||row?.nums||[]);
    const b=Number(row?.bonus);
    if(bonus&&b>=1&&b<=45)nums.push(b);
    return clean(nums);
  }
  function sameBase(a,b){return key(a)===key(b);}

  function sourceBucket(){
    return {
      classic:{id:'classic',label:'Classic AI TOP10',used:false,note:'AI 조합 랭킹의 반복 지지'},
      companion:{id:'companion',label:'Companion',used:false,note:'동반출현 후보 지수'},
      optimizer:{id:'optimizer',label:'AI 최적해',used:false,note:'번호교체 최적해 결과'},
      fusion:{id:'fusion',label:'Fusion AI',used:false,note:'Fusion 추천·대안조합'},
      reverse:{id:'reverse',label:'+1 역산',used:false,note:'역산 압축·추론 번호'},
      dream:{id:'dream',label:'Dream Chain',used:false,note:'AI 최종 판단 번호'}
    };
  }
  function ensureEntry(map,n,baseSet){
    n=Number(n);if(!(n>=1&&n<=45))return null;
    if(!map.has(n))map.set(n,{n,base:baseSet.has(n),sources:new Map()});
    return map.get(n);
  }
  function addSignal(map,baseSet,n,source,score,detail=''){
    const item=ensureEntry(map,n,baseSet);if(!item)return;
    const s=clamp(score);const old=item.sources.get(source);
    if(!old||s>old.score)item.sources.set(source,{score:s,detail});
  }
  function normalizeRaw(raw){
    const entries=[...raw.entries()];
    const max=Math.max(1,...entries.map(x=>Number(x[1]?.value??x[1])||0));
    return entries.map(([n,v])=>({n:Number(n),score:clamp((Number(v?.value??v)||0)/max*100),meta:v}));
  }

  function collectClassic(map,baseSet,sources){
    try{
      if(typeof global.companionAnalysis!=='function'||typeof global.makeRankedCombos!=='function')return null;
      const data=global.companionAnalysis();
      const combos=(global.makeRankedCombos(data)||[]).slice(0,10);
      if(!combos.length)return null;
      const raw=new Map();
      combos.forEach((c,i)=>{
        const rank=Number(c.rank)||i+1;
        const points=Math.max(1,11-rank);
        clean(c.nums).forEach(n=>{
          const v=raw.get(n)||{value:0,count:0,bestRank:99};
          v.value+=points;v.count++;v.bestRank=Math.min(v.bestRank,rank);raw.set(n,v);
        });
      });
      normalizeRaw(raw).forEach(x=>addSignal(map,baseSet,x.n,'classic',x.score,`TOP10 ${x.meta.count}회 · 최고 ${x.meta.bestRank}위`));
      sources.classic.used=true;sources.classic.count=combos.length;
      return {data,combos};
    }catch(e){console.warn('CombinationConsensus classic signal',e);return null;}
  }

  function collectCompanion(map,baseSet,sources,classicData){
    try{
      const data=classicData?.data||(typeof global.companionAnalysis==='function'?global.companionAnalysis():null);
      const top=(data?.top||[]).slice(0,15);
      if(!top.length)return;
      top.forEach((x,i)=>addSignal(map,baseSet,Number(x.n),'companion',Number(x.index)||clamp((top.length-i)/top.length*100),`${x.count||0}회 · 동반지수 ${x.index??'-'}`));
      sources.companion.used=true;sources.companion.count=top.length;
    }catch(e){console.warn('CombinationConsensus companion signal',e);}
  }

  function collectOptimizer(map,baseSet,base,sources){
    try{
      const st=global.ScoreOptimizerPreview?.getState?.();const last=st?.last;
      if(!last||!sameBase(last.base,base)||!last.chosen?.nums?.length)return;
      const rows=[last.chosen,...(last.ties||[]).slice(0,5)].filter(Boolean);
      const raw=new Map();
      rows.forEach((x,i)=>{
        const rankWeight=Math.max(1,rows.length-i);
        clean(x.nums).forEach(n=>raw.set(n,(raw.get(n)||0)+rankWeight));
      });
      normalizeRaw(raw).forEach(x=>addSignal(map,baseSet,x.n,'optimizer',x.score,`최적해${rows.length>1?'·공동해':''} 지지`));
      sources.optimizer.used=true;sources.optimizer.count=rows.length;
    }catch(e){console.warn('CombinationConsensus optimizer signal',e);}
  }

  function collectFusion(map,baseSet,sources){
    try{
      const result=global.ScoreFusionEngine?.analyze?.();
      if(!result||result.error||!result.best)return null;
      const rows=[result.best,...(result.alternatives||[]).slice(0,5)].filter(Boolean);
      const raw=new Map();
      rows.forEach((x,i)=>{
        const rankWeight=Math.max(1,rows.length-i);
        const score=Math.max(1,Number(x.total)||1);
        clean(x.nums).forEach(n=>raw.set(n,(raw.get(n)||0)+rankWeight*score));
      });
      normalizeRaw(raw).forEach(x=>addSignal(map,baseSet,x.n,'fusion',x.score,`Fusion 추천군 반복 지지`));
      sources.fusion.used=true;sources.fusion.count=rows.length;
      return result;
    }catch(e){console.warn('CombinationConsensus fusion signal',e);return null;}
  }

  function collectReverse(map,baseSet,base,sources){
    try{
      const st=global.ReverseInferenceEngine?.getState?.();const last=st?.last;
      if(!last||!sameBase(last.base,base))return;
      const active=last.shortlist?.active;
      let used=false;
      if(active?.details?.length){
        active.details.forEach(x=>addSignal(map,baseSet,x.n,'reverse',Number(x.normalized)||0,`압축 ${x.rank||'-'}위 · ${x.count||0}회 지지`));
        used=true;
      }else if(last.inferred?.length){
        const raw=new Map(last.inferred.map(x=>[x.n,{value:(Number(x.count)||0)*10+(Number(x.bestScore)||0)+(Math.max(0,Number(x.bestDelta)||0)*3),count:x.count}]));
        normalizeRaw(raw).forEach(x=>addSignal(map,baseSet,x.n,'reverse',x.score,`역산 추론 ${x.meta.count||0}회`));
        used=true;
      }
      if(used){sources.reverse.used=true;sources.reverse.count=active?.nums?.length||last.inferred?.length||0;}
    }catch(e){console.warn('CombinationConsensus reverse signal',e);}
  }

  function dreamFinalNumbers(){
    try{
      const root=global.document?.getElementById('dreamPreviewResult')||global.document?.getElementById('dreamChainLab');
      if(!root)return[];
      const labels=[...root.querySelectorAll('b,.combo-guide')];
      const label=labels.find(x=>String(x.textContent||'').includes('AI 최종 판단 번호'));
      if(label){
        let node=label.closest('.combo-guide')||label.parentElement;
        for(let i=0;i<4&&node;i++,node=node.nextElementSibling){
          const balls=node?.querySelectorAll?.('.ball');
          if(balls?.length)return clean([...balls].map(x=>Number(String(x.textContent||'').trim()))).slice(0,6);
        }
      }
      const finalRow=[...root.querySelectorAll('.ai-flow-row.is-final .ball')];
      return clean(finalRow.map(x=>Number(String(x.textContent||'').trim()))).slice(0,6);
    }catch(e){return[];}
  }
  function collectDream(map,baseSet,sources){
    const nums=dreamFinalNumbers();if(!nums.length)return;
    nums.forEach(n=>addSignal(map,baseSet,n,'dream',100,'Dream Chain AI Final'));
    sources.dream.used=true;sources.dream.count=nums.length;
  }

  function finalizeSignals(map,base,sources){
    const active=Object.values(sources).filter(x=>x.used);
    const activeIds=active.map(x=>x.id);
    const baseSet=new Set(base);
    base.forEach(n=>ensureEntry(map,n,baseSet));
    const items=[...map.values()].map(x=>{
      const sourceList=activeIds.map(id=>({id,score:x.sources.get(id)?.score||0,detail:x.sources.get(id)?.detail||''}));
      const sourceCount=sourceList.filter(s=>s.score>0).length;
      const strength=active.length?clamp(sourceList.reduce((s,x)=>s+x.score,0)/active.length):0;
      const supportedAvg=sourceCount?clamp(sourceList.reduce((s,x)=>s+x.score,0)/sourceCount):0;
      const coverage=active.length?clamp(sourceCount/active.length*100):0;
      return {...x,sourceList,sourceCount,strength,supportedAvg,coverage};
    }).sort((a,b)=>b.sourceCount-a.sourceCount||b.strength-a.strength||Number(b.base)-Number(a.base)||a.n-b.n);
    const coreThreshold=active.length>=4?3:active.length>=2?2:1;
    items.forEach(x=>x.group=x.sourceCount>=coreThreshold?'core':x.sourceCount>=2?'strong':'support');
    return {items,active,coreThreshold};
  }

  function compressPool(base,items){
    const chosen=[];const seen=new Set();
    const add=x=>{if(!x||seen.has(x.n)||chosen.length>=CONFIG.maxPool)return;seen.add(x.n);chosen.push(x);};
    // 입력번호는 후보군에서 모두 보존합니다. 이는 최종선정을 강제하는 것이 아니라 탐색 기회를 보존하기 위한 장치입니다.
    base.forEach(n=>add(items.find(x=>x.n===n)||{n,base:true,sourceCount:0,strength:0,supportedAvg:0,coverage:0,group:'support',sourceList:[]}));
    const nonBase=items.filter(x=>!seen.has(x.n));
    nonBase.forEach(x=>{if(chosen.length<CONFIG.defaultPool)add(x);});
    // 10번째와 사실상 동률인 후보는 최대 12개까지 함께 보존합니다.
    if(chosen.length>=CONFIG.defaultPool&&chosen.length<CONFIG.maxPool){
      const rankedChosen=chosen.slice().sort((a,b)=>b.sourceCount-a.sourceCount||b.strength-a.strength||a.n-b.n);
      const boundary=rankedChosen[Math.min(CONFIG.defaultPool-1,rankedChosen.length-1)];
      for(const x of nonBase){
        if(chosen.length>=CONFIG.maxPool)break;
        if(seen.has(x.n))continue;
        if(x.sourceCount===boundary.sourceCount&&Math.abs(x.strength-boundary.strength)<=5)add(x);
      }
    }
    nonBase.forEach(x=>{if(chosen.length<CONFIG.minPool)add(x);});
    return chosen.slice(0,CONFIG.maxPool).sort((a,b)=>a.n-b.n);
  }

  function choose(arr,k){
    const out=[];function rec(start,pick){if(pick.length===k){out.push(pick.slice());return;}for(let i=start;i<=arr.length-(k-pick.length);i++){pick.push(arr[i]);rec(i+1,pick);pick.pop();}}
    rec(0,[]);return out;
  }

  function buildPairMatrix(scope=currentRange(),bonus=includeBonus()){
    const rows=scopedRows(scope);const matrix=new Map();
    rows.forEach(row=>{
      const p=rowPool(row,bonus);
      for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
        const k=p[i]<p[j]?`${p[i]},${p[j]}`:`${p[j]},${p[i]}`;
        matrix.set(k,(matrix.get(k)||0)+1);
      }
    });
    return {rows:rows.length,matrix};
  }
  function quickPairFrequency(nums,pairData){
    const n=clean(nums),rates=[];const sourceCount=Math.max(1,pairData.rows);
    for(let i=0;i<n.length;i++)for(let j=i+1;j<n.length;j++){
      const k=n[i]<n[j]?`${n[i]},${n[j]}`:`${n[j]},${n[i]}`;
      rates.push((pairData.matrix.get(k)||0)/sourceCount);
    }
    const rawAvg=rates.length?rates.reduce((s,v)=>s+v,0)/rates.length:0;
    return clamp(Math.log1p(rawAvg*100)/Math.log1p(8)*100);
  }

  function quickCandidate(nums,base,signalByNumber,pairData){
    const entries=nums.map(n=>signalByNumber.get(n)||{sourceCount:0,strength:0,group:'support'});
    const coreCount=entries.filter(x=>x.group==='core').length;
    const voteSum=entries.reduce((s,x)=>s+(x.sourceCount||0),0);
    const supportAvg=Math.round(entries.reduce((s,x)=>s+(x.strength||0),0)/Math.max(1,entries.length));
    const kept=nums.filter(n=>base.includes(n)).length;
    return {nums:clean(nums),coreCount,voteSum,supportAvg,frequency:quickPairFrequency(nums,pairData),kept,replaceCount:6-kept};
  }
  function quickCompare(a,b){
    return b.coreCount-a.coreCount||b.voteSum-a.voteSum||b.supportAvg-a.supportAvg||b.frequency-a.frequency||b.kept-a.kept||key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true});
  }

  function denseRanks(items,getter,prop){
    const sorted=items.slice().sort((a,b)=>getter(b)-getter(a)||key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true}));
    let rank=0,last=null;
    sorted.forEach((x,i)=>{const value=getter(x);if(last===null||value!==last)rank=i+1;x[prop]=rank;last=value;});
  }
  function overlap(a,b){const s=new Set(a);return b.filter(n=>s.has(n)).length;}
  function diversifiedTop(items,limit=CONFIG.top){
    const selected=[];
    for(const maxOverlap of [4,5,6]){
      for(const x of items){
        if(selected.length>=limit)break;
        if(selected.includes(x))continue;
        if(selected.every(y=>overlap(x.nums,y.nums)<=maxOverlap))selected.push(x);
      }
      if(selected.length>=limit)break;
    }
    return selected.slice(0,limit);
  }

  async function analyze(opts={}){
    if(state.running)return{error:'조합 결집 분석을 이미 실행 중입니다.'};
    const base=clean(opts.base||currentSelection());
    if(base.length!==6)return{error:'조합 결집 분석은 번호 6개가 필요합니다.'};
    const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
    state.running=true;
    try{
      onProgress('각 엔진의 번호 지지 신호를 모으고 있습니다...');
      const baseSet=new Set(base),map=new Map(),sources=sourceBucket();
      const classic=collectClassic(map,baseSet,sources);
      collectCompanion(map,baseSet,sources,classic);
      collectOptimizer(map,baseSet,base,sources);
      const fusionSnapshot=collectFusion(map,baseSet,sources);
      collectReverse(map,baseSet,base,sources);
      collectDream(map,baseSet,sources);
      const signals=finalizeSignals(map,base,sources);
      if(!signals.active.length)return{error:'사용 가능한 엔진 결과를 찾지 못했습니다. 먼저 조합 분석을 실행해 주세요.'};

      const poolEntries=compressPool(base,signals.items);
      const poolNums=poolEntries.map(x=>x.n);
      if(poolNums.length<6)return{error:'결집 후보번호가 부족합니다.'};
      onProgress(`${signals.active.length}개 엔진 신호 → 후보번호 ${poolNums.length}개로 압축했습니다.`);
      await sleep(0);

      const pairData=buildPairMatrix(currentRange(),includeBonus());
      const signalByNumber=new Map(signals.items.map(x=>[x.n,x]));
      const combos=choose(poolNums,6);
      const quick=[];
      for(let i=0;i<combos.length;i++){
        quick.push(quickCandidate(combos[i],base,signalByNumber,pairData));
        if(i&&i%200===0){onProgress(`1차 결집 ${i}/${combos.length}개 비교 중...`);await sleep(0);}
      }
      quick.sort(quickCompare);
      let pre=quick.slice(0,Math.min(CONFIG.preselect,quick.length));
      const baseKey=key(base);
      if(!pre.some(x=>key(x.nums)===baseKey)){
        const benchmark=quick.find(x=>key(x.nums)===baseKey);
        if(benchmark)pre.push(benchmark);
      }

      onProgress(`1차 ${combos.length}개 → 상위 ${pre.length}개만 기존 Fusion·Pattern으로 정밀 확인합니다...`);
      const evaluated=[];
      for(let i=0;i<pre.length;i++){
        const x=pre[i];let fusion=null,pattern=null;
        try{fusion=global.ScoreFusionEngine?.evaluateCandidate?.(base,x.nums)||null;}catch(e){}
        pattern=fusion?.pattern||null;
        if(!pattern){
          try{pattern=(global.CompanionCombinationEngine?.scorePatternComboV3||global.CompanionCombinationEngine?.scorePatternCombo)?.call(global.CompanionCombinationEngine,x.nums,{scope:currentRange(),includeBonus:includeBonus()})||null;}catch(e){}
        }
        evaluated.push({...x,fusion,pattern,fusionScore:Number(fusion?.total)||0,patternScore:Number(pattern?.adjusted??pattern?.score)||0,patternConfidence:Number(pattern?.confidence)||0});
        if(i%3===2){onProgress(`정밀 확인 ${i+1}/${pre.length}개...`);await sleep(0);}
      }

      // 새 가중평균을 만들지 않습니다. 세 관점의 '순위'를 같은 1표로 합산합니다.
      denseRanks(evaluated,x=>x.voteSum*1000+x.supportAvg,'consensusRank');
      denseRanks(evaluated,x=>x.patternScore,'patternRank');
      denseRanks(evaluated,x=>x.fusionScore,'fusionRank');
      evaluated.forEach(x=>x.rankSum=x.consensusRank+x.patternRank+x.fusionRank);
      evaluated.sort((a,b)=>a.rankSum-b.rankSum||b.coreCount-a.coreCount||b.voteSum-a.voteSum||b.fusionScore-a.fusionScore||b.patternScore-a.patternScore||b.kept-a.kept||key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true}));
      evaluated.forEach((x,i)=>x.rawRank=i+1);
      const top=diversifiedTop(evaluated,CONFIG.top).map((x,i)=>({...x,rank:i+1}));
      const benchmark=evaluated.find(x=>key(x.nums)===baseKey)||null;
      const best=top[0]||evaluated[0]||benchmark;
      const groups={
        core:poolEntries.filter(x=>x.group==='core').map(x=>x.n),
        strong:poolEntries.filter(x=>x.group==='strong').map(x=>x.n),
        support:poolEntries.filter(x=>x.group==='support').map(x=>x.n)
      };
      const result={
        version:VERSION,base,scope:currentRange(),includeBonus:includeBonus(),sources,activeSources:signals.active,
        coreThreshold:signals.coreThreshold,signals:signals.items,pool:poolNums,poolEntries,groups,
        combinations:combos.length,preselected:pre.length,evaluated:evaluated.length,benchmark,best,top,
        fusionSnapshot,
        method:'번호별 엔진 합의 → 8~12개 압축 → 6개 조합 전수 1차 → 상위 후보만 기존 Fusion/Pattern 정밀평가 → 합의/Pattern/Fusion 순위합 → 다양성 가드',
        note:'기존 AI·Companion·Fusion·Reverse·Dream 계산식과 점수는 변경하지 않습니다. 최종 결집 순위는 새 가중평균이 아니라 엔진 합의 순위·Companion Pattern 순위·Fusion 순위를 동일 1표로 합산합니다. 입력 6개는 후보군에 남겨 원본 조합의 탐색 기회를 보존합니다.'
      };
      state.last=result;return result;
    }catch(e){console.error('CombinationConsensusEngine',e);return{error:e.message||String(e)};}
    finally{state.running=false;}
  }

  global.CombinationConsensusEngine=Object.freeze({VERSION,CONFIG,analyze,getState:()=>({...state}),currentSelection});
})(window);
