(function(global){
  'use strict';

  const clamp=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const clean=arr=>[...new Set((arr||[]).map(Number).filter(n=>n>=1&&n<=45))].sort((a,b)=>a-b);
  const key=arr=>clean(arr).join(',');
  const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));
  const state={running:false,last:null};

  function rows(){
    const source=global.LOTTO_DATA||global.lottoData||[];
    return Array.isArray(source)?source:[];
  }
  function baseSelection(){
    if(global.ScoreFusionEngine&&typeof global.ScoreFusionEngine.currentSelection==='function')return clean(global.ScoreFusionEngine.currentSelection());
    const raw=global.document?.getElementById('comboInput')?.value||'';
    return clean(raw.split(/[\s,]+/));
  }
  function invalidate(){
    try{global.CompanionCombinationEngine?.clearOptimizerCache?.();}catch(e){}
  }
  function nextRound(){
    const all=rows();
    return (all.reduce((m,r)=>Math.max(m,Number(r.round)||0),0)||0)+1;
  }
  function virtualRow(nums){
    return {round:nextRound(),date:'가상 +1회',numbers:clean(nums),bonus:null,__reverseVirtual:true};
  }
  function withVirtualDraw(nums,fn){
    const all=rows();
    const row=virtualRow(nums);
    all.unshift(row);
    invalidate();
    try{return fn(row);}finally{
      const idx=all.indexOf(row);if(idx>=0)all.splice(idx,1);
      invalidate();
    }
  }
  function scopeSignature(){
    let scope='50',bonus='B';
    try{scope=global.document?.querySelector('.range-btn.active')?.dataset?.range||'50';}catch(e){}
    try{bonus=global.document?.getElementById('includeBonus')?.checked===false?'N':'B';}catch(e){}
    return `${scope}|${bonus}|${rows().length}`;
  }
  function createRunCache(base,cutoff){
    const sig=scopeSignature();
    return {base:key(base),cutoff,sig,real:new Map(),virtual:new Map(),gate:new Map()};
  }
  function cacheKey(cache,nums){return `${cache.base}|${key(nums)}|${cache.sig}`;}

  function evaluateReal(base,nums,cache){
    const k=cache?cacheKey(cache,nums):null;
    if(cache&&cache.real.has(k))return cache.real.get(k);
    invalidate();
    const result=global.ScoreFusionEngine?.evaluateCandidate?.(base,nums)||null;
    if(cache)cache.real.set(k,result);
    return result;
  }
  function evaluateVirtualGate(base,nums,cutoff,cache){
    const k=cache?`${cacheKey(cache,nums)}|C${cutoff}`:null;
    if(cache&&cache.gate.has(k))return cache.gate.get(k);
    const result=withVirtualDraw(nums,()=>{
      if(typeof global.ScoreFusionEngine?.evaluateCandidateGate==='function')return global.ScoreFusionEngine.evaluateCandidateGate(base,nums,cutoff);
      const full=global.ScoreFusionEngine?.evaluateCandidate?.(base,nums)||null;
      return full?{...full,pruned:false,upperBound:full.total}:null;
    });
    if(cache)cache.gate.set(k,result);
    return result;
  }
  function evaluateVirtualFull(base,nums,cache){
    const k=cache?cacheKey(cache,nums):null;
    if(cache&&cache.virtual.has(k))return cache.virtual.get(k);
    const result=withVirtualDraw(nums,()=>global.ScoreFusionEngine?.evaluateCandidate?.(base,nums)||null);
    if(cache)cache.virtual.set(k,result);
    return result;
  }
  function decorate(base,nums,real,virtual,replaceCount,extra={}){
    const removed=base.filter(n=>!nums.includes(n));
    const added=nums.filter(n=>!base.includes(n));
    return {
      nums:clean(nums),replaceCount,removed,added,
      real,virtual,
      before:real?.total||0,after:virtual?.total||0,
      delta:(virtual?.total||0)-(real?.total||0),
      targetMet:false,
      ...extra
    };
  }
  function compare(a,b){
    return Number(b.targetMet)-Number(a.targetMet)
      || b.after-a.after
      || b.delta-a.delta
      || (b.virtual?.pattern?.confidence||0)-(a.virtual?.pattern?.confidence||0)
      || a.replaceCount-b.replaceCount
      || key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true});
  }
  function dedupe(items){
    const map=new Map();items.forEach(x=>{const k=key(x.nums);const old=map.get(k);if(!old||compare(x,old)<0)map.set(k,x);});
    return [...map.values()].sort(compare);
  }
  function candidateNumberStats(base,stage){
    const stats=new Map();
    stage.forEach((x,idx)=>x.added.forEach(n=>{
      const v=stats.get(n)||{n,count:0,bestScore:0,sumScore:0,bestDelta:-999,sumDelta:0,bestRank:999,raw:0};
      v.count++;
      v.bestScore=Math.max(v.bestScore,Number(x.after)||0);
      v.sumScore+=Number(x.after)||0;
      v.bestDelta=Math.max(v.bestDelta,Number(x.delta)||0);
      v.sumDelta+=Number(x.delta)||0;
      v.bestRank=Math.min(v.bestRank,idx+1);
      v.raw+=(Math.max(0,(Number(x.after)||0)-50)*2)+Math.max(0,Number(x.delta)||0)*4+Math.max(0,40-idx);
      stats.set(n,v);
    }));
    return [...stats.values()].map(v=>({
      ...v,
      avgScore:v.count?v.sumScore/v.count:0,
      avgDelta:v.count?v.sumDelta/v.count:0
    })).sort((a,b)=>b.raw-a.raw||b.count-a.count||b.bestScore-a.bestScore||b.bestDelta-a.bestDelta||a.n-b.n);
  }
  function candidateNumbersFromStage(base,stage){
    const ranked=candidateNumberStats(base,stage).map(x=>x.n);
    for(let n=1;n<=45;n++)if(!base.includes(n)&&!ranked.includes(n))ranked.push(n);
    return ranked;
  }
  function compressCandidatePool(base,stage,minKeep=8,maxKeep=12){
    const ranked=candidateNumberStats(base,stage);
    if(!ranked.length)return {nums:[],core:[],support:[],details:[],threshold:0};
    const maxRaw=Math.max(1,ranked[0].raw);
    const details=ranked.map((v,idx)=>({
      ...v,
      normalized:Math.round((v.raw/maxRaw)*1000)/10,
      rank:idx+1
    }));
    const baseCount=Math.min(minKeep,details.length);
    let keep=baseCount;
    const anchor=details[Math.max(0,baseCount-1)]?.normalized||0;
    while(keep<Math.min(maxKeep,details.length)){
      const cur=details[keep];
      const prev=details[keep-1];
      const nearAnchor=cur.normalized>=anchor*0.85;
      const smallGap=(prev.normalized-cur.normalized)<=6;
      const strongRepeat=cur.count>=Math.max(2,Math.floor((details[0].count||1)*0.45));
      if(!(nearAnchor||smallGap||strongRepeat))break;
      keep++;
    }
    const chosen=details.slice(0,keep);
    const core=chosen.slice(0,Math.min(8,chosen.length)).map(x=>x.n);
    const support=chosen.slice(8).map(x=>x.n);
    return {nums:chosen.map(x=>x.n),core,support,details:chosen,threshold:anchor};
  }

  async function stageOne(base,target,cutoff,cache,onProgress){
    const out=[];let done=0,pruned=0,total=base.length*(45-base.length);const survivedNumbers=new Set();
    for(const remove of base){
      for(let add=1;add<=45;add++){
        if(base.includes(add))continue;
        const nums=clean(base.filter(n=>n!==remove).concat(add));
        const virtual=evaluateVirtualGate(base,nums,cutoff,cache);
        done++;
        if(!virtual||virtual.pruned){
          pruned++;
        }else{
          survivedNumbers.add(add);
          const real=evaluateReal(base,nums,cache);
          const item=decorate(base,nums,real,virtual,1,{upperBound:virtual.upperBound});
          item.targetMet=item.after>=target;out.push(item);
        }
        if(done%10===0){onProgress?.(`1단계 ${done}/${total} · ${cutoff}점 생존 ${out.length} · 제외 ${pruned}`);await sleep();}
      }
    }
    return {items:dedupe(out),stats:{evaluated:done,pruned,survived:out.length,survivedNumbers:survivedNumbers.size}};
  }

  async function expand(base,seeds,addPool,target,cutoff,cache,depth,onProgress){
    const out=[];const seen=new Set();let ops=0,pruned=0;
    const seedLimit=depth===2?36:40;
    const addLimit=Math.min(addPool.length,depth===2?12:10);
    const survivedNumbers=new Set();
    for(const seed of seeds.slice(0,seedLimit)){
      const removable=base.filter(n=>seed.nums.includes(n));
      for(const remove of removable){
        for(const add of addPool.slice(0,addLimit)){
          if(seed.nums.includes(add))continue;
          const nums=clean(seed.nums.filter(n=>n!==remove).concat(add));
          if(nums.length!==6||base.filter(n=>!nums.includes(n)).length!==depth)continue;
          const k=key(nums);if(seen.has(k))continue;seen.add(k);
          const virtual=evaluateVirtualGate(base,nums,cutoff,cache);
          ops++;
          if(!virtual||virtual.pruned){pruned++;}
          else{
            virtual.added?.forEach?.(n=>survivedNumbers.add(n));
            const real=evaluateReal(base,nums,cache);
            const item=decorate(base,nums,real,virtual,depth,{upperBound:virtual.upperBound});item.targetMet=item.after>=target;out.push(item);
          }
          if(ops%10===0){onProgress?.(`${depth}단계 ${ops}개 검사 · ${cutoff}점 생존 ${out.length} · 제외 ${pruned}`);await sleep();}
        }
      }
    }
    return {items:dedupe(out),stats:{evaluated:ops,pruned,survived:out.length,survivedNumbers:survivedNumbers.size}};
  }

  function inferredNumbers(items,limit=10){
    const m=new Map();
    items.forEach((x,rank)=>x.added.forEach(n=>{
      const v=m.get(n)||{n,count:0,bestScore:0,bestDelta:-999,bestRank:999};
      v.count++;v.bestScore=Math.max(v.bestScore,x.after);v.bestDelta=Math.max(v.bestDelta,x.delta);v.bestRank=Math.min(v.bestRank,rank+1);m.set(n,v);
    }));
    return [...m.values()].sort((a,b)=>b.count-a.count||b.bestScore-a.bestScore||b.bestDelta-a.bestDelta||a.n-b.n).slice(0,limit);
  }

  async function run(opts={}){
    if(state.running)return {error:'이미 역산 분석을 실행 중입니다.'};
    const base=clean(opts.base||baseSelection());
    if(base.length!==6)return {error:'역산 분석은 번호 6개가 필요합니다.'};
    if(!global.ScoreFusionEngine?.evaluateCandidate)return {error:'ScoreFusionEngine 연결이 필요합니다.'};
    const target=Math.max(60,Math.min(98,Number(opts.target)||90));
    const cutoff=Math.max(60,Math.min(target,Number(opts.cutoff)||80));
    const maxReplace=Math.max(1,Math.min(3,Number(opts.maxReplace)||2));
    const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
    const cache=createRunCache(base,cutoff);
    state.running=true;
    try{
      onProgress('현재 Fusion AI Score를 계산하고 있습니다...');
      const baseline=evaluateReal(base,base,cache);
      const sameVirtual=evaluateVirtualFull(base,base,cache);

      onProgress(`1단계 후보를 ${cutoff}점 생존 커트라인으로 선별합니다...`);
      const oneResult=await stageOne(base,target,cutoff,cache,onProgress);
      const one=oneResult.items;
      const stages=[{replaceCount:1,best:one[0]||null,count:oneResult.stats.evaluated,kept:oneResult.stats.survived,pruned:oneResult.stats.pruned,numberCount:oneResult.stats.survivedNumbers,met:one.filter(x=>x.targetMet).length}];
      let pool=one;
      let met=one.filter(x=>x.targetMet);
      const shortlist1=compressCandidatePool(base,one,8,12);
      let shortlist2=null;
      let addPool=shortlist1.nums.length?shortlist1.nums:candidateNumbersFromStage(base,one).slice(0,8);

      if(!met.length&&maxReplace>=2&&one.length){
        onProgress(`2차 압축 ${addPool.length}개(핵심 ${shortlist1.core.length} + 보조 ${shortlist1.support.length})로 2단계 정밀 계산합니다...`);
        const twoResult=await expand(base,one,addPool,target,cutoff,cache,2,onProgress);
        const two=twoResult.items;
        stages.push({replaceCount:2,best:two[0]||null,count:twoResult.stats.evaluated,kept:twoResult.stats.survived,pruned:twoResult.stats.pruned,numberCount:twoResult.stats.survivedNumbers,met:two.filter(x=>x.targetMet).length});
        pool=two;met=two.filter(x=>x.targetMet);
        if(!met.length&&maxReplace>=3&&two.length){
          shortlist2=compressCandidatePool(base,two,8,12);
          const pool3=shortlist2.nums.length?shortlist2.nums:candidateNumbersFromStage(base,two).slice(0,8);
          onProgress(`3단계는 2단계 결과를 다시 ${pool3.length}개로 압축해 정밀 계산합니다...`);
          const threeResult=await expand(base,two,pool3,target,cutoff,cache,3,onProgress);
          const three=threeResult.items;
          stages.push({replaceCount:3,best:three[0]||null,count:threeResult.stats.evaluated,kept:threeResult.stats.survived,pruned:threeResult.stats.pruned,numberCount:threeResult.stats.survivedNumbers,met:three.filter(x=>x.targetMet).length});
          pool=three;met=three.filter(x=>x.targetMet);
        }
      }

      const reachedStage=stages.find(s=>s.met>0);
      let finalPool;
      if(reachedStage){
        const stageItems=reachedStage.replaceCount===1?one:pool;
        finalPool=stageItems.filter(x=>x.targetMet).sort(compare);
      }else{
        finalPool=stages.map(s=>s.best).filter(Boolean).sort(compare);
      }
      const best=finalPool[0]||null;
      const top=finalPool.slice(0,10);
      const inferenceSource=(met.length?met:pool).slice(0,80);
      const totals=stages.reduce((a,s)=>({evaluated:a.evaluated+s.count,kept:a.kept+s.kept,pruned:a.pruned+s.pruned}),{evaluated:0,kept:0,pruned:0});
      const result={
        base,target,cutoff,maxReplace,baseline,sameVirtual,best,top,stages,
        reached:!!reachedStage,reachedReplace:reachedStage?.replaceCount||null,
        inferred:inferredNumbers(inferenceSource,12),
        shortlist:{
          stage1:shortlist1,
          stage2:shortlist2,
          active:(shortlist2&&shortlist2.nums.length)?shortlist2:shortlist1
        },
        virtualRound:nextRound(),totals,
        note:`Fusion 계산식은 변경하지 않았습니다. ${cutoff}점은 연산 중단용 생존 커트라인이며, Classic·동반빈도·유지율을 정확히 계산한 뒤 Pattern이 100점을 받아도 ${cutoff}점에 못 미치는 후보만 제외합니다. 생존 번호가 많으면 2차 압축에서 핵심 8개와 점수차가 작은 보조 후보 최대 4개만 남겨 정밀 역산합니다.`
      };
      state.last=result;return result;
    }catch(e){console.error('ReverseInferenceEngine',e);return {error:e.message||String(e)};}
    finally{state.running=false;invalidate();}
  }

  global.ReverseInferenceEngine=Object.freeze({run,getState:()=>({...state}),evaluateReal,evaluateVirtualFull});
})(window);
