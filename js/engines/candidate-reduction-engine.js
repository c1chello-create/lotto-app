(function(global){
  'use strict';

  const cache = new Map();
  const WEIGHTS = Object.freeze({frequency:0.45,coOccurrence:0.45,stability:0.10});

  const clean = nums => [...new Set((nums||[])
    .map(Number)
    .filter(n=>Number.isInteger(n)&&n>=1&&n<=45))]
    .sort((a,b)=>a-b);
  const clamp = n => Math.max(0,Math.min(100,Number(n)||0));
  const round1 = n => Math.round((Number(n)||0)*10)/10;
  const average = list => list.length ? list.reduce((sum,v)=>sum+(Number(v)||0),0)/list.length : 0;
  const pairKey = (a,b) => a<b ? `${a}-${b}` : `${b}-${a}`;

  function combinations(items,size){
    const result=[];
    function walk(start,picked){
      if(picked.length===size){result.push(picked.slice());return;}
      for(let i=start;i<=items.length-(size-picked.length);i++){
        picked.push(items[i]);
        walk(i+1,picked);
        picked.pop();
      }
    }
    walk(0,[]);
    return result;
  }

  function sourceData(){
    const raw = global.LOTTO_DATA || global.lottoData || [];
    return Array.isArray(raw)
      ? raw.slice().sort((a,b)=>(Number(b.round)||0)-(Number(a.round)||0))
      : [];
  }

  function scopedRows(scope){
    const rows=sourceData();
    if(String(scope)==='all')return rows;
    const limit=Number(scope);
    return Number.isFinite(limit)&&limit>0 ? rows.slice(0,limit) : rows.slice(0,50);
  }

  function rowPool(row,includeBonus){
    const nums=(row?.numbers||row?.nums||[]).map(Number).filter(n=>n>=1&&n<=45);
    if(includeBonus&&Number(row?.bonus)>=1&&Number(row?.bonus)<=45)nums.push(Number(row.bonus));
    return [...new Set(nums)];
  }

  function matrixFor(candidates,rows,includeBonus){
    const frequency=Object.fromEntries(candidates.map(n=>[n,0]));
    const pairCounts=new Map();
    const allPairs=combinations(candidates,2);
    allPairs.forEach(([a,b])=>pairCounts.set(pairKey(a,b),0));

    rows.forEach(row=>{
      const pool=new Set(rowPool(row,includeBonus));
      const present=candidates.filter(n=>pool.has(n));
      present.forEach(n=>{frequency[n]=(frequency[n]||0)+1;});
      for(let i=0;i<present.length;i++){
        for(let j=i+1;j<present.length;j++){
          const key=pairKey(present[i],present[j]);
          pairCounts.set(key,(pairCounts.get(key)||0)+1);
        }
      }
    });

    return {frequency,pairCounts,allPairs};
  }

  function pairCount(matrix,a,b){
    return matrix.pairCounts.get(pairKey(a,b))||0;
  }

  function scoreCombo(nums,matrix,maxFrequency,maxPair){
    const frequencyValues=nums.map(n=>matrix.frequency[n]||0);
    const pairs=combinations(nums,2).map(([a,b])=>({a,b,count:pairCount(matrix,a,b)}));
    const pairValues=pairs.map(x=>x.count);

    const frequencyScore=round1(average(frequencyValues.map(v=>maxFrequency?clamp(v/maxFrequency*100):0)));
    const coOccurrenceScore=round1(average(pairValues.map(v=>maxPair?clamp(v/maxPair*100):0)));

    const nodeStrengths=nums.map(n=>nums.reduce((sum,other)=>sum+(n===other?0:pairCount(matrix,n,other)),0));
    const nodeMax=Math.max(0,...nodeStrengths);
    const nodeMin=Math.min(...nodeStrengths);
    const nodeBalance=nodeMax>0?clamp(nodeMin/nodeMax*100):0;
    const nodeMean=average(nodeStrengths);
    const nodeVariance=nodeStrengths.length
      ? average(nodeStrengths.map(v=>(v-nodeMean)*(v-nodeMean)))
      : 0;
    const nodeDeviation=Math.sqrt(nodeVariance);
    const evenness=nodeMean>0?clamp((1-nodeDeviation/nodeMean)*100):0;
    const coverage=pairValues.length?clamp(pairValues.filter(v=>v>0).length/pairValues.length*100):0;
    const stabilityScore=round1(nodeBalance*.45+evenness*.35+coverage*.20);

    const total=round1(
      frequencyScore*WEIGHTS.frequency+
      coOccurrenceScore*WEIGHTS.coOccurrence+
      stabilityScore*WEIGHTS.stability
    );

    const strongestLinks=pairs.slice().sort((a,b)=>b.count-a.count||a.a-b.a||a.b-b.b).slice(0,5);
    return {
      nums:nums.slice(),total,frequencyScore,coOccurrenceScore,stabilityScore,
      raw:{
        avgFrequency:round1(average(frequencyValues)),
        minFrequency:Math.min(...frequencyValues),
        maxFrequency:Math.max(...frequencyValues),
        avgPair:round1(average(pairValues)),
        pairCoverage:round1(coverage),
        nodeBalance:round1(nodeBalance),
        evenness:round1(evenness)
      },
      strongestLinks
    };
  }

  function sortScores(a,b){
    return b.total-a.total ||
      b.coOccurrenceScore-a.coOccurrenceScore ||
      b.frequencyScore-a.frequencyScore ||
      b.stabilityScore-a.stabilityScore ||
      a.nums.join(',').localeCompare(b.nums.join(','));
  }

  function analyze(candidates,options={}){
    const nums=clean(candidates);
    const scope=String(options.scope||'50');
    const includeBonus=options.includeBonus!==false;
    if(nums.length!==10){
      return {error:`후보번호는 중복 없이 정확히 10개가 필요합니다. 현재 ${nums.length}개입니다.`,candidates:nums};
    }

    const rows=scopedRows(scope);
    if(!rows.length)return {error:'로또 회차 데이터를 불러오지 못했습니다.',candidates:nums};

    const latestRound=rows[0]?.round||0;
    const cacheKey=`${nums.join(',')}|${scope}|${includeBonus?'B':'N'}|${rows.length}|${latestRound}`;
    if(cache.has(cacheKey))return cache.get(cacheKey);

    const matrix=matrixFor(nums,rows,includeBonus);
    const maxFrequency=Math.max(0,...Object.values(matrix.frequency));
    const maxPair=Math.max(0,...matrix.pairCounts.values());
    const candidateFrequencyOrder=nums.slice().sort((a,b)=>(matrix.frequency[b]||0)-(matrix.frequency[a]||0)||a-b);

    const scored=combinations(nums,6)
      .map(combo=>scoreCombo(combo,matrix,maxFrequency,maxPair))
      .sort(sortScores)
      .map((item,index)=>({...item,rank:index+1}));

    const best=scored[0];
    const selectedSet=new Set(best.nums);
    const selected=best.nums.map(n=>{
      const partners=best.nums.filter(x=>x!==n)
        .map(other=>({n:other,count:pairCount(matrix,n,other)}))
        .sort((a,b)=>b.count-a.count||a.n-b.n);
      return {
        n,
        frequency:matrix.frequency[n]||0,
        frequencyRank:candidateFrequencyOrder.indexOf(n)+1,
        avgConnection:round1(average(partners.map(x=>x.count))),
        strongestPartner:partners[0]||null
      };
    });

    const excluded=nums.filter(n=>!selectedSet.has(n)).map(n=>{
      const links=best.nums.map(other=>({n:other,count:pairCount(matrix,n,other)}))
        .sort((a,b)=>b.count-a.count||a.n-b.n);
      const bestContaining=scored.find(item=>item.nums.includes(n));
      return {
        n,
        frequency:matrix.frequency[n]||0,
        frequencyRank:candidateFrequencyOrder.indexOf(n)+1,
        avgConnectionToBest:round1(average(links.map(x=>x.count))),
        strongestPartner:links[0]||null,
        bestContainingRank:bestContaining?.rank||null,
        bestContainingScore:bestContaining?.total??null,
        scoreGap:bestContaining?round1(best.total-bestContaining.total):null
      };
    });

    const frequencyDetails=candidateFrequencyOrder.map((n,index)=>({
      n,rank:index+1,count:matrix.frequency[n]||0,
      rate:round1((matrix.frequency[n]||0)/rows.length*100),
      relative:maxFrequency?round1((matrix.frequency[n]||0)/maxFrequency*100):0,
      selected:selectedSet.has(n)
    }));

    const strongestCandidateLinks=matrix.allPairs
      .map(([a,b])=>({a,b,count:pairCount(matrix,a,b)}))
      .sort((a,b)=>b.count-a.count||a.a-b.a||a.b-b.b)
      .slice(0,10);

    const result={
      candidates:nums,scope,includeBonus,rowCount:rows.length,latestRound,
      weights:WEIGHTS,totalCombinations:scored.length,
      best,
      alternatives:scored.slice(1,6),
      top:scored.slice(0,6),
      selected,excluded,frequencyDetails,strongestCandidateLinks,
      generatedAt:new Date().toISOString()
    };
    cache.set(cacheKey,result);
    return result;
  }

  global.CandidateReductionEngine=Object.freeze({
    WEIGHTS,clean,combinations,analyze,clearCache:()=>cache.clear()
  });
})(window);
