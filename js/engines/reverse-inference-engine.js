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
  let __nextRoundCache={source:null,length:-1,value:1};
  function nextRound(){
    const all=rows();
    if(__nextRoundCache.source===all&&__nextRoundCache.length===all.length)return __nextRoundCache.value;
    const value=(all.reduce((m,r)=>Math.max(m,Number(r.round)||0),0)||0)+1;
    __nextRoundCache={source:all,length:all.length,value};
    return value;
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

  // Classic/Frequency 상한 계산 전용. Pattern 엔진 캐시를 건드리지 않습니다.
  function withVirtualDrawLite(nums,fn){
    const all=rows();
    const row=virtualRow(nums);
    all.unshift(row);
    try{return fn(row);}finally{
      const idx=all.indexOf(row);if(idx>=0)all.splice(idx,1);
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
  let __fastRegularSession=false;
  function evaluateVirtualGate(base,nums,cutoff,cache){
    const k=cache?`${cacheKey(cache,nums)}|C${cutoff}`:null;
    if(cache&&cache.gate.has(k))return cache.gate.get(k);
    const sf=global.ScoreFusionEngine;
    let result=null;

    // +1회 일반 역산 Fast v4 경로.
    // 목표점수 정밀역산과 동일하게 싼 안전상한 -> 정확한 상한 -> Pattern 증분계산 순으로 처리합니다.
    // cutoff-0.5 미만일 때만 제외하므로 기존 Fusion 산식/판정값은 바꾸지 않습니다.
    if(__fastRegularSession&&sf?.estimateVirtualUpperBoundFast&&sf?.evaluateCandidateBound&&sf?.completeCandidateFromBound){
      const fast=sf.estimateVirtualUpperBoundFast(base,nums);
      const cutoffNum=Number.isFinite(Number(cutoff))?Number(cutoff):80;
      if(!fast||Number(fast.upperBound)<cutoffNum-0.5){
        result={...(fast||{}),nums:clean(nums),pruned:true,cutoff:cutoffNum,upperBound:Number(fast?.upperBound)||0,fastPruned:true};
      }else{
        const bound=withVirtualDrawLite(nums,()=>sf.evaluateCandidateBound(base,nums));
        if(!bound||Number(bound.upperBound)<cutoffNum-0.5){
          result=bound?{...bound,pruned:true,cutoff:cutoffNum}:null;
        }else{
          const full=sf.completeCandidateFromBound(bound);
          result=full?{...full,cutoff:cutoffNum}:null;
        }
      }
    }else{
      result=withVirtualDraw(nums,()=>{
        if(typeof sf?.evaluateCandidateGate==='function')return sf.evaluateCandidateGate(base,nums,cutoff);
        const full=sf?.evaluateCandidate?.(base,nums)||null;
        return full?{...full,pruned:false,upperBound:full.total}:null;
      });
    }
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
        if(done%30===0||done===total){onProgress?.(`1단계 ${done}/${total} · ${cutoff}점 생존 ${out.length} · 제외 ${pruned}`);await sleep();}
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
          if(ops%24===0||ops===opLimit){onProgress?.(`${depth}단계 ${ops}/${opLimit} · ${cutoff}점 생존 ${out.length} · 제외 ${pruned}`);await sleep();}
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
    const sf=global.ScoreFusionEngine;
    if(!sf?.evaluateCandidateBound||!sf?.completeCandidateFromBound||!sf?.estimateVirtualUpperBoundFast){
      return {error:'Fast v4용 ScoreFusionEngine 연결이 필요합니다.'};
    }
    const pool=clean(opts.pool||candidatePool25());
    if(pool.length!==25)return {error:'🎯 목표점수 정밀 역산은 25개 후보풀을 먼저 확정해야 합니다.'};
    const missing=base.filter(n=>!pool.includes(n));
    if(missing.length)return {error:`현재 분석번호 ${missing.join('·')}번이 25개 후보풀에 없습니다.`};
    const target=Math.max(60,Math.min(98,Number(opts.target)||95));
    const maxReplace=Math.max(1,Math.min(6,Number(opts.maxReplace)||6));
    const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
    const cache=createRunCache(base,target);
    const addPool=pool.filter(n=>!base.includes(n));
    const startedAt=(global.performance&&typeof global.performance.now==='function')?global.performance.now():Date.now();
    const yieldEvery=Math.max(600,Math.min(4000,Number(opts.yieldEvery)||1200));
    state.running=true;
    let sessionStarted=false;
    try{
      onProgress(`25개 후보풀 전체 정밀 역산 준비 · 목표 ${target}점 · Fast v5`);
      // 사용자가 보던 현재점수/현재조합+1회 값은 기존 방식으로 1회만 계산합니다.
      const baseline=evaluateReal(base,base,cache);
      const sameVirtual=evaluateVirtualFull(base,base,cache);
      if(!baseline||!Number.isFinite(Number(baseline.total))){
        throw new Error('현재 Fusion 실제점수 계산에 실패했습니다. 정밀 역산을 중단합니다.');
      }
      if(!sameVirtual||!Number.isFinite(Number(sameVirtual.total))){
        throw new Error('현재 조합 +1회 점수 계산에 실패했습니다. 정밀 역산을 중단합니다.');
      }

      sf.beginPreciseSession?.(base);
      sessionStarted=true;

      const stages=[];
      const stageMap=new Map();
      // Fast v5: 현재 조합(0개 교체) + 1~6개 교체를 모두 포함하면 C(25,6)=177,100개 전체 공간입니다.
      let totalExpected=1;
      for(let depth=1;depth<=maxReplace;depth++){
        const stageTotal=combinations(base,depth).length*combinations(addPool,depth).length;
        totalExpected+=stageTotal;
        const st={replaceCount:depth,count:0,kept:0,pruned:0,met:0,best:null,complete:false,fastPruned:0,exactBound:0};
        stages.push(st);stageMap.set(depth,st);
      }

      const records=[];
      let totalDone=1,targetPruned=0,targetGatePassed=0;
      let exactBoundCount=0,patternEvaluated=1;
      let targetHits=[];

      // 현재 조합 자체의 +1회 결과도 전체 25개 조합 공간의 한 후보로 포함합니다.
      const baseItem=decorate(base,base,baseline,sameVirtual,0,{upperBound:sameVirtual.total});
      baseItem.targetMet=Number(sameVirtual.total)>=target;
      if(baseItem.targetMet)targetHits.push(baseItem);

      // Fast v5 1차: 전체 25개 조합 공간에서 목표점수 가능성이 전혀 없는 후보는 Classic 계산 전 제거합니다.
      // 빠른 상한을 통과한 후보만 정확한 Classic/Frequency 상한과 Pattern을 계산합니다.
      for(let depth=1;depth<=maxReplace;depth++){
        const removals=combinations(base,depth);
        const additions=combinations(addPool,depth);
        const stageTotal=removals.length*additions.length;
        const st=stageMap.get(depth);
        onProgress(`${depth}개 교체 Fast v5 전체탐색 시작 · ${stageTotal.toLocaleString()}개`);
        for(const removed of removals){
          const kept=base.filter(n=>!removed.includes(n));
          for(const added of additions){
            const nums=clean(kept.concat(added));
            const fast=sf.estimateVirtualUpperBoundFast(base,nums);
            const rec={nums,replaceCount:depth,fastUpperBound:Number(fast?.upperBound)||0,bound:null,virtual:null};
            records.push(rec);
            st.count++;totalDone++;

            // final total은 Math.round이므로 target-0.5 미만일 때만 안전하게 제외합니다.
            if(!fast||rec.fastUpperBound<target-0.5){
              st.pruned++;st.fastPruned++;targetPruned++;
            }else{
              const bound=withVirtualDrawLite(nums,()=>sf.evaluateCandidateBound(base,nums));
              rec.bound=bound;exactBoundCount++;st.exactBound++;
              if(!bound||Number(bound.upperBound)<target-0.5){
                st.pruned++;targetPruned++;
              }else{
                st.kept++;targetGatePassed++;
                const virtual=sf.completeCandidateFromBound(bound);
                rec.virtual=virtual;patternEvaluated++;
                if(virtual&&Number(virtual.total)>=target){
                  const real=evaluateReal(base,nums,cache);
                  if(!real||!Number.isFinite(Number(real.total)))throw new Error(`실제점수 계산 실패: ${nums.join('·')}`);
                  const item=decorate(base,nums,real,virtual,depth,{upperBound:bound.upperBound});
                  item.targetMet=true;
                  if(!st.best||compare(item,st.best)<0)st.best=item;
                  st.met++;targetHits.push(item);
                }
              }
            }

            if(totalDone%yieldEvery===0){
              const now=(global.performance&&typeof global.performance.now==='function')?global.performance.now():Date.now();
              const sec=Math.max(.001,(now-startedAt)/1000),rate=Math.round(totalDone/sec);
              onProgress(`${depth}개 교체 ${st.count.toLocaleString()}/${stageTotal.toLocaleString()} · 전체 ${totalDone.toLocaleString()}/${totalExpected.toLocaleString()} · 목표도달 ${targetHits.length}개 · 초당 ${rate.toLocaleString()}개`);
              await sleep();
            }
          }
        }
        st.complete=true;
      }

      targetHits=dedupe(targetHits);
      // 목표점수 역산에서는 높은 점수보다 목표점수에 가장 가까운 조합을 우선합니다.
      // 예: 목표 95이면 95점 조합이 96~98점보다 먼저 표시됩니다.
      const compareTarget=(a,b)=>Math.abs((a.after||0)-target)-Math.abs((b.after||0)-target)
        || a.replaceCount-b.replaceCount
        || (b.virtual?.pattern?.confidence||0)-(a.virtual?.pattern?.confidence||0)
        || b.delta-a.delta
        || key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true});
      targetHits.sort(compareTarget);
      let reached=targetHits.length>0;
      let top=reached?targetHits.slice(0,10):[baseItem];
      let fallbackRefined=0;

      if(!reached){
        // 2차: 목표 95에는 못 미친 후보도 "실제 최고 TOP10"을 정확히 찾기 위해
        // Pattern 없이 Classic/Frequency 상한만 전체 후보에 계산합니다.
        const missingBounds=records.filter(r=>!r.bound);
        onProgress(`목표 ${target}점 이상 조합 없음 · 최고점 TOP10용 상한 계산 ${missingBounds.length.toLocaleString()}개`);
        let bd=0;
        for(const rec of missingBounds){
          rec.bound=withVirtualDrawLite(rec.nums,()=>sf.evaluateCandidateBound(base,rec.nums));
          exactBoundCount++;bd++;
          if(bd%yieldEvery===0){
            onProgress(`최고점 상한 계산 ${bd.toLocaleString()}/${missingBounds.length.toLocaleString()} · Pattern 계산 없음`);
            await sleep();
          }
        }

        const ordered=records.filter(r=>r.bound).sort((a,b)=>
          Number(b.bound.upperBound)-Number(a.bound.upperBound)
          || a.replaceCount-b.replaceCount
          || key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true})
        );

        onProgress(`정확한 최고점 TOP10 확정 · Pattern은 상위 가능 후보에만 계산합니다.`);
        for(let i=0;i<ordered.length;i++){
          const rec=ordered[i],bound=rec.bound;
          const threshold=top.length>=10?(Number(top[9]?.after)||0):-1;
          if(top.length>=10 && Number(bound.upperBound)<threshold-0.5)break;

          let virtual=rec.virtual;
          if(!virtual){
            virtual=sf.completeCandidateFromBound(bound);
            rec.virtual=virtual;patternEvaluated++;fallbackRefined++;
          }
          if(!virtual)continue;
          const exactThreshold=top.length>=10?(Number(top[9]?.after)||0):-1;
          // 가상점수가 현재 TOP10 최저점보다 낮으면 실제점수/상승폭 tie-break 계산 없이도 탈락이 확정됩니다.
          if(top.length>=10&&Number(virtual.total)<exactThreshold)continue;
          const real=evaluateReal(base,rec.nums,cache);
          if(!real||!Number.isFinite(Number(real.total)))throw new Error(`실제점수 계산 실패: ${rec.nums.join('·')}`);
          const item=decorate(base,rec.nums,real,virtual,rec.replaceCount,{upperBound:bound.upperBound,fallbackRefined:true});
          item.targetMet=item.after>=target;
          top=updateTop(top,item,10);
          const st=stageMap.get(rec.replaceCount);
          if(st&&(!st.best||compare(item,st.best)<0))st.best=item;

          if(fallbackRefined>0&&fallbackRefined%40===0){
            onProgress(`최고점 Pattern 정밀계산 ${fallbackRefined.toLocaleString()}개 · 현재 최고 ${top[0]?.after??'-'}점`);
            await sleep();
          }
        }
      }

      const best=top[0]||null;
      const endedAt=(global.performance&&typeof global.performance.now==='function')?global.performance.now():Date.now();
      const elapsedMs=Math.max(0,endedAt-startedAt),elapsedSec=elapsedMs/1000;
      const result={
        mode:'precise',exact:true,engineVersion:'fast-v5-full25',base,target,maxReplace,pool25:pool,poolSize:pool.length,
        baseline,sameVirtual,best,top,stages,reached,targetMatchCount:targetHits.length,
        reachedReplace:reached?(targetHits[0]?.replaceCount||null):null,
        totals:{
          evaluated:totalDone,kept:targetGatePassed,pruned:targetPruned,
          fallbackRefined,totalExpected,exactBounds:exactBoundCount,patternEvaluated
        },
        performance:{
          elapsedMs:Math.round(elapsedMs),elapsedSec:Number(elapsedSec.toFixed(2)),
          perSecond:elapsedSec>0?Math.round(totalDone/elapsedSec):0,yieldEvery
        },
        virtualRound:nextRound(),
        note:`Fast v5는 현재 조합을 포함해 25개 후보풀에서 가능한 6개 조합 C(25,6)=177,100개 전체를 검사합니다. 목표 ${target}점 이상 조합이 있으면 목표점수에 가장 가까운 조합을 우선 표시하고, 목표 미달이면 실제 최고점 TOP10을 확정합니다. 비교 기준 Classic TOP10/정규화 축은 한 번의 정밀 역산 동안 고정하고, 각 후보의 가상 +1회 Classic·동반빈도·Pattern 효과는 다시 계산합니다. Pattern 과거 맵은 1회만 준비하고 후보별 +1 효과만 정확히 증분 적용합니다. 안전한 상한값(branch-and-bound)은 목표 도달이 수학적으로 불가능한 후보만 제외하며 Fusion 가중치와 Pattern 계산식은 변경하지 않습니다.`
      };
      state.last=result;return result;
    }catch(e){
      console.error('ReverseInferenceEngine precise',e);
      return {error:e.message||String(e)};
    }finally{
      if(sessionStarted)try{sf.endPreciseSession?.();}catch(e){}
      state.running=false;invalidate();
    }
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
    const sf=global.ScoreFusionEngine;
    const fastReady=!!(sf?.beginPreciseSession&&sf?.endPreciseSession&&sf?.estimateVirtualUpperBoundFast&&sf?.evaluateCandidateBound&&sf?.completeCandidateFromBound);
    const startedAt=(global.performance&&typeof global.performance.now==='function')?global.performance.now():Date.now();
    state.running=true;
    let sessionStarted=false;
    try{
      onProgress('현재 Fusion AI Score를 계산하고 있습니다...');
      // 현재점수와 현재조합 +1회 점수는 기존 전체 계산으로 1회만 산출합니다.
      const baseline=evaluateReal(base,base,cache);
      const sameVirtual=evaluateVirtualFull(base,base,cache);

      if(fastReady){
        sf.beginPreciseSession(base);
        sessionStarted=true;
        __fastRegularSession=true;
      }
      onProgress(`1단계 후보를 ${cutoff}점 생존 커트라인으로 선별합니다${fastReady?' · Fast v4':''}...`);
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
        await sleep();
        const twoResult=await expand(base,one,addPool,target,cutoff,cache,2,onProgress);
        const two=twoResult.items;
        stages.push({replaceCount:2,best:two[0]||null,count:twoResult.stats.evaluated,kept:twoResult.stats.survived,pruned:twoResult.stats.pruned,numberCount:twoResult.stats.survivedNumbers,met:two.filter(x=>x.targetMet).length});
        pool=two;met=two.filter(x=>x.targetMet);
        if(!met.length&&maxReplace>=3&&two.length){
          shortlist2=compressCandidatePool(base,two,8,12);
          const pool3=shortlist2.nums;
          onProgress(`2단계 결과 → ${pool3.length}개(핵심 ${shortlist2.core.length}+보조 ${shortlist2.support.length})로 다시 압축해 3단계를 계산합니다...`);
          await sleep();
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
        engineVersion:fastReady?'plus1-fast-v4':'legacy',
        performance:(()=>{const ended=(global.performance&&typeof global.performance.now==='function')?global.performance.now():Date.now();return {elapsedMs:Math.round(Math.max(0,ended-startedAt))};})(),
        note:`Fusion 계산식은 변경하지 않았습니다. ${cutoff}점은 1차 연산 중단용 커트라인입니다. ${fastReady?'Fast v4 경로는 목표점수 정밀역산과 같은 사전 Pattern 컨텍스트·안전 상한·후보별 +1 증분계산을 사용합니다. ':''}1단계가 끝나면 생존 번호를 점수·반복·상승폭으로 다시 평가해 핵심 8개와 보조 최대 4개, 총 8~12개로 압축합니다. 이후 단계는 압축된 번호군만 계산하므로 후보 수가 줄어들수록 연산량도 함께 줄어듭니다.`
      };
      state.last=result;return result;
    }catch(e){console.error('ReverseInferenceEngine',e);return {error:e.message||String(e)};}
    finally{
      __fastRegularSession=false;
      if(sessionStarted)try{sf.endPreciseSession?.();}catch(e){}
      state.running=false;invalidate();
    }
  }

  global.ReverseInferenceEngine=Object.freeze({run,runPrecise,getState:()=>({...state}),evaluateReal,evaluateVirtualFull,candidatePool25});
})(window);
