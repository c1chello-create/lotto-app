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
    return [...stats.values()].map(v=>({...v,avgScore:v.count?v.sumScore/v.count:0,avgDelta:v.count?v.sumDelta/v.count:0}))
      .sort((a,b)=>b.raw-a.raw||b.count-a.count||b.bestScore-a.bestScore||b.bestDelta-a.bestDelta||a.n-b.n);
  }

  function compressCandidatePool(base,stage,minKeep=8,maxKeep=12){
    const ranked=candidateNumberStats(base,stage);
    if(!ranked.length)return {nums:[],core:[],support:[],details:[]};
    const maxRaw=Math.max(1,ranked[0].raw);
    const details=ranked.map((v,idx)=>({...v,normalized:Math.round(v.raw/maxRaw*1000)/10,rank:idx+1}));
    let keep=Math.min(minKeep,details.length);
    const anchor=details[Math.max(0,keep-1)]?.normalized||0;
    while(keep<Math.min(maxKeep,details.length)){
      const cur=details[keep],prev=details[keep-1];
      const near=cur.normalized>=anchor*0.88;
      const gap=(prev.normalized-cur.normalized)<=4;
      if(!(near||gap))break;
      keep++;
    }
    const chosen=details.slice(0,keep);
    return {nums:chosen.map(x=>x.n),core:chosen.slice(0,Math.min(8,chosen.length)).map(x=>x.n),support:chosen.slice(8).map(x=>x.n),details:chosen};
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
    const seedLimit=depth===2?18:12;
    const addLimit=Math.min(addPool.length,depth===2?12:10);
    const opLimit=depth===2?220:140;
    const survivedNumbers=new Set();
    for(const seed of seeds.slice(0,seedLimit)){
      const removable=base.filter(n=>seed.nums.includes(n));
      for(const remove of removable){
        for(const add of addPool.slice(0,addLimit)){
          if(ops>=opLimit)break;
          if(seed.nums.includes(add))continue;
          const nums=clean(seed.nums.filter(n=>n!==remove).concat(add));
          if(nums.length!==6||base.filter(n=>!nums.includes(n)).length!==depth)continue;
          const k=key(nums);if(seen.has(k))continue;seen.add(k);
          const virtual=evaluateVirtualGate(base,nums,cutoff,cache);ops++;
          if(!virtual||virtual.pruned){pruned++;}
          else{
            const real=evaluateReal(base,nums,cache);
            const item=decorate(base,nums,real,virtual,depth,{upperBound:virtual.upperBound});
            item.targetMet=item.after>=target;out.push(item);
            item.added.forEach(n=>survivedNumbers.add(n));
          }
          if(ops%4===0){onProgress?.(`${depth}단계 ${ops}/${opLimit} · ${cutoff}점 생존 ${out.length} · 제외 ${pruned}`);await new Promise(r=>setTimeout(r,8));}
        }
        if(ops>=opLimit)break;
      }
      if(ops>=opLimit)break;
    }
    return {items:dedupe(out),stats:{evaluated:ops,pruned,survived:out.length,survivedNumbers:survivedNumbers.size,limit:opLimit}};
  }

  function inferredNumbers(items,limit=10){
    const m=new Map();
    items.forEach((x,rank)=>x.added.forEach(n=>{
      const v=m.get(n)||{n,count:0,bestScore:0,bestDelta:-999,bestRank:999};
      v.count++;v.bestScore=Math.max(v.bestScore,x.after);v.bestDelta=Math.max(v.bestDelta,x.delta);v.bestRank=Math.min(v.bestRank,rank+1);m.set(n,v);
    }));
    return [...m.values()].sort((a,b)=>b.count-a.count||b.bestScore-a.bestScore||b.bestDelta-a.bestDelta||a.n-b.n).slice(0,limit);
  }


  function candidatePool25(){
    try{
      if(global.CandidatePool25?.isActive?.()){
        const nums=clean(global.CandidatePool25.get?.()||[]);
        if(nums.length===25)return nums;
      }
    }catch(e){}
    try{
      const nums=clean(global.ComboUI?.getState?.()?.candidatePool25||[]);
      if(nums.length===25)return nums;
    }catch(e){}
    try{
      const raw=global.document?.getElementById('candidatePool25Input')?.value||'';
      const nums=clean(raw.split(/[\s,]+/));
      if(nums.length===25)return nums;
    }catch(e){}
    return [];
  }

  function combinations(arr,k){
    const out=[];
    const src=arr.slice();
    function walk(start,acc){
      if(acc.length===k){out.push(acc.slice());return;}
      const need=k-acc.length;
      for(let i=start;i<=src.length-need;i++){
        acc.push(src[i]);walk(i+1,acc);acc.pop();
      }
    }
    walk(0,[]);return out;
  }

  function updateTop(list,item,limit=10){
    if(!item)return list;
    const merged=dedupe(list.concat(item));
    return merged.slice(0,limit);
  }

  async function runPrecise(opts={}){
    if(state.running)return {error:'이미 역산 분석을 실행 중입니다.'};
    const base=clean(opts.base||baseSelection());
    if(base.length!==6)return {error:'정밀 역산은 번호 6개가 필요합니다.'};
    if(!global.ScoreFusionEngine?.evaluateCandidateGate||!global.ScoreFusionEngine?.evaluateCandidate)return {error:'ScoreFusionEngine 연결이 필요합니다.'};
    const pool=clean(opts.pool||candidatePool25());
    if(pool.length!==25)return {error:'🎯 목표점수 정밀 역산은 25개 후보풀을 먼저 확정해야 합니다.'};
    const missing=base.filter(n=>!pool.includes(n));
    if(missing.length)return {error:`현재 분석번호 ${missing.join('·')}번이 25개 후보풀에 없습니다.`};
    const target=Math.max(60,Math.min(98,Number(opts.target)||95));
    const maxReplace=Math.max(1,Math.min(3,Number(opts.maxReplace)||3));
    const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
    const cache=createRunCache(base,target);
    const addPool=pool.filter(n=>!base.includes(n));
    state.running=true;
    try{
      onProgress(`25개 후보풀 정밀 역산 준비 · 목표 ${target}점`);
      const baseline=evaluateReal(base,base,cache);
      const sameVirtual=evaluateVirtualFull(base,base,cache);
      const stages=[];
      let targetHits=[];
      let targetGateSurvivors=[];
      const fallback=[];
      let totalExpected=0,totalDone=0,targetPruned=0,targetGatePassed=0;

      for(let depth=1;depth<=maxReplace;depth++){
        const removals=combinations(base,depth);
        const additions=combinations(addPool,depth);
        const stageTotal=removals.length*additions.length;
        totalExpected+=stageTotal;
      }

      for(let depth=1;depth<=maxReplace;depth++){
        const removals=combinations(base,depth);
        const additions=combinations(addPool,depth);
        const stageTotal=removals.length*additions.length;
        let done=0,pruned=0,gatePassed=0,met=0,stageBest=null;
        onProgress(`${depth}개 교체 완전탐색 시작 · ${stageTotal.toLocaleString()}개 조합`);
        for(const removed of removals){
          const kept=base.filter(n=>!removed.includes(n));
          for(const added of additions){
            const nums=clean(kept.concat(added));
            const virtual=evaluateVirtualGate(base,nums,target,cache);
            done++;totalDone++;
            if(!virtual||virtual.pruned){
              pruned++;targetPruned++;
              fallback.push({nums,replaceCount:depth,upperBound:Number(virtual?.upperBound)||0});
            }else{
              gatePassed++;targetGatePassed++;
              const real=evaluateReal(base,nums,cache);
              const item=decorate(base,nums,real,virtual,depth,{upperBound:virtual.upperBound});
              item.targetMet=item.after>=target;
              if(!stageBest||compare(item,stageBest)<0)stageBest=item;
              targetGateSurvivors.push(item);
              if(item.targetMet){met++;targetHits.push(item);}
            }
            if(totalDone%20===0){
              onProgress(`${depth}개 교체 ${done.toLocaleString()}/${stageTotal.toLocaleString()} · 전체 ${totalDone.toLocaleString()}/${totalExpected.toLocaleString()} · 목표도달 ${targetHits.length}개`);
              await sleep();
            }
          }
        }
        stages.push({replaceCount:depth,count:done,kept:gatePassed,pruned,met,best:stageBest,complete:true});
      }

      targetHits=dedupe(targetHits);
      targetGateSurvivors=dedupe(targetGateSurvivors);
      let reached=targetHits.length>0;
      let top=reached?targetHits.slice(0,10):targetGateSurvivors.slice(0,10);
      let fallbackRefined=0;

      // 목표 도달 조합이 없을 때는 목표 Gate에서 탈락했던 후보도 upperBound 순으로 재검산해
      // 25개 후보풀 전체에서의 실제 최고 TOP10을 정확히 확정합니다.
      if(!reached){
        fallback.sort((a,b)=>b.upperBound-a.upperBound||a.replaceCount-b.replaceCount||key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true}));
        onProgress(`목표 ${target}점 이상 조합 없음 · 실제 최고점 TOP10을 확정하는 중...`);
        for(let i=0;i<fallback.length;i++){
          const f=fallback[i];
          const threshold=top.length>=10?(Number(top[9]?.after)||0):-1;
          if(top.length>=10 && f.upperBound < threshold-0.51)break;
          const virtual=evaluateVirtualFull(base,f.nums,cache);
          fallbackRefined++;
          if(virtual){
            const real=evaluateReal(base,f.nums,cache);
            const item=decorate(base,f.nums,real,virtual,f.replaceCount,{upperBound:f.upperBound,fallbackRefined:true});
            item.targetMet=item.after>=target;
            top=updateTop(top,item,10);
            const st=stages.find(x=>x.replaceCount===f.replaceCount);
            if(st&&(!st.best||compare(item,st.best)<0))st.best=item;
          }
          if(fallbackRefined%20===0){onProgress(`최고점 재검산 ${fallbackRefined.toLocaleString()}개 · 현재 최고 ${top[0]?.after??'-'}점`);await sleep();}
        }
      }

      const best=top[0]||null;
      const result={
        mode:'precise',exact:true,base,target,maxReplace,pool25:pool,poolSize:pool.length,
        baseline,sameVirtual,best,top,stages,reached,targetMatchCount:targetHits.length,
        reachedReplace:reached?(targetHits[0]?.replaceCount||null):null,
        totals:{evaluated:totalDone,kept:targetGatePassed,pruned:targetPruned,fallbackRefined,totalExpected},
        virtualRound:nextRound(),
        note:`25개 후보풀 안에서 1~${maxReplace}개 교체 조합 ${totalDone.toLocaleString()}개를 빠짐없이 검사했습니다. 목표 ${target}점 가능성은 Pattern 최대 기여까지 포함한 안전한 상한값으로 먼저 판정합니다. 목표 도달 조합이 없으면 상한값 순 재검산으로 실제 최고 TOP10을 확정합니다. Fusion 계산식은 변경하지 않았습니다.`
      };
      state.last=result;return result;
    }catch(e){console.error('ReverseInferenceEngine precise',e);return {error:e.message||String(e)};}
    finally{state.running=false;invalidate();}
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
      let addPool=shortlist1.nums;

      if(!met.length&&maxReplace>=2&&one.length&&addPool.length){
        onProgress(`1단계 생존 번호 ${oneResult.stats.survivedNumbers}개 → 2차 후보 ${addPool.length}개(핵심 ${shortlist1.core.length}+보조 ${shortlist1.support.length})로 압축했습니다.`);
        await new Promise(r=>setTimeout(r,20));
        const twoResult=await expand(base,one,addPool,target,cutoff,cache,2,onProgress);
        const two=twoResult.items;
        stages.push({replaceCount:2,best:two[0]||null,count:twoResult.stats.evaluated,kept:twoResult.stats.survived,pruned:twoResult.stats.pruned,numberCount:twoResult.stats.survivedNumbers,met:two.filter(x=>x.targetMet).length});
        pool=two;met=two.filter(x=>x.targetMet);
        if(!met.length&&maxReplace>=3&&two.length){
          shortlist2=compressCandidatePool(base,two,8,12);
          const pool3=shortlist2.nums;
          onProgress(`2단계 결과 → ${pool3.length}개(핵심 ${shortlist2.core.length}+보조 ${shortlist2.support.length})로 다시 압축해 3단계를 계산합니다...`);
          await new Promise(r=>setTimeout(r,20));
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
        shortlist:{stage1:shortlist1,stage2:shortlist2,active:(shortlist2&&shortlist2.nums.length)?shortlist2:shortlist1},
        virtualRound:nextRound(),totals,
        note:`Fusion 계산식은 변경하지 않았습니다. ${cutoff}점은 1차 연산 중단용 커트라인입니다. 1단계가 끝나면 생존 번호를 점수·반복·상승폭으로 다시 평가해 핵심 8개와 보조 최대 4개, 총 8~12개로 압축합니다. 이후 단계는 압축된 번호군만 계산하므로 후보 수가 줄어들수록 연산량도 함께 줄어듭니다.`
      };
      state.last=result;return result;
    }catch(e){console.error('ReverseInferenceEngine',e);return {error:e.message||String(e)};}
    finally{state.running=false;invalidate();}
  }

  global.ReverseInferenceEngine=Object.freeze({run,runPrecise,getState:()=>({...state}),evaluateReal,evaluateVirtualFull,candidatePool25});
})(window);
