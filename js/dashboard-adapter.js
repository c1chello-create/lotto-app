(function(global){
  'use strict';
  const memoryCache=new Map();
  const clean=nums=>[...new Set((nums||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=45))].sort((a,b)=>a-b);
  const clamp=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));
  const avg=a=>a.length?a.reduce((s,v)=>s+(Number(v)||0),0)/a.length:0;
  const keyOf=(nums,scope,bonus)=>`${clean(nums).join(',')}|${scope}|${bonus?'B':'N'}|${(global.LOTTO_DATA||[]).length}`;

  function setLegacyState(nums,scope,bonus){
    const input=document.getElementById('comboInput');
    const check=document.getElementById('includeBonus');
    if(input)input.value=clean(nums).join(' ');
    if(check)check.checked=!!bonus;
    try{ selectedNums=clean(nums); matchRange=scope; matchMode='partial'; }catch(e){}
    document.querySelectorAll('#dashboardLegacyHost .range-btn').forEach(btn=>btn.classList.toggle('active',String(btn.dataset.range)===String(scope)));
    try{ if(typeof global.renderAll==='function')global.renderAll(); }catch(e){console.warn('legacy render skipped',e);}
  }
  function patternFor(nums,scope='50',bonus=true){
    try{
      if(global.CompanionCombinationEngine?.scorePatternComboV3){
        return global.CompanionCombinationEngine.scorePatternComboV3(clean(nums),{
          scope:String(scope),includeBonus:!!bonus
        });
      }
    }catch(e){}
    return null;
  }
  function percent(value,max){return clamp((Number(value)||0)/Math.max(1,Number(max)||1)*100);}
  function aiScoreFor(item,ranked){
    if(!item)return null;
    const maxes={
      companion:Math.max(1,...ranked.map(c=>Number(c.parts?.companion)||0)),
      trend:Math.max(1,...ranked.map(c=>(Number(c.parts?.recent)||0)+(Number(c.parts?.long)||0))),
      structure:Math.max(1,...ranked.map(c=>(Number(c.parts?.balance)||0)+(Number(c.parts?.oddEven)||0))),
      learning:Math.max(1,...ranked.map(c=>(Number(c.parts?.historical)||0)+(Number(c.parts?.learned)||0)))
    };
    const classic={
      companion:percent(item.parts?.companion,maxes.companion),
      trend:percent((item.parts?.recent||0)+(item.parts?.long||0),maxes.trend),
      structure:percent((item.parts?.balance||0)+(item.parts?.oddEven||0),maxes.structure),
      learning:percent((item.parts?.historical||0)+(item.parts?.learned||0),maxes.learning)
    };
    let p=null;
    try{ p=typeof global.v167SafePattern==='function'?global.v167SafePattern(item.nums):null; }catch(e){}
    if(!p){
      const raw=patternFor(item.nums, String(global.matchRange||'50'), document.getElementById('includeBonus')?.checked!==false)||{};
      p={pattern:raw.components?.pattern||raw.strength||0,replay:raw.components?.reproduction||0,flow:raw.components?.flow||0,dream:raw.components?.group||0,confidence:raw.confidence||0};
    }
    const pattern={pattern:clamp(p.pattern),replay:clamp(p.replay),flow:clamp(p.flow),dream:clamp(p.dream),confidence:clamp(p.confidence)};
    const baseAvg=Math.round(avg(Object.values(classic)));
    const patternAvg=Math.round(avg([pattern.pattern,pattern.replay,pattern.flow,pattern.dream]));
    const total=clamp(baseAvg*.45+patternAvg*.40+(Number(item.trust)||0)*.15);
    const confidence=clamp((pattern.confidence||70)*.60+baseAvg*.20+total*.20);
    return {total,confidence,baseAvg,patternAvg,classic,pattern};
  }
  function summary(base){
    let matches=[],range=[];
    try{matches=typeof global.allMatches==='function'?global.allMatches():[];}catch(e){}
    try{range=typeof global.rangeMatches==='function'?global.rangeMatches():[];}catch(e){}
    const last=matches[0]||null;
    const exact=base.length===6&&typeof global.exactWinningRows==='function'?global.exactWinningRows():[];
    return {allCount:matches.length,rangeCount:range.length,lastRound:last?.row?.round||null,lastDate:last?.row?.date||'',exactCount:exact.length};
  }
  function companion(base,scope,bonus){
    const data=typeof global.companionAnalysis==='function'?global.companionAnalysis():{rows:[],top:[],recommend:[],counts:{}};
    const ranked=typeof global.makeRankedCombos==='function'?global.makeRankedCombos(data):[];
    const patterns=global.CompanionCombinationEngine?.recommendationPatterns
      ?global.CompanionCombinationEngine.recommendationPatterns(base,data.recommend||[],{scope,includeBonus:bonus})
      :[];
    return {data,ranked,patterns};
  }
  function fusion(){
    try{return global.ScoreFusionEngine?.analyze?.()||null;}catch(e){return{error:e.message};}
  }
  function assistantText(result){
    const f=result.fusion;
    const p=result.currentPattern;
    const top=result.topRanked;
    if(f&&!f.error&&f.best&&f.current){
      const delta=Math.round(f.best.total-f.current.total);
      if(f.best.replaceCount===0||delta<=0)return `현재 조합 유지가 우세합니다. Pattern ${Math.round(p?.adjusted||0)}점·Confidence ${Math.round(p?.confidence||0)}%이며, 교체로 얻는 통합 이득이 뚜렷하지 않습니다.`;
      if(f.best.replaceCount===1)return `1개 교체가 효율적입니다. ${f.best.removed.join('·')}번을 ${f.best.added.join('·')}번으로 바꾸면 Fusion 지수가 약 ${delta}점 개선됩니다.`;
      return `${f.best.replaceCount}개 교체안이 현재 Fusion 최상위입니다. 다만 기존 번호 ${f.best.kept.length}개를 유지하므로, 자동 최적화에서 1·2·3개 결과를 함께 비교하는 것이 좋습니다.`;
    }
    if(top?.aiScore)return `AI 추천 1위는 ${top.nums.join('·')}이며 AI Score ${top.aiScore.total}점, Confidence ${top.aiScore.confidence}%입니다.`;
    return '현재 조건의 핵심 결과를 계산했습니다. 상세 근거는 아래 카드에서 확인하세요.';
  }
  function analyze(nums,scope='50',bonus=true,{force=false}={}){
    const base=clean(nums);
    if(base.length<2||base.length>6)return {error:'번호는 2개 이상 6개 이하로 입력하세요.'};
    setLegacyState(base,scope,bonus);
    const cacheKey=keyOf(base,scope,bonus);
    if(!force&&memoryCache.has(cacheKey))return memoryCache.get(cacheKey);
    const c=companion(base,scope,bonus);
    const ranked=c.ranked.map(item=>({...item,aiScore:aiScoreFor(item,c.ranked)}));
    const result={
      base,scope,bonus,summary:summary(base),
      companion:c.data,patterns:c.patterns,ranked,
      topRanked:ranked[0]||null,currentPattern:base.length===6?patternFor(base,scope,bonus):null,
      fusion:base.length===6?fusion():null,generatedAt:new Date().toISOString()
    };
    result.assistant=assistantText(result);
    memoryCache.set(cacheKey,result);
    return result;
  }
  function optimize(nums,scope='50',bonus=true){
    const base=clean(nums),eng=global.CompanionCombinationEngine;
    if(base.length!==6)return {error:'교체 최적화는 번호 6개가 필요합니다.'};
    if(!eng?.optimizePatternV3)return {error:'Companion Pattern Optimizer를 찾지 못했습니다.'};
    setLegacyState(base,scope,bonus);
    const current=eng.scorePatternComboV3(base,{scope,includeBonus:bonus});
    const options=[{replaceCount:0,nums:base,score:null,currentPattern:current}];
    for(const maxReplace of [1,2,3]){
      const r=eng.optimizePatternV3(base,{maxReplace,scope,includeBonus:bonus,beamWidth:90});
      const item=r?.best;
      options.push({replaceCount:maxReplace,nums:item?.nums||base,removed:item?.removed||[],added:item?.added||[],score:item?.aiLinked??r?.current?.aiLinked??0,pattern:item?.pattern||r?.current?.pattern||current,raw:r});
    }
    const currentLinked=options.slice(1).map(x=>x.raw?.current?.aiLinked).find(Number.isFinite)||0;
    options[0].score=currentLinked;options[0].pattern=current;
    const best=options.slice().sort((a,b)=>(b.score||0)-(a.score||0)||a.replaceCount-b.replaceCount)[0];
    return {base,options,best,currentScore:currentLinked};
  }
  function backtest(){
    try{return global.CompanionCombinationEngine?.backtestPhase3?.({testCount:50,includeBonus:document.getElementById('includeBonus')?.checked!==false})||null;}catch(e){return{error:e.message};}
  }
  function quick(number,result){
    const n=Number(number);
    if(!Number.isInteger(n)||n<1||n>45)return {error:'1~45 사이 번호를 입력하세요.'};
    const source=String(result.scope)==='all'?(global.LOTTO_DATA||[]):(global.LOTTO_DATA||[]).slice(0,Number(result.scope)||50);
    let frequency=0,last=null;
    source.forEach(row=>{const pool=[...(row.numbers||[])];if(result.bonus&&row.bonus)pool.push(row.bonus);if(pool.includes(n)){frequency++;if(!last)last=row;}});
    const top=result.companion?.top?.find(x=>Number(x.n)===n)||null;
    const fusion=result.fusion&&!result.fusion.error?result.fusion:null;
    const best=fusion?.best||null;
    const links=best?.frequency?.numberContributions?.find(x=>x.n===n)?.links||[];
    return {
      n,frequency,sourceCount:source.length,lastRound:last?.round||null,lastDate:last?.date||'',
      selected:result.base.includes(n),companionCount:top?.count||0,companionIndex:top?.index||0,
      recommended:(result.companion?.recommend||[]).includes(n),rankedTop:result.topRanked?.nums?.includes(n)||false,
      fusionKept:best?.kept?.includes(n)||false,fusionAdded:best?.added?.includes(n)||false,fusionRemoved:best?.removed?.includes(n)||false,links
    };
  }
  global.DashboardAdapter=Object.freeze({clean,setLegacyState,analyze,optimize,backtest,quick});
})(window);
