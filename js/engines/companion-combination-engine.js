(function(global){
  'use strict';

  const defaults={2:3,3:2,4:2};
  const state={size:2,scope:'all',includeBonus:true,sort:'count',minCount:3,limit:100,last:[]};
  const cleanNums=arr=>[...new Set((arr||[]).map(Number).filter(n=>n>=1&&n<=45))].sort((a,b)=>a-b);
  const keyOf=nums=>cleanNums(nums).join(',');
  const rows=()=>{
    const data=(global.LOTTO_DATA||global.lottoData||[]).slice();
    return data.sort((a,b)=>Number(b.round)-Number(a.round));
  };
  function scopedRows(scope=state.scope){
    const all=rows();
    if(scope==='50')return all.slice(0,50);
    if(scope==='100')return all.slice(0,100);
    return all;
  }
  function choose(arr,k){
    const out=[];
    function rec(start,pick){
      if(pick.length===k){out.push(pick.slice());return;}
      for(let i=start;i<=arr.length-(k-pick.length);i++){
        pick.push(arr[i]);rec(i+1,pick);pick.pop();
      }
    }
    rec(0,[]);return out;
  }
  function pool(row,includeBonus=state.includeBonus){
    const nums=cleanNums(row.numbers||row.nums||[]);
    if(includeBonus&&Number(row.bonus)>=1&&Number(row.bonus)<=45)nums.push(Number(row.bonus));
    return cleanNums(nums);
  }
  function selectedNumsFromInput(){
    const input=global.document&&global.document.getElementById('comboInput');
    const raw=(input&&input.value)||'';
    return cleanNums(raw.split(/[\s,]+/));
  }
  function requiredSelectedCount(size){
    return Math.max(1,Number(size)-1);
  }
  function aggregate(opts={}){
    const size=Number(opts.size||state.size);
    const includeBonus=opts.includeBonus??state.includeBonus;
    const minCount=Number(opts.minCount??state.minCount??1);
    const selected=cleanNums(opts.selectedNums||selectedNumsFromInput());
    const selectedSet=new Set(selected);
    const required=requiredSelectedCount(size);
    const map=new Map();

    if(selected.length<required){
      state.last=[];
      return [];
    }

    scopedRows(opts.scope||state.scope).forEach(row=>{
      choose(pool(row,includeBonus),size).forEach(nums=>{
        const selectedHits=nums.filter(n=>selectedSet.has(n));
        // 입력번호끼리의 조합은 포함하고, 입력번호와 무관한 조합은 제외합니다.
        // 2개=입력번호 1개 이상, 3개=2개 이상, 4개=3개 이상.
        if(selectedHits.length<required)return;

        const key=keyOf(nums);let item=map.get(key);
        if(!item){
          item={
            key,nums,count:0,recentRound:0,recentDate:'',rounds:[],
            selectedHits:selectedHits.slice(),
            companionNums:nums.filter(n=>!selectedSet.has(n)),
            selectedOnly:selectedHits.length===nums.length
          };
          map.set(key,item);
        }
        item.count++;
        item.rounds.push(row);
        if(Number(row.round)>Number(item.recentRound||0)){
          item.recentRound=Number(row.round);item.recentDate=row.date||'';
        }
      });
    });

    const list=[...map.values()].filter(x=>x.count>=minCount);
    const sort=opts.sort||state.sort;
    list.sort((a,b)=>{
      if(sort==='latest')return b.recentRound-a.recentRound||b.count-a.count||a.key.localeCompare(b.key,undefined,{numeric:true});
      if(sort==='number')return a.key.localeCompare(b.key,undefined,{numeric:true});
      return b.count-a.count||b.recentRound-a.recentRound||a.key.localeCompare(b.key,undefined,{numeric:true});
    });
    state.last=list;return list;
  }
  function details(key){
    const nums=String(key||'').split(',').map(Number).filter(Boolean);
    const includeBonus=state.includeBonus;
    return scopedRows().filter(row=>nums.every(n=>pool(row,includeBonus).includes(n)));
  }
  function bestWithCandidate(baseNums,candidate,size,opts={}){
    const base=cleanNums(baseNums).filter(n=>n!==Number(candidate));
    const need=Number(size)-1;
    if(need<1||base.length<need)return null;
    let best=null;
    choose(base,need).forEach(parts=>{
      const nums=cleanNums([...parts,Number(candidate)]);
      let count=0,recentRound=0,recentDate='';
      scopedRows(opts.scope||state.scope).forEach(row=>{
        const p=pool(row,opts.includeBonus??state.includeBonus);
        if(nums.every(n=>p.includes(n))){
          count++;
          if(Number(row.round)>recentRound){recentRound=Number(row.round);recentDate=row.date||'';}
        }
      });
      const item={key:keyOf(nums),nums,count,recentRound,recentDate};
      if(!best||item.count>best.count||(item.count===best.count&&item.recentRound>best.recentRound))best=item;
    });
    return best;
  }
  function strength(count,size){
    const c=Number(count)||0;
    if(size===2){if(c>=8)return'매우 강함';if(c>=5)return'강함';if(c>=3)return'보통';return'약함';}
    if(size===3){if(c>=4)return'강함';if(c>=2)return'보통';return'약함';}
    if(c>=3)return'강함';if(c>=2)return'보통';return'약함';
  }
  function normalize(value,max){
    const v=Number(value)||0,m=Number(max)||0;
    return m>0?Math.max(0,Math.min(100,Math.round(v/m*100))):0;
  }
  function recencyScore(round,opts={}){
    const scoped=scopedRows(opts.scope||state.scope);
    if(!scoped.length||!Number(round))return 0;
    const newest=Number(scoped[0].round)||0;
    const oldest=Number(scoped[scoped.length-1].round)||newest;
    const span=Math.max(1,newest-oldest);
    return Math.max(0,Math.min(100,Math.round((1-(newest-Number(round))/span)*100)));
  }
  function indexForPattern(item,size,opts={}){
    if(!item)return 0;
    const scoped=scopedRows(opts.scope||state.scope);
    const theoretical=Math.max(1,scoped.length);
    const sizeWeight={2:1,3:1.8,4:3}[Number(size)]||1;
    const countBase=Math.max(1,Math.sqrt(theoretical)/sizeWeight);
    const countScore=Math.min(100,Math.round((Math.log1p(item.count||0)/Math.log1p(countBase))*100));
    return Math.round(countScore*.82+recencyScore(item.recentRound,opts)*.18);
  }
  function patternSetIndex(pattern,opts={}){
    const two=indexForPattern(pattern.two,2,opts);
    const three=indexForPattern(pattern.three,3,opts);
    const four=indexForPattern(pattern.four,4,opts);
    const recent=Math.max(
      recencyScore(pattern.two?.recentRound,opts),
      recencyScore(pattern.three?.recentRound,opts),
      recencyScore(pattern.four?.recentRound,opts)
    );
    const score=Math.round(two*.45+three*.30+four*.15+recent*.10);
    return {score,two,three,four,recent};
  }
  function rankedCombos(){
    try{
      if(typeof global.companionAnalysis==='function'&&typeof global.makeRankedCombos==='function'){
        return global.makeRankedCombos(global.companionAnalysis())||[];
      }
    }catch(e){}
    return [];
  }
  function aiUsageForPattern(pattern){
    const ranked=rankedCombos();
    const keys=[pattern.two,pattern.three,pattern.four].filter(Boolean).map(x=>x.nums||[]);
    const matchedRanks=[];
    ranked.forEach(combo=>{
      const nums=combo.nums||[];
      if(keys.some(key=>key.length&&key.every(n=>nums.includes(n))))matchedRanks.push(combo.rank||0);
    });
    if(matchedRanks.length)return {used:true,label:'AI 반영',bestRank:Math.min(...matchedRanks.filter(Boolean))||null};
    return {used:false,label:'참고 패턴',bestRank:null};
  }

  const optimizerCache=new Map();
  function gradeForScore(score){
    const s=Number(score)||0;
    if(s>=90)return{grade:'S',label:'최상'};
    if(s>=80)return{grade:'A+',label:'매우 강함'};
    if(s>=70)return{grade:'A',label:'강함'};
    if(s>=60)return{grade:'B',label:'양호'};
    if(s>=45)return{grade:'C',label:'보통'};
    return{grade:'D',label:'약함'};
  }
  function scopeKey(opts={}){
    return `${opts.scope||state.scope}|${opts.includeBonus??state.includeBonus?'B':'N'}`;
  }
  function buildPatternMaps(opts={}){
    const key=scopeKey(opts);
    if(optimizerCache.has(key))return optimizerCache.get(key);
    const maps={2:new Map(),3:new Map(),4:new Map(),newest:0,oldest:0,rows:scopedRows(opts.scope||state.scope)};
    if(maps.rows.length){
      maps.newest=Number(maps.rows[0].round)||0;
      maps.oldest=Number(maps.rows[maps.rows.length-1].round)||maps.newest;
    }
    maps.rows.forEach(row=>{
      const nums=pool(row,opts.includeBonus??state.includeBonus);
      [2,3,4].forEach(size=>choose(nums,size).forEach(combo=>{
        const key=keyOf(combo);
        const prev=maps[size].get(key)||{count:0,recentRound:0,nums:combo};
        prev.count++;
        prev.recentRound=Math.max(prev.recentRound,Number(row.round)||0);
        maps[size].set(key,prev);
      }));
    });
    optimizerCache.set(key,maps);
    return maps;
  }
  function mapItemScore(item,size,maps){
    if(!item)return 0;
    const sizeScale={2:10,3:5,4:2.5}[size]||5;
    const countScore=Math.min(100,Math.round(Math.log1p(item.count)/Math.log1p(sizeScale)*100));
    const span=Math.max(1,maps.newest-maps.oldest);
    const recent=Math.max(0,Math.min(100,Math.round((1-(maps.newest-item.recentRound)/span)*100)));
    return Math.round(countScore*.82+recent*.18);
  }
  function topSubsetStats(nums,size,maps,limit){
    const rows=choose(cleanNums(nums),size).map(part=>{
      const item=maps[size].get(keyOf(part));
      return {nums:part,count:item?.count||0,recentRound:item?.recentRound||0,score:mapItemScore(item,size,maps)};
    }).sort((a,b)=>b.score-a.score||b.count-a.count||b.recentRound-a.recentRound);
    const take=rows.slice(0,limit);
    return {
      top:take,
      avg:take.length?Math.round(take.reduce((s,x)=>s+x.score,0)/take.length):0,
      coverage:rows.length?Math.round(rows.filter(x=>x.count>0).length/rows.length*100):0,
      maxCount:rows[0]?.count||0
    };
  }
  function scorePatternCombo(nums,opts={}){
    const clean=cleanNums(nums);
    if(clean.length!==6)return null;
    const maps=buildPatternMaps(opts);
    const pair=topSubsetStats(clean,2,maps,6);
    const triple=topSubsetStats(clean,3,maps,5);
    const quad=topSubsetStats(clean,4,maps,3);
    const recent=Math.max(
      ...pair.top.map(x=>recencyScore(x.recentRound,opts)),
      ...triple.top.map(x=>recencyScore(x.recentRound,opts)),
      ...quad.top.map(x=>recencyScore(x.recentRound,opts)),
      0
    );
    const score=Math.max(0,Math.min(100,Math.round(
      pair.avg*.38+triple.avg*.32+quad.avg*.20+recent*.10
    )));
    const grade=gradeForScore(score);
    return {nums:clean,score,grade,pair,triple,quad,recent};
  }
  function candidatePool(baseNums,opts={}){
    const base=new Set(cleanNums(baseNums));
    const maps=buildPatternMaps(opts);
    const numberWeights=new Map();
    [2,3,4].forEach(size=>maps[size].forEach(item=>{
      const w=item.count*({2:1,3:2.2,4:4}[size]);
      item.nums.forEach(n=>numberWeights.set(n,(numberWeights.get(n)||0)+w));
    }));
    const ranked=[...numberWeights.entries()]
      .filter(([n])=>!base.has(n))
      .sort((a,b)=>b[1]-a[1])
      .map(([n])=>n);
    const recs=(()=>{
      try{return typeof global.companionAnalysis==='function'?(global.companionAnalysis().top||[]).map(x=>Number(x.n)):[];}
      catch(e){return[];}
    })();
    return cleanNums([...recs,...ranked.slice(0,24),...Array.from({length:45},(_,i)=>i+1).filter(n=>!base.has(n))]);
  }
  function compareOptimized(a,b){
    return b.pattern.score-a.pattern.score
      || a.replaceCount-b.replaceCount
      || b.pattern.quad.avg-a.pattern.quad.avg
      || b.pattern.triple.avg-a.pattern.triple.avg
      || a.nums.join(',').localeCompare(b.nums.join(','),undefined,{numeric:true});
  }
  function optimizePattern(baseNums,opts={}){
    const base=cleanNums(baseNums);
    if(base.length!==6)return{error:'6개 번호가 필요합니다.'};
    const maxReplace=Math.max(1,Math.min(3,Number(opts.maxReplace)||3));
    const beamWidth=Math.max(30,Math.min(160,Number(opts.beamWidth)||90));
    const current=scorePatternCombo(base,opts);
    const poolNums=candidatePool(base,opts).slice(0,30);
    let frontier=[{nums:base,removed:[],added:[],replaceCount:0,pattern:current}];
    const all=[...frontier];
    const seen=new Set([keyOf(base)]);
    for(let depth=1;depth<=maxReplace;depth++){
      const next=[];
      frontier.forEach(node=>{
        node.nums.forEach(oldNum=>{
          poolNums.forEach(newNum=>{
            if(node.nums.includes(newNum))return;
            const nums=cleanNums(node.nums.filter(n=>n!==oldNum).concat(newNum));
            const key=keyOf(nums);
            if(seen.has(key))return;
            seen.add(key);
            const pattern=scorePatternCombo(nums,opts);
            next.push({
              nums,
              removed:cleanNums([...node.removed,oldNum]),
              added:cleanNums([...node.added,newNum]),
              replaceCount:depth,
              pattern
            });
          });
        });
      });
      next.sort(compareOptimized);
      frontier=next.slice(0,beamWidth);
      all.push(...frontier);
    }
    const improved=all.filter(x=>x.replaceCount>0&&x.pattern.score>current.score).sort(compareOptimized);
    const best=improved[0]||all.filter(x=>x.replaceCount>0).sort(compareOptimized)[0];
    if(!best)return{current,best:null,coOptimal:[],tested:seen.size};
    const coOptimal=improved.filter(x=>
      x.pattern.score===best.pattern.score &&
      x.replaceCount===best.replaceCount
    ).slice(0,8);
    const reasons=explainPatternRecommendation(current,best);
    return {current,best,coOptimal,tested:seen.size,reasons};
  }
  function explainPatternRecommendation(current,best){
    if(!best)return[];
    const delta=best.pattern.score-current.score;
    const reasons=[];
    if(delta>0)reasons.push(`Pattern Score가 ${current.score}점에서 ${best.pattern.score}점으로 ${delta}점 상승`);
    if(best.pattern.pair.avg>current.pair.avg)reasons.push(`2개 조합 연결지수 ${current.pair.avg} → ${best.pattern.pair.avg}`);
    if(best.pattern.triple.avg>current.triple.avg)reasons.push(`3개 조합 연결지수 ${current.triple.avg} → ${best.pattern.triple.avg}`);
    if(best.pattern.quad.avg>current.quad.avg)reasons.push(`4개 조합 연결지수 ${current.quad.avg} → ${best.pattern.quad.avg}`);
    if(best.pattern.recent>current.recent)reasons.push(`최근 출현 흐름 ${current.recent} → ${best.pattern.recent}`);
    const top=best.pattern.quad.top[0]||best.pattern.triple.top[0]||best.pattern.pair.top[0];
    if(top?.count)reasons.push(`핵심 패턴 ${top.nums.join('·')}이 과거 ${top.count}회 출현`);
    return reasons.slice(0,5);
  }
  function recommendationPatterns(baseNums,recommendations,opts={}){
    const patterns=cleanNums(recommendations).map(candidate=>{
      const two=bestWithCandidate(baseNums,candidate,2,opts);
      const three=bestWithCandidate(baseNums,candidate,3,opts);
      const four=bestWithCandidate(baseNums,candidate,4,opts);
      const item={candidate,two,three,four,strength2:strength(two?.count||0,2)};
      item.index=patternSetIndex(item,opts);
      item.aiUsage=aiUsageForPattern(item);
      return item;
    });
    const maxScore=Math.max(1,...patterns.map(x=>x.index.score));
    patterns.forEach(x=>{x.index.relative=Math.round(x.index.score/maxScore*100);});
    return patterns.sort((a,b)=>b.index.score-a.index.score||a.candidate-b.candidate);
  }
  global.CompanionCombinationEngine=Object.freeze({
    state,defaults,aggregate,details,scopedRows,pool,choose,keyOf,
    bestWithCandidate,recommendationPatterns,strength,selectedNumsFromInput,requiredSelectedCount,indexForPattern,patternSetIndex,aiUsageForPattern,gradeForScore,scorePatternCombo,optimizePattern,explainPatternRecommendation
  });
})(window);
