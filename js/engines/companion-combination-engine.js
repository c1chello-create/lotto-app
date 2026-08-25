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
        const prev=maps[size].get(key)||{count:0,recentRound:0,nums:combo,rounds:[]};
        prev.count++;
        prev.recentRound=Math.max(prev.recentRound,Number(row.round)||0);
        prev.rounds.push(Number(row.round)||0);
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

  /* =========================================================
     v1.9.3 Phase 3
     Pattern Strength + Repeat-Supported Confidence + AI Link
     ========================================================= */
  const phase3Weights={
    strength:{pattern:35,reproduction:30,group:20,flow:15},
    confidence:{sample:35,lowerRepeat:30,timeSpread:20,consistency:15},
    aiLink:{classic:70,companion:30}
  };
  const clamp100=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const avgOf=arr=>arr.length?arr.reduce((s,v)=>s+(Number(v)||0),0)/arr.length:0;

  function buildMapsFromRows(sourceRows,includeBonus=true){
    const ordered=(sourceRows||[]).slice().sort((a,b)=>Number(b.round)-Number(a.round));
    const maps={2:new Map(),3:new Map(),4:new Map(),rows:ordered,newest:0,oldest:0};
    if(ordered.length){
      maps.newest=Number(ordered[0].round)||0;
      maps.oldest=Number(ordered[ordered.length-1].round)||maps.newest;
    }
    ordered.forEach(row=>{
      const nums=pool(row,includeBonus);
      [2,3,4].forEach(size=>choose(nums,size).forEach(combo=>{
        const k=keyOf(combo);
        const item=maps[size].get(k)||{nums:combo,count:0,recentRound:0,rounds:[]};
        item.count++;
        item.recentRound=Math.max(item.recentRound,Number(row.round)||0);
        item.rounds.push(Number(row.round)||0);
        maps[size].set(k,item);
      }));
    });
    return maps;
  }

  // =========================================================
  // Reverse precise Fast v4
  // 가상 +1회 Pattern 계산을 위해 과거 맵을 1회만 만들고,
  // 후보마다 실제 lottoData 삽입/삭제 및 전체 맵 재생성을 하지 않습니다.
  // 기존 scorePatternComboV3 계산식은 그대로 사용합니다.
  // =========================================================
  const virtualPatternContextCache=new Map();

  function prepareVirtualPatternContext(opts={}){
    const scope=opts.scope||state.scope;
    const includeBonus=opts.includeBonus??state.includeBonus;
    const all=rows().filter(r=>!(r&&r.__reverseVirtual));
    const virtualRound=(all.reduce((m,r)=>Math.max(m,Number(r.round)||0),0)||0)+1;
    const realLimit=scope==='all'?all.length:Math.max(0,(Number(scope)||50)-1);
    const scopedReal=all.slice(0,Math.min(all.length,realLimit));
    const recentReal=scopedReal.slice(0,Math.min(49,scopedReal.length));
    const first=all[0]?.round||0,last=all[all.length-1]?.round||0;
    const cacheKey=`${all.length}|${first}|${last}|${scope}|${includeBonus?'B':'N'}|${realLimit}`;
    let ctx=virtualPatternContextCache.get(cacheKey);
    if(ctx)return ctx;

    const base=buildMapsFromRows(scopedReal,includeBonus);
    // 기존 recentFullConsistency()는 includeBonus 옵션과 무관하게 pool(row,true)를 사용합니다.
    // 따라서 최근 50회 비교용 맵은 보너스 포함으로 별도 사전계산합니다.
    const recentTrue=buildMapsFromRows(recentReal,true);
    ctx={
      scope,includeBonus,virtualRound,
      base,recentTrue,
      fullLength:scopedReal.length+1,
      recentLength:Math.min(50,scopedReal.length+1),
      oldest:scopedReal.length?(Number(scopedReal[scopedReal.length-1].round)||virtualRound):virtualRound
    };
    virtualPatternContextCache.set(cacheKey,ctx);
    return ctx;
  }

  function phase3Item(maps,size,part){
    const nums=cleanNums(part);
    const item=maps[size].get(keyOf(nums));
    const vset=maps.__virtualSet;
    if(vset&&nums.length&&nums.every(n=>vset.has(n))){
      return {
        nums,
        count:(item?.count||0)+1,
        recentRound:maps.__virtualRound,
        rounds:item?.rounds||[],
        __virtualAdded:true
      };
    }
    return item||null;
  }

  function phase3Rounds(item,maps){
    if(!item)return[];
    if(item.__virtualAdded)return [maps.__virtualRound,...(item.rounds||[])];
    return item.rounds||[];
  }

  function virtualMaps(nums,ctx){
    const clean=cleanNums(nums);
    return {
      2:ctx.base[2],3:ctx.base[3],4:ctx.base[4],
      rows:{length:ctx.fullLength},
      newest:ctx.virtualRound,oldest:ctx.oldest,
      __virtualContext:ctx,
      __virtualSet:new Set(clean),
      __virtualRound:ctx.virtualRound
    };
  }

  function occurrenceScore(count,size){
    const scales={2:18,3:7,4:3};
    const scale=scales[size]||7;
    return clamp100(Math.log1p(Number(count)||0)/Math.log1p(scale)*100);
  }
  function itemRecentScore(item,maps){
    if(!item||!item.recentRound||!maps.rows.length)return 0;
    const span=Math.max(1,maps.newest-maps.oldest);
    return clamp100((1-(maps.newest-item.recentRound)/span)*100);
  }
  function timeSpreadScore(rounds,maps){
    const unique=[...new Set((rounds||[]).filter(Boolean))].sort((a,b)=>a-b);
    if(unique.length<2)return unique.length?18:0;
    const span=Math.max(1,maps.newest-maps.oldest);
    const covered=(unique[unique.length-1]-unique[0])/span;
    const buckets=new Set(unique.map(r=>Math.min(3,Math.floor(((r-maps.oldest)/span)*4))));
    return clamp100(covered*58+(buckets.size/4)*42);
  }
  function subsetRows(nums,size,maps){
    return choose(cleanNums(nums),size).map(part=>{
      const item=phase3Item(maps,size,part);
      return {
        nums:part,
        count:item?.count||0,
        recentRound:item?.recentRound||0,
        rounds:phase3Rounds(item,maps),
        occurrence:occurrenceScore(item?.count||0,size),
        recent:itemRecentScore(item,maps)
      };
    });
  }
  function lowerSupportForSubset(subset,maps){
    const size=subset.length;
    if(size<=2)return occurrenceScore(phase3Item(maps,2,subset)?.count||0,2);
    const pairScores=subsetRows(subset,2,maps).map(x=>x.occurrence);
    const tripleScores=size>=4?subsetRows(subset,3,maps).map(x=>x.occurrence):[];
    return clamp100(avgOf(pairScores)*.45+avgOf(tripleScores)*.55);
  }
  function recentFullConsistency(nums,maps){
    // Fast v4 가상 맵: 기존 반복문과 동일한 값을 사전계산 맵 조회로 구합니다.
    if(maps.__virtualContext){
      const ctx=maps.__virtualContext;
      const fullLen=Math.max(1,ctx.fullLength);
      const recentLen=Math.max(1,ctx.recentLength);
      const diffs=[];
      [2,3,4].forEach(size=>{
        choose(cleanNums(nums),size).forEach(part=>{
          const k=keyOf(part);
          const virtualHit=part.every(n=>maps.__virtualSet.has(n))?1:0;
          const full=((ctx.base[size].get(k)?.count||0)+virtualHit)/fullLen;
          const recent=((ctx.recentTrue[size].get(k)?.count||0)+virtualHit)/recentLen;
          const denom=Math.max(full,recent,1/fullLen);
          diffs.push(Math.min(1,Math.abs(recent-full)/denom));
        });
      });
      return clamp100((1-avgOf(diffs))*100);
    }

    const fullRows=maps.rows;
    if(!fullRows.length)return 0;
    const recentRows=fullRows.slice(0,Math.min(50,fullRows.length));
    const sizes=[2,3,4];
    const diffs=[];
    sizes.forEach(size=>{
      const parts=choose(cleanNums(nums),size);
      parts.forEach(part=>{
        const full=(phase3Item(maps,size,part)?.count||0)/Math.max(1,fullRows.length);
        let rc=0;
        recentRows.forEach(row=>{
          const p=pool(row,true);
          if(part.every(n=>p.includes(n)))rc++;
        });
        const recent=rc/Math.max(1,recentRows.length);
        const denom=Math.max(full,recent,1/fullRows.length);
        diffs.push(Math.min(1,Math.abs(recent-full)/denom));
      });
    });
    return clamp100((1-avgOf(diffs))*100);
  }

  function groupCohesion(nums,maps){
    const pairs=subsetRows(nums,2,maps);
    const coverage=pairs.filter(x=>x.count>0).length/Math.max(1,pairs.length);
    const strength=avgOf(pairs.map(x=>x.occurrence))/100;
    const degrees=new Map(cleanNums(nums).map(n=>[n,0]));
    pairs.forEach(x=>{
      const w=Math.min(1,x.occurrence/100);
      x.nums.forEach(n=>degrees.set(n,(degrees.get(n)||0)+w));
    });
    const vals=[...degrees.values()];
    const mean=avgOf(vals);
    const variance=avgOf(vals.map(v=>(v-mean)**2));
    const balance=mean?Math.max(0,1-Math.sqrt(variance)/mean):0;
    return clamp100((coverage*.35+strength*.45+balance*.20)*100);
  }
  function flowStrength(nums,maps,knownConsistency=null){
    const all=[...subsetRows(nums,2,maps),...subsetRows(nums,3,maps),...subsetRows(nums,4,maps)];
    const active=all.filter(x=>x.count>0);
    if(!active.length)return 0;
    const recent=avgOf(active.map(x=>x.recent));
    const consistency=knownConsistency==null?recentFullConsistency(nums,maps):knownConsistency;
    return clamp100(recent*.62+consistency*.38);
  }
  function repeatSupportedMetrics(nums,maps){
    const pairs=subsetRows(nums,2,maps);
    const triples=subsetRows(nums,3,maps);
    const quads=subsetRows(nums,4,maps);

    const structural=clamp100(
      avgOf(pairs.map(x=>x.occurrence))*.25+
      avgOf(triples.map(x=>x.occurrence))*.35+
      avgOf(quads.map(x=>x.occurrence))*.40
    );

    const directRepeat=clamp100(
      avgOf(pairs.map(x=>x.count>=2?x.occurrence:x.occurrence*.55))*.25+
      avgOf(triples.map(x=>x.count>=2?x.occurrence:x.occurrence*.48))*.35+
      avgOf(quads.map(x=>{
        const lower=lowerSupportForSubset(x.nums,maps);
        if(x.count>=2)return x.occurrence;
        if(x.count===1)return x.occurrence*(.25+.60*lower/100);
        return 0;
      }))*.40
    );

    const group=groupCohesion(nums,maps);
    const consistency=recentFullConsistency(nums,maps);
    const flow=flowStrength(nums,maps,consistency);

    const sample=clamp100(
      Math.min(1,avgOf(pairs.map(x=>x.count))/5)*25+
      Math.min(1,avgOf(triples.map(x=>x.count))/2.5)*30+
      Math.min(1,avgOf(quads.map(x=>x.count))/1.5)*45
    );

    const lowerRepeat=clamp100(
      avgOf(triples.map(x=>lowerSupportForSubset(x.nums,maps)))*.40+
      avgOf(quads.map(x=>lowerSupportForSubset(x.nums,maps)))*.60
    );

    const allRounds=[
      ...triples.flatMap(x=>x.rounds),
      ...quads.flatMap(x=>x.rounds)
    ];
    const timeSpread=timeSpreadScore(allRounds,maps);

    const strength=clamp100(
      structural*.35+
      directRepeat*.30+
      group*.20+
      flow*.15
    );
    const confidence=clamp100(
      sample*.35+
      lowerRepeat*.30+
      timeSpread*.20+
      consistency*.15
    );
    const adjusted=clamp100(strength*(.65+(confidence/100)*.35));

    return {
      strength,confidence,adjusted,
      components:{pattern:structural,reproduction:directRepeat,group,flow},
      confidenceParts:{sample,lowerRepeat,timeSpread,consistency},
      pair:{avg:clamp100(avgOf(pairs.map(x=>x.occurrence))),top:pairs.sort((a,b)=>b.occurrence-a.occurrence).slice(0,6)},
      triple:{avg:clamp100(avgOf(triples.map(x=>x.occurrence))),top:triples.sort((a,b)=>b.occurrence-a.occurrence).slice(0,5)},
      quad:{avg:clamp100(avgOf(quads.map(x=>x.occurrence))),top:quads.sort((a,b)=>b.occurrence-a.occurrence).slice(0,3)},
      recent:flow
    };
  }
  function classicAIRaw(nums){
    try{
      if(typeof global.comboScoreParts==='function'&&typeof global.companionAnalysis==='function'&&typeof global.frequencyMap==='function'){
        const parts=global.comboScoreParts(cleanNums(nums),global.companionAnalysis(),global.frequencyMap(global.lottoData||[]));
        return {raw:Number(parts.total)||0,parts};
      }
    }catch(e){}
    return {raw:0,parts:null};
  }
  function normalizeClassic(items){
    const vals=items.map(x=>x.classic.raw);
    const min=Math.min(...vals),max=Math.max(...vals);
    items.forEach(x=>{
      x.classic.score=max>min?clamp100(55+(x.classic.raw-min)/(max-min)*43):75;
      x.aiLinked=clamp100(x.classic.score*.70+x.pattern.adjusted*.30);
    });
  }
  function scorePatternComboV3(nums,opts={}){
    const clean=cleanNums(nums);
    if(clean.length!==6)return null;
    const maps=opts.maps||buildPatternMaps(opts);
    const m=repeatSupportedMetrics(clean,maps);
    return {
      nums:clean,
      score:m.adjusted,
      strength:m.strength,
      confidence:m.confidence,
      adjusted:m.adjusted,
      grade:gradeForScore(m.adjusted),
      components:m.components,
      confidenceParts:m.confidenceParts,
      pair:m.pair,triple:m.triple,quad:m.quad,recent:m.recent
    };
  }
  function scorePatternComboV3Virtual(nums,context){
    const clean=cleanNums(nums);
    if(clean.length!==6)return null;
    const ctx=context||prepareVirtualPatternContext({});
    if(!ctx)return null;
    const maps=virtualMaps(clean,ctx);
    const m=repeatSupportedMetrics(clean,maps);
    return {
      nums:clean,
      score:m.adjusted,
      strength:m.strength,
      confidence:m.confidence,
      adjusted:m.adjusted,
      grade:gradeForScore(m.adjusted),
      components:m.components,
      confidenceParts:m.confidenceParts,
      pair:m.pair,triple:m.triple,quad:m.quad,recent:m.recent
    };
  }

  function compareOptimizedV3(a,b){
    return (b.aiLinked||0)-(a.aiLinked||0)
      || b.pattern.adjusted-a.pattern.adjusted
      || b.pattern.confidence-a.pattern.confidence
      || a.replaceCount-b.replaceCount
      || a.nums.join(',').localeCompare(b.nums.join(','),undefined,{numeric:true});
  }
  function optimizePatternV3(baseNums,opts={}){
    const base=cleanNums(baseNums);
    if(base.length!==6)return{error:'6개 번호가 필요합니다.'};
    const maxReplace=Math.max(1,Math.min(3,Number(opts.maxReplace)||3));
    const beamWidth=Math.max(35,Math.min(180,Number(opts.beamWidth)||100));
    const maps=buildPatternMaps(opts);
    const currentPattern=scorePatternComboV3(base,{...opts,maps});
    const current={nums:base,removed:[],added:[],replaceCount:0,pattern:currentPattern,classic:classicAIRaw(base)};
    const poolNums=candidatePool(base,opts).slice(0,32);
    let frontier=[current],all=[current];
    const seen=new Set([keyOf(base)]);
    for(let depth=1;depth<=maxReplace;depth++){
      const next=[];
      frontier.forEach(node=>{
        node.nums.forEach(oldNum=>{
          poolNums.forEach(newNum=>{
            if(node.nums.includes(newNum))return;
            const nums=cleanNums(node.nums.filter(n=>n!==oldNum).concat(newNum));
            const k=keyOf(nums);
            if(seen.has(k))return;
            seen.add(k);
            next.push({
              nums,
              removed:cleanNums([...node.removed,oldNum]),
              added:cleanNums([...node.added,newNum]),
              replaceCount:depth,
              pattern:scorePatternComboV3(nums,{...opts,maps}),
              classic:classicAIRaw(nums)
            });
          });
        });
      });
      normalizeClassic(next);
      next.sort(compareOptimizedV3);
      frontier=next.slice(0,beamWidth);
      all.push(...frontier);
    }
    normalizeClassic(all);
    all.sort(compareOptimizedV3);
    const baseItem=all.find(x=>x.replaceCount===0)||current;
    const improved=all.filter(x=>x.replaceCount>0&&x.aiLinked>baseItem.aiLinked);
    const best=improved[0]||all.find(x=>x.replaceCount>0)||null;
    if(!best)return{current:baseItem,best:null,coOptimal:[],tested:seen.size};
    const coOptimal=all.filter(x=>
      x.replaceCount>0 &&
      x.aiLinked===best.aiLinked &&
      x.pattern.adjusted>=best.pattern.adjusted-1
    ).slice(0,8);
    return {
      current:baseItem,best,coOptimal,tested:seen.size,
      reasons:explainV3(baseItem,best),
      weights:phase3Weights
    };
  }
  function explainV3(current,best){
    const reasons=[];
    const pd=best.pattern.adjusted-current.pattern.adjusted;
    const ad=(best.aiLinked||0)-(current.aiLinked||0);
    if(ad)reasons.push(`AI 연동점수 ${current.aiLinked} → ${best.aiLinked} (${ad>0?'+':''}${ad})`);
    if(pd)reasons.push(`Confidence 보정 Pattern Score ${current.pattern.adjusted} → ${best.pattern.adjusted}`);
    if(best.pattern.confidence>current.pattern.confidence)reasons.push(`반복기반 Confidence ${current.pattern.confidence}% → ${best.pattern.confidence}%`);
    const c=best.pattern.components,old=current.pattern.components;
    const gains=[
      ['패턴성',c.pattern-old.pattern],
      ['재현성',c.reproduction-old.reproduction],
      ['번호군',c.group-old.group],
      ['흐름성',c.flow-old.flow]
    ].sort((a,b)=>b[1]-a[1]).filter(x=>x[1]>0);
    gains.slice(0,2).forEach(x=>reasons.push(`${x[0]} ${x[1]>0?'+':''}${x[1]}점 개선`));
    const top=best.pattern.quad.top.find(x=>x.count>0)||best.pattern.triple.top.find(x=>x.count>0);
    if(top)reasons.push(`핵심 ${top.nums.join('·')} 패턴 ${top.count}회, 하위 반복 근거 포함`);
    return reasons.slice(0,5);
  }
  function deterministicControls(nums,count=12){
    const base=cleanNums(nums),out=[],seen=new Set();
    for(let shift=1;out.length<count&&shift<45;shift++){
      const c=cleanNums(base.map((n,i)=>((n-1+shift*(i%3+1))%45)+1));
      const k=keyOf(c);
      if(c.length===6&&!seen.has(k)){seen.add(k);out.push(c);}
    }
    return out;
  }
  function backtestPhase3(opts={}){
    const all=rows();
    const testCount=Math.max(20,Math.min(100,Number(opts.testCount)||50));
    const start=Math.min(testCount,Math.max(0,all.length-80));
    const targets=all.slice(0,start||testCount);
    const records=[];
    targets.forEach((target,index)=>{
      const training=all.slice(index+1);
      if(training.length<120)return;
      const maps=buildMapsFromRows(training,opts.includeBonus??true);
      const actual=scorePatternComboV3(target.numbers||target.nums,{maps});
      const controls=deterministicControls(target.numbers||target.nums,14).map(n=>scorePatternComboV3(n,{maps}));
      const scores=[actual.adjusted,...controls.map(x=>x.adjusted)].sort((a,b)=>a-b);
      const rank=scores.filter(x=>x<=actual.adjusted).length/scores.length*100;
      records.push({
        round:target.round,score:actual.adjusted,confidence:actual.confidence,percentile:Math.round(rank),
        top25:rank>=75,top50:rank>=50
      });
    });
    const n=records.length||1;
    const avgPercentile=Math.round(records.reduce((s,x)=>s+x.percentile,0)/n);
    const top25=Math.round(records.filter(x=>x.top25).length/n*100);
    const top50=Math.round(records.filter(x=>x.top50).length/n*100);
    const high=records.filter(x=>x.confidence>=60);
    const highTop25=high.length?Math.round(high.filter(x=>x.top25).length/high.length*100):0;
    return {
      count:records.length,avgPercentile,top25,top50,highConfidenceCount:high.length,highTop25,
      verdict:avgPercentile>=60?'양호':avgPercentile>=52?'보통':'재튜닝 필요',
      records:records.slice(0,12),
      note:'각 회차 이전 데이터만 사용해 실제 당첨조합의 점수를 14개 결정론적 대조조합과 비교했습니다.'
    };
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
    bestWithCandidate,recommendationPatterns,strength,selectedNumsFromInput,requiredSelectedCount,indexForPattern,patternSetIndex,aiUsageForPattern,gradeForScore,
    scorePatternCombo:scorePatternComboV3,optimizePattern:optimizePatternV3,explainPatternRecommendation,
    phase3Weights,scorePatternComboV3,scorePatternComboV3Virtual,prepareVirtualPatternContext,optimizePatternV3,backtestPhase3,
    clearOptimizerCache:()=>{optimizerCache.clear();virtualPatternContextCache.clear();}
  });
})(window);
