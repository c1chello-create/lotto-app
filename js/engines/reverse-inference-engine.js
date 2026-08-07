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
    // lottoData는 최신 회차가 앞에 정렬되어 있으므로 같은 배열에 임시 삽입합니다.
    all.unshift(row);
    invalidate();
    try{return fn(row);}finally{
      const idx=all.indexOf(row);if(idx>=0)all.splice(idx,1);
      invalidate();
    }
  }
  function evaluateReal(base,nums){
    invalidate();
    return global.ScoreFusionEngine?.evaluateCandidate?.(base,nums)||null;
  }
  function evaluateVirtual(base,nums){
    return withVirtualDraw(nums,()=>global.ScoreFusionEngine?.evaluateCandidate?.(base,nums)||null);
  }
  function decorate(base,nums,real,virtual,replaceCount){
    const removed=base.filter(n=>!nums.includes(n));
    const added=nums.filter(n=>!base.includes(n));
    return {
      nums:clean(nums),replaceCount,removed,added,
      real,virtual,
      before:real?.total||0,after:virtual?.total||0,
      delta:(virtual?.total||0)-(real?.total||0),
      targetMet:false
    };
  }
  function compare(a,b){
    return Number(b.targetMet)-Number(a.targetMet)
      || b.after-a.after
      || b.delta-a.delta
      || b.virtual?.pattern?.confidence-a.virtual?.pattern?.confidence
      || a.replaceCount-b.replaceCount
      || key(a.nums).localeCompare(key(b.nums),undefined,{numeric:true});
  }
  function dedupe(items){
    const map=new Map();items.forEach(x=>{const k=key(x.nums);const old=map.get(k);if(!old||compare(x,old)<0)map.set(k,x);});
    return [...map.values()].sort(compare);
  }
  function candidateNumbersFromStage(base,stage){
    const scores=new Map();
    stage.forEach((x,idx)=>x.added.forEach(n=>scores.set(n,(scores.get(n)||0)+(Math.max(0,x.after-50)*2)+Math.max(0,x.delta)*4+Math.max(0,40-idx))));
    for(let n=1;n<=45;n++)if(!base.includes(n)&&!scores.has(n))scores.set(n,0);
    return [...scores.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(x=>x[0]);
  }

  async function stageOne(base,target,onProgress){
    const out=[];let done=0,total=base.length*(45-base.length);
    for(const remove of base){
      for(let add=1;add<=45;add++){
        if(base.includes(add))continue;
        const nums=clean(base.filter(n=>n!==remove).concat(add));
        const real=evaluateReal(base,nums);
        const virtual=evaluateVirtual(base,nums);
        const item=decorate(base,nums,real,virtual,1);item.targetMet=item.after>=target;out.push(item);
        done++;if(done%12===0){onProgress?.(`+1회 역산 1단계 ${done}/${total}`);await sleep();}
      }
    }
    return dedupe(out);
  }

  async function expand(base,seeds,addPool,target,depth,onProgress){
    const out=[];const seen=new Set();let ops=0;
    const seedLimit=depth===2?48:54;
    const addLimit=depth===2?22:16;
    for(const seed of seeds.slice(0,seedLimit)){
      const removable=base.filter(n=>seed.nums.includes(n));
      for(const remove of removable){
        for(const add of addPool.slice(0,addLimit)){
          if(seed.nums.includes(add))continue;
          const nums=clean(seed.nums.filter(n=>n!==remove).concat(add));
          if(nums.length!==6||base.filter(n=>!nums.includes(n)).length!==depth)continue;
          const k=key(nums);if(seen.has(k))continue;seen.add(k);
          const real=evaluateReal(base,nums);
          const virtual=evaluateVirtual(base,nums);
          const item=decorate(base,nums,real,virtual,depth);item.targetMet=item.after>=target;out.push(item);
          ops++;if(ops%12===0){onProgress?.(`+1회 역산 ${depth}단계 ${out.length}개 후보`);await sleep();}
        }
      }
    }
    return dedupe(out);
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
    if(!global.ScoreFusionEngine?.evaluateCandidate)return {error:'ScoreFusionEngine v1.1 연결이 필요합니다.'};
    const target=Math.max(60,Math.min(98,Number(opts.target)||90));
    const maxReplace=Math.max(1,Math.min(3,Number(opts.maxReplace)||2));
    const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
    state.running=true;
    try{
      onProgress('현재 Fusion AI Score를 계산하고 있습니다...');
      const baseline=evaluateReal(base,base);
      const sameVirtual=evaluateVirtual(base,base);
      let one=await stageOne(base,target,onProgress);
      const stages=[{replaceCount:1,best:one[0]||null,count:one.length,met:one.filter(x=>x.targetMet).length}];
      let pool=one;
      let met=one.filter(x=>x.targetMet);
      const addPool=candidateNumbersFromStage(base,one);
      if(!met.length&&maxReplace>=2){
        const two=await expand(base,one,addPool,target,2,onProgress);
        stages.push({replaceCount:2,best:two[0]||null,count:two.length,met:two.filter(x=>x.targetMet).length});
        pool=two;met=two.filter(x=>x.targetMet);
        if(!met.length&&maxReplace>=3){
          const pool3=candidateNumbersFromStage(base,two.length?two:one);
          const three=await expand(base,two.length?two:one,pool3,target,3,onProgress);
          stages.push({replaceCount:3,best:three[0]||null,count:three.length,met:three.filter(x=>x.targetMet).length});
          pool=three;met=three.filter(x=>x.targetMet);
        }
      }
      // 가장 적은 교체로 목표를 달성한 단계만 최적해 후보로 사용합니다.
      const reachedStage=stages.find(s=>s.met>0);
      let finalPool;
      if(reachedStage){
        const src=reachedStage.replaceCount===1?one:pool;
        finalPool=src.filter(x=>x.targetMet).sort(compare);
      }else{
        finalPool=stages.map(s=>s.best).filter(Boolean).sort(compare);
      }
      const best=finalPool[0]||null;
      const top=finalPool.slice(0,10);
      const inferenceSource=(met.length?met:pool).slice(0,80);
      const result={
        base,target,maxReplace,baseline,sameVirtual,best,top,stages,
        reached:!!reachedStage,reachedReplace:reachedStage?.replaceCount||null,
        inferred:inferredNumbers(inferenceSource),
        virtualRound:nextRound(),
        note:'실제 lotto.json은 수정하지 않고 메모리에서 후보 6개가 다음 회차에 1회 출현했다고 가정해 Fusion AI를 다시 계산합니다.'
      };
      state.last=result;return result;
    }catch(e){console.error('ReverseInferenceEngine',e);return {error:e.message||String(e)};}
    finally{state.running=false;invalidate();}
  }

  global.ReverseInferenceEngine=Object.freeze({run,getState:()=>({...state}),evaluateReal,evaluateVirtual});
})(window);
