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
    bestWithCandidate,recommendationPatterns,strength,selectedNumsFromInput,requiredSelectedCount,indexForPattern,patternSetIndex,aiUsageForPattern
  });
})(window);
