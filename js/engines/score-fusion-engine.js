(function(global){
  'use strict';

  const WEIGHTS=Object.freeze({classic:60,pattern:20,frequency:15,preservation:5});
  const clamp=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const clean=arr=>[...new Set((arr||[]).map(Number).filter(n=>n>=1&&n<=45))].sort((a,b)=>a-b);
  const key=arr=>clean(arr).join(',');
  const avg=arr=>arr.length?arr.reduce((s,v)=>s+(Number(v)||0),0)/arr.length:0;

  function rows(){
    return (global.LOTTO_DATA||global.lottoData||[]).slice().sort((a,b)=>Number(b.round)-Number(a.round));
  }
  function currentRange(){
    try{
      const active=document.querySelector('.range-btn.active')?.dataset?.range;
      if(active)return active;
    }catch(e){}
    return '50';
  }
  function scopedRows(scope=currentRange()){
    const all=rows();
    return scope==='all'?all:all.slice(0,Number(scope)||50);
  }
  function includeBonus(){
    return document.getElementById('includeBonus')?.checked!==false;
  }
  function rowPool(row,bonus=includeBonus()){
    const nums=clean(row?.numbers||row?.nums||[]);
    if(bonus&&Number(row?.bonus)>=1&&Number(row?.bonus)<=45)nums.push(Number(row.bonus));
    return clean(nums);
  }
  function currentSelection(){
    const raw=document.getElementById('comboInput')?.value||'';
    return clean(raw.split(/[\s,]+/));
  }
  function pairCount(a,b,source){
    let c=0;
    source.forEach(row=>{const p=rowPool(row);if(p.includes(a)&&p.includes(b))c++;});
    return c;
  }
  function combinationPairs(nums){
    const n=clean(nums),out=[];
    for(let i=0;i<n.length;i++)for(let j=i+1;j<n.length;j++)out.push([n[i],n[j]]);
    return out;
  }

  // Reverse precise speed v3: 과거 회차의 쌍출현 행렬을 재사용합니다.
  // 가상 +1회는 행렬을 다시 만들지 않고 해당 후보의 15개 쌍에만 +1 효과를 적용합니다.
  const __pairMatrixCache=new Map();
  let __sortedRealCache={source:null,realLength:-1,first:null,last:null,rows:null};
  function __realRowsSorted(){
    const raw=global.LOTTO_DATA||global.lottoData||[];
    const virtual=(raw[0]&&raw[0].__reverseVirtual)?raw[0]:null;
    const realLength=Math.max(0,raw.length-(virtual?1:0));
    const first=virtual?raw[1]:raw[0],last=raw[raw.length-1];
    if(__sortedRealCache.source===raw&&__sortedRealCache.realLength===realLength&&__sortedRealCache.first===first&&__sortedRealCache.last===last&&__sortedRealCache.rows){
      return {raw,virtual,real:__sortedRealCache.rows};
    }
    const real=(raw||[]).filter(r=>!(r&&r.__reverseVirtual)).slice().sort((a,b)=>Number(b.round)-Number(a.round));
    __sortedRealCache={source:raw,realLength,first,last,rows:real};
    return {raw,virtual,real};
  }
  function __frequencyContext(scope=currentRange()){
    const {virtual,real}=__realRowsSorted();
    const bonus=includeBonus();
    const wanted=scope==='all'?real.length:Math.max(0,(Number(scope)||50)-(virtual?1:0));
    const limit=Math.min(real.length,wanted);
    const first=real[0]?.round||0,last=real[real.length-1]?.round||0;
    const ck=`${real.length}|${first}|${last}|${scope}|${bonus?'B':'N'}|${limit}`;
    let matrix=__pairMatrixCache.get(ck);
    if(!matrix){
      matrix=Array.from({length:46},()=>new Uint16Array(46));
      for(let r=0;r<limit;r++){
        const p=rowPool(real[r],bonus);
        for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){const a=p[i],b=p[j];matrix[a][b]++;matrix[b][a]++;}
      }
      __pairMatrixCache.set(ck,matrix);
    }
    return {matrix,virtualNums:virtual?clean(virtual.numbers||[]):null,sourceCount:limit+(virtual?1:0)};
  }
  function frequencyMetrics(nums,scope=currentRange()){
    const pairs=combinationPairs(nums),ctx=__frequencyContext(scope),vset=ctx.virtualNums?new Set(ctx.virtualNums):null;
    const pairRows=pairs.map(pair=>({pair,count:Number(ctx.matrix[pair[0]]?.[pair[1]]||0)+(vset&&vset.has(pair[0])&&vset.has(pair[1])?1:0)}));
    const maxPossible=Math.max(1,ctx.sourceCount);
    const rates=pairRows.map(x=>x.count/maxPossible);
    const sorted=pairRows.slice().sort((a,b)=>b.count-a.count);
    const top=sorted.slice(0,Math.min(5,sorted.length));
    const rawAvg=avg(rates);
    // 로또 쌍출현의 희소성을 고려한 로그 정규화. 8% 이상이면 강한 빈도로 취급합니다.
    const score=clamp(Math.log1p(rawAvg*100)/Math.log1p(8)*100);
    const numberContributions=clean(nums).map(n=>{
      const related=pairRows.filter(x=>x.pair.includes(n));
      const value=related.length?clamp(Math.log1p(avg(related.map(x=>x.count/maxPossible))*100)/Math.log1p(8)*100):0;
      const links=related.slice().sort((a,b)=>b.count-a.count).slice(0,3).map(x=>({n:x.pair[0]===n?x.pair[1]:x.pair[0],count:x.count}));
      return {n,score:value,links};
    }).sort((a,b)=>b.score-a.score||a.n-b.n);
    return {score,averageRate:Number((rawAvg*100).toFixed(2)),top,numberContributions,sourceCount:ctx.sourceCount};
  }

  // Reverse precise Fast v3:
  // 가상 회차를 lottoData에 실제 삽입하지 않고도 후보 조합 자체가 +1회 출현했을 때의
  // 동반빈도 점수를 정확히 계산합니다. Pattern/Classic은 호출하지 않습니다.
  function virtualSelfFrequencyScore(nums,scope=currentRange()){
    const target=clean(nums);
    if(target.length!==6)return {score:0,averageRate:0,sourceCount:0};
    const {real}=__realRowsSorted();
    const bonus=includeBonus();
    const wanted=scope==='all'?real.length:Math.max(0,(Number(scope)||50)-1);
    const limit=Math.min(real.length,wanted);
    const first=real[0]?.round||0,last=real[real.length-1]?.round||0;
    const ck=`${real.length}|${first}|${last}|${scope}|${bonus?'B':'N'}|${limit}`;
    let matrix=__pairMatrixCache.get(ck);
    if(!matrix){
      matrix=Array.from({length:46},()=>new Uint16Array(46));
      for(let r=0;r<limit;r++){
        const p=rowPool(real[r],bonus);
        for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
          const a=p[i],b=p[j];matrix[a][b]++;matrix[b][a]++;
        }
      }
      __pairMatrixCache.set(ck,matrix);
    }
    const pairs=combinationPairs(target);
    const sourceCount=Math.max(1,limit+1);
    let sumRates=0;
    for(const [a,b] of pairs)sumRates+=(Number(matrix[a]?.[b]||0)+1)/sourceCount;
    const rawAvg=pairs.length?sumRates/pairs.length:0;
    const score=clamp(Math.log1p(rawAvg*100)/Math.log1p(8)*100);
    return {score,averageRate:Number((rawAvg*100).toFixed(2)),sourceCount};
  }

  // 현재 앱의 기존 AI 추천 trust는 최대 98점입니다.
  // 일반 비랭크 후보 정규화 상한(96)보다 넉넉한 98을 사용해 안전한 상한을 만듭니다.
  const FAST_CLASSIC_MAX=98;

  function estimateVirtualUpperBoundFast(baseNums,nums){
    const base=clean(baseNums),target=clean(nums);
    if(base.length!==6||target.length!==6)return null;
    const frequency=virtualSelfFrequencyScore(target);
    const preservation=preservationScore(base,target);
    const known=__preciseSession&&__preciseSession.baseKey===key(base)?__preciseSession.known.get(key(target)):null;
    const classicMax=Number.isFinite(known)&&known>0?known:96;
    const classicContribution=Number((classicMax*WEIGHTS.classic/100).toFixed(1));
    const frequencyContribution=Number((frequency.score*WEIGHTS.frequency/100).toFixed(1));
    const preservationContribution=Number((preservation*WEIGHTS.preservation/100).toFixed(1));
    const maxPatternContribution=WEIGHTS.pattern;
    const upperBound=Number((classicContribution+frequencyContribution+preservationContribution+maxPatternContribution).toFixed(1));
    return {
      nums:target,frequency,preservation,upperBound,
      contributions:{classicMax:classicContribution,patternMax:maxPatternContribution,frequency:frequencyContribution,preservation:preservationContribution}
    };
  }
  function patternMetrics(nums){
    const eng=global.CompanionCombinationEngine;
    if(!eng)return null;
    try{
      const p=(eng.scorePatternComboV3||eng.scorePatternCombo)?.call(eng,clean(nums),{
        scope:currentRange(),includeBonus:includeBonus()
      });
      if(!p)return null;
      return {
        strength:Number(p.strength??p.score??0),
        confidence:Number(p.confidence??0),
        adjusted:Number(p.adjusted??p.score??0),
        components:p.components||{},confidenceParts:p.confidenceParts||{},raw:p
      };
    }catch(e){return null;}
  }
  function patternMetricsVirtual(nums){
    const eng=global.CompanionCombinationEngine;
    const ctx=__preciseSession?.patternContext||__quickVirtualSession?.patternContext;
    if(!eng||!ctx||typeof eng.scorePatternComboV3Virtual!=='function')return patternMetrics(nums);
    try{
      const p=eng.scorePatternComboV3Virtual(clean(nums),ctx);
      if(!p)return null;
      return {
        strength:Number(p.strength??p.score??0),
        confidence:Number(p.confidence??0),
        adjusted:Number(p.adjusted??p.score??0),
        components:p.components||{},confidenceParts:p.confidenceParts||{},raw:p
      };
    }catch(e){return null;}
  }

  function existingCandidates(){
    try{
      if(typeof global.companionAnalysis==='function'&&typeof global.makeRankedCombos==='function'){
        return (global.makeRankedCombos(global.companionAnalysis())||[]).map(x=>({
          nums:clean(x.nums),rank:Number(x.rank)||0,trust:Number(x.trust)||0,parts:x.parts||{},replace:Number(x.replace)||0
        }));
      }
    }catch(e){}
    return [];
  }
  function rawClassic(nums,data,allFreq){
    try{
      if(typeof global.comboScoreParts==='function')return global.comboScoreParts(clean(nums),data,allFreq);
    }catch(e){}
    return {total:0};
  }
  function classicDataset(base,candidates){
    let data=null,allFreq=null;
    try{data=typeof global.companionAnalysis==='function'?global.companionAnalysis():null;}catch(e){}
    try{allFreq=typeof global.frequencyMap==='function'?global.frequencyMap(global.LOTTO_DATA||global.lottoData||[]):null;}catch(e){}
    const all=[{nums:base,source:'current'},...candidates.map(x=>({nums:x.nums,source:'rank',rank:x.rank,known:x.trust}))];
    const scored=all.map(x=>({...x,parts:rawClassic(x.nums,data,allFreq)}));
    const raws=scored.map(x=>Number(x.parts?.total)||0),min=Math.min(...raws),max=Math.max(...raws);
    scored.forEach(x=>{
      if(x.known)x.classic=clamp(x.known);
      else x.classic=clamp(max>min?55+(Number(x.parts?.total||0)-min)/(max-min)*41:75);
    });
    return scored;
  }
  function preservationScore(base,nums){
    const kept=clean(nums).filter(n=>base.includes(n)).length;
    return clamp(kept/Math.max(1,base.length)*100);
  }
  function calculateOne(base,item){
    const pattern=patternMetrics(item.nums)||{strength:0,confidence:0,adjusted:0,components:{},confidenceParts:{}};
    const frequency=frequencyMetrics(item.nums);
    const preservation=preservationScore(base,item.nums);
    const contributions={
      classic:Number((item.classic*WEIGHTS.classic/100).toFixed(1)),
      pattern:Number((pattern.adjusted*WEIGHTS.pattern/100).toFixed(1)),
      frequency:Number((frequency.score*WEIGHTS.frequency/100).toFixed(1)),
      preservation:Number((preservation*WEIGHTS.preservation/100).toFixed(1))
    };
    const total=clamp(Object.values(contributions).reduce((s,v)=>s+v,0));
    const kept=item.nums.filter(n=>base.includes(n));
    const added=item.nums.filter(n=>!base.includes(n));
    const removed=base.filter(n=>!item.nums.includes(n));
    return {...item,pattern,frequency,preservation,contributions,total,kept,added,removed,replaceCount:removed.length};
  }
  function explain(current,best){
    const reasons=[];
    const delta=best.total-current.total;
    reasons.push(`Fusion AI ${current.total} → ${best.total} (${delta>=0?'+':''}${delta})`);
    if(best.frequency.score>current.frequency.score)reasons.push(`동반출현 빈도 ${current.frequency.score} → ${best.frequency.score}`);
    if(best.pattern.adjusted>current.pattern.adjusted)reasons.push(`Confidence 보정 패턴 ${current.pattern.adjusted} → ${best.pattern.adjusted}`);
    if(best.pattern.confidence>current.pattern.confidence)reasons.push(`Confidence ${current.pattern.confidence}% → ${best.pattern.confidence}%`);
    if(best.classic<current.classic)reasons.push(`기존 AI는 ${current.classic} → ${best.classic}로 낮아져 과도한 교체를 경계`);
    else if(best.classic>current.classic)reasons.push(`기존 AI ${current.classic} → ${best.classic}`);
    const link=best.frequency.top[0];
    if(link)reasons.push(`핵심 동반 ${link.pair.join('·')} · ${link.count}회`);
    return reasons.slice(0,5);
  }

  // Reverse precise Fast v3 session.
  // 정밀 역산 1회 동안 비교 기준 TOP10과 Classic 정규화 기준을 고정합니다.
  // 매 후보마다 makeRankedCombos 전체를 다시 생성하던 병목을 제거하면서,
  // 후보 자체의 가상 +1회 효과는 그대로 다시 계산합니다.
  let __preciseSession=null;
  let __quickVirtualSession=null;

  // +1회 가상출현 역산 Fast v5 session.
  // 기존 quick 역산의 Classic/빈도/후보선별 계산식은 그대로 두고,
  // Pattern 가상 +1회 계산에 필요한 과거 맵만 1회 사전계산합니다.
  function beginQuickVirtualSession(){
    let patternContext=null;
    try{
      const eng=global.CompanionCombinationEngine;
      if(typeof eng?.prepareVirtualPatternContext==='function'){
        patternContext=eng.prepareVirtualPatternContext({scope:currentRange(),includeBonus:includeBonus()});
      }
    }catch(e){}
    __quickVirtualSession={patternContext};
    return {patternReady:!!patternContext};
  }
  function endQuickVirtualSession(){__quickVirtualSession=null;}

  function beginPreciseSession(baseNums){
    const base=clean(baseNums);
    if(base.length!==6)return null;
    const candidates=existingCandidates();
    let data=null,allFreq=null;
    try{data=typeof global.companionAnalysis==='function'?global.companionAnalysis():null;}catch(e){}
    try{allFreq=typeof global.frequencyMap==='function'?global.frequencyMap(global.LOTTO_DATA||global.lottoData||[]):null;}catch(e){}
    const refs=[{nums:base,source:'current'},...candidates.map(x=>({nums:x.nums,source:'rank',rank:x.rank,known:x.trust}))];
    const rawRefs=refs.map(x=>({...x,parts:rawClassic(x.nums,data,allFreq)}));
    const raws=rawRefs.map(x=>Number(x.parts?.total)||0);
    const known=new Map(candidates.map(x=>[key(x.nums),clamp(x.trust)]));
    let patternContext=null;
    try{
      const eng=global.CompanionCombinationEngine;
      if(typeof eng?.prepareVirtualPatternContext==='function'){
        patternContext=eng.prepareVirtualPatternContext({scope:currentRange(),includeBonus:includeBonus()});
      }
    }catch(e){}
    __preciseSession={
      baseKey:key(base),candidates:rawRefs,
      minRaw:raws.length?Math.min(...raws):0,
      maxRaw:raws.length?Math.max(...raws):0,
      known,patternContext
    };
    return {baseKey:__preciseSession.baseKey,referenceCount:rawRefs.length,minRaw:__preciseSession.minRaw,maxRaw:__preciseSession.maxRaw};
  }
  function endPreciseSession(){__preciseSession=null;}

  // v1.2 Reverse Inference Fast support
  // 최종 Fusion 계산식은 그대로 유지합니다.
  // Fast Gate는 Pattern을 계산하기 전에 Classic/Frequency/Preservation을 정확히 계산하고,
  // 남은 Pattern이 이론상 100점을 받더라도 cutoff에 못 미치는 후보만 조기 제외합니다.
  function candidateClassicItem(base,target){
    const targetKey=key(target);
    if(__preciseSession&&__preciseSession.baseKey===key(base)){
      let data=null,allFreq=null;
      try{data=typeof global.companionAnalysis==='function'?global.companionAnalysis():null;}catch(e){}
      try{allFreq=typeof global.frequencyMap==='function'?global.frequencyMap(global.LOTTO_DATA||global.lottoData||[]):null;}catch(e){}
      const parts=rawClassic(target,data,allFreq);
      const raw=Number(parts?.total)||0;
      const known=__preciseSession.known.get(targetKey);
      let classic;
      if(Number.isFinite(known)&&known>0)classic=clamp(known);
      else{
        const min=Math.min(__preciseSession.minRaw,raw);
        const max=Math.max(__preciseSession.maxRaw,raw);
        classic=clamp(max>min?55+(raw-min)/(max-min)*41:75);
      }
      return {nums:clean(target),source:'precise',rank:0,known:known||0,parts,classic};
    }

    const candidates=existingCandidates();
    if(!candidates.some(x=>key(x.nums)===targetKey))candidates.push({nums:target,rank:0,trust:0,parts:{},replace:base.filter(n=>!target.includes(n)).length});
    const classic=classicDataset(base,candidates);
    return classic.find(x=>key(x.nums)===targetKey) || classic[0] || null;
  }

  function evaluateCandidateBound(baseNums,nums){
    const base=clean(baseNums),target=clean(nums);
    if(base.length!==6||target.length!==6)return null;
    const item=candidateClassicItem(base,target);
    if(!item)return null;
    const frequency=frequencyMetrics(target);
    const preservation=preservationScore(base,target);
    const classicContribution=Number((item.classic*WEIGHTS.classic/100).toFixed(1));
    const frequencyContribution=Number((frequency.score*WEIGHTS.frequency/100).toFixed(1));
    const preservationContribution=Number((preservation*WEIGHTS.preservation/100).toFixed(1));
    const maxPatternContribution=WEIGHTS.pattern;
    const upperBound=Number((classicContribution+frequencyContribution+preservationContribution+maxPatternContribution).toFixed(1));
    const kept=target.filter(n=>base.includes(n));
    const added=target.filter(n=>!base.includes(n));
    const removed=base.filter(n=>!target.includes(n));
    const source=global.LOTTO_DATA||global.lottoData||[];
    const virtualCandidate=!!(source[0]&&source[0].__reverseVirtual);
    return {
      ...item,nums:target,frequency,preservation,kept,added,removed,replaceCount:removed.length,
      upperBound,__virtualCandidate:virtualCandidate,
      contributions:{classic:classicContribution,pattern:null,frequency:frequencyContribution,preservation:preservationContribution}
    };
  }

  function completeCandidateFromBound(bound){
    if(!bound||!Array.isArray(bound.nums)||bound.nums.length!==6)return null;
    const virtualPatternContext=__preciseSession?.patternContext||__quickVirtualSession?.patternContext;
    const pattern=(bound.__virtualCandidate&&virtualPatternContext?patternMetricsVirtual(bound.nums):patternMetrics(bound.nums))||{strength:0,confidence:0,adjusted:0,components:{},confidenceParts:{}};
    const contributions={
      classic:Number(bound.contributions?.classic)||0,
      pattern:Number((pattern.adjusted*WEIGHTS.pattern/100).toFixed(1)),
      frequency:Number(bound.contributions?.frequency)||0,
      preservation:Number(bound.contributions?.preservation)||0
    };
    const total=clamp(Object.values(contributions).reduce((sum,v)=>sum+(Number(v)||0),0));
    return {...bound,pattern,contributions,total,pruned:false};
  }

  function evaluateCandidateGate(baseNums,nums,cutoff=80){
    const bound=evaluateCandidateBound(baseNums,nums);
    if(!bound)return null;
    const cutoffNum=Number.isFinite(Number(cutoff))?Number(cutoff):80;
    // 최종 total은 Math.round이므로 cutoff-0.5 미만일 때만 안전하게 제외합니다.
    // cutoff=0은 실제점수 전체계산을 뜻하므로 80으로 치환하지 않습니다.
    if(bound.upperBound<cutoffNum-0.5){
      return {...bound,pruned:true,cutoff:cutoffNum};
    }
    const full=completeCandidateFromBound(bound);
    return full?{...full,cutoff:cutoffNum}:null;
  }

  function evaluateCandidate(baseNums,nums){
    const result=evaluateCandidateGate(baseNums,nums,0);
    return result&&result.pruned?null:result;
  }

  function analyze(){
    const base=currentSelection();
    if(base.length!==6)return {error:'Fusion 분석은 번호 6개 입력 후 사용할 수 있습니다.'};
    const candidates=existingCandidates();
    const classic=classicDataset(base,candidates);
    const evaluated=classic.map(x=>calculateOne(base,x)).sort((a,b)=>b.total-a.total||a.replaceCount-b.replaceCount||b.pattern.confidence-a.pattern.confidence);
    const current=evaluated.find(x=>x.source==='current');
    const best=evaluated[0]||current;
    const alternatives=evaluated.filter(x=>x!==best).slice(0,5);
    return {
      base,current,best,alternatives,
      reasons:explain(current,best),
      weights:WEIGHTS,
      scope:currentRange(),includeBonus:includeBonus(),
      generatedAt:new Date().toISOString()
    };
  }

  global.ScoreFusionEngine=Object.freeze({WEIGHTS,analyze,evaluateCandidate,evaluateCandidateGate,evaluateCandidateBound,completeCandidateFromBound,beginPreciseSession,endPreciseSession,beginQuickVirtualSession,endQuickVirtualSession,estimateVirtualUpperBoundFast,virtualSelfFrequencyScore,frequencyMetrics,patternMetrics,currentSelection});
})(window);
