(function(global){
  'use strict';

  const cleanNums=arr=>[...new Set((arr||[]).map(Number).filter(n=>n>=1&&n<=45))].sort((a,b)=>a-b);
  const keyOf=nums=>cleanNums(nums).join(',');
  const clamp=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));

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

  function pool(row,includeBonus=true){
    const nums=cleanNums(row.numbers||row.nums||[]);
    if(includeBonus&&Number(row.bonus)>=1&&Number(row.bonus)<=45)nums.push(Number(row.bonus));
    return cleanNums(nums);
  }

  function frequencyMap(rows){
    const m={};for(let i=1;i<=45;i++)m[i]=0;
    rows.forEach(row=>(row.numbers||[]).forEach(n=>m[n]++));
    return m;
  }

  function pairCount(a,b,rows,includeBonus=true){
    let c=0;
    rows.forEach(row=>{
      const p=pool(row,includeBonus);
      if(p.includes(a)&&p.includes(b))c++;
    });
    return c;
  }

  function zoneBalanceScore(nums){
    const zones=[0,0,0,0,0];
    nums.forEach(n=>{if(n<=9)zones[0]++;else if(n<=19)zones[1]++;else if(n<=29)zones[2]++;else if(n<=39)zones[3]++;else zones[4]++;});
    const used=zones.filter(x=>x>0).length,max=Math.max(...zones);
    return Math.max(0,used*6-(max>3?10:0));
  }

  function oddEvenScore(nums){
    const odd=nums.filter(n=>n%2).length;
    return Math.max(0,14-Math.abs(3-odd)*5);
  }

  function recentTrendScore(nums,rows){
    const recent=rows.slice(0,20).flatMap(x=>x.numbers||[]);
    const hits=nums.filter(n=>recent.includes(n)).length;
    return Math.max(0,12-Math.max(0,hits-3)*3);
  }

  function longTrendScore(nums,allFreq){
    const vals=nums.map(n=>allFreq[n]||0);
    const avg=vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length);
    return Math.min(18,Math.round(avg*.3));
  }

  function historicalHitScore(nums,rows,includeBonus=true){
    let score=0;
    rows.slice(0,100).forEach(row=>{
      const p=pool(row,includeBonus);
      const h=nums.filter(n=>p.includes(n)).length;
      if(h>=3)score+=h*h;
    });
    return score;
  }

  function learnedScore(nums,rows,includeBonus=true){
    let hit3=0,hit4=0,hit5=0,recent=0,total=0;
    rows.forEach((row,i)=>{
      const p=pool(row,includeBonus);
      const hit=nums.filter(n=>p.includes(n)).length;
      total+=hit;
      if(hit>=3)hit3++;
      if(hit>=4)hit4++;
      if(hit>=5)hit5++;
      if(i<50&&hit>=3)recent++;
    });
    const avg=rows.length?total/rows.length:0;
    return Math.min(32,hit3*.08+hit4*.55+hit5*2.5+recent*.18+avg*2);
  }

  function companionAnalysis(baseNums,trainingRows,range=50,includeBonus=true){
    const base=cleanNums(baseNums);
    const source=range==='all'?trainingRows:trainingRows.slice(0,Number(range)||50);
    const matched=source.filter(row=>base.some(n=>pool(row,includeBonus).includes(n)));
    const counts={};for(let i=1;i<=45;i++)counts[i]=0;
    matched.forEach(row=>pool(row,includeBonus).forEach(n=>{if(!base.includes(n))counts[n]++;}));
    const max=Math.max(...Object.values(counts),1);
    const top=Object.entries(counts).map(([n,c])=>({n:Number(n),count:c,index:Math.round(c/max*100)}))
      .filter(x=>x.count>0).sort((a,b)=>b.count-a.count||a.n-b.n).slice(0,15);
    return {rows:matched,top,recommend:top.slice(0,3).map(x=>x.n),counts,max};
  }

  function companionIndexScore(nums,data,includeBonus=true){
    let s=0;
    nums.forEach(n=>{if(!data.base.includes(n))s+=(data.counts[n]||0)*8;});
    for(let i=0;i<nums.length;i++){
      for(let j=i+1;j<nums.length;j++)s+=pairCount(nums[i],nums[j],data.rows,includeBonus)*2;
    }
    return s;
  }

  function classicParts(nums,data,trainingRows,includeBonus=true){
    const freq=frequencyMap(trainingRows);
    const companion=companionIndexScore(nums,data,includeBonus);
    const balance=zoneBalanceScore(nums);
    const oddEven=oddEvenScore(nums);
    const recent=recentTrendScore(nums,trainingRows);
    const long=longTrendScore(nums,freq);
    const historical=historicalHitScore(nums,data.rows,includeBonus)*.35;
    const learned=learnedScore(nums,trainingRows,includeBonus);
    return {companion,balance,oddEven,recent,long,historical,learned,
      total:companion+balance+oddEven+recent+long+historical+learned};
  }

  function makeRankedCombos(baseNums,trainingRows,opts={}){
    const base=cleanNums(baseNums),range=opts.range||50,includeBonus=opts.includeBonus!==false;
    const ca=companionAnalysis(base,trainingRows,range,includeBonus);
    ca.base=base;
    const poolNums=ca.top.map(x=>x.n).filter(n=>!base.includes(n));
    let candidates=[];
    if(base.length>=6){
      choose(base,4).forEach(s=>choose(poolNums.slice(0,12),2).forEach(c=>candidates.push({nums:cleanNums([...s,...c]),replace:2})));
      choose(base,5).forEach(s=>poolNums.slice(0,12).forEach(c=>candidates.push({nums:cleanNums([...s,c]),replace:1})));
      choose(base,3).forEach(s=>choose(poolNums.slice(0,10),3).forEach(c=>candidates.push({nums:cleanNums([...s,...c]),replace:3})));
    }else{
      const need=6-base.length;
      choose(poolNums.slice(0,15),need).forEach(c=>candidates.push({nums:cleanNums([...base,...c]),replace:need}));
    }
    const seen=new Set();
    candidates=candidates.filter(c=>c.nums.length===6&&!seen.has(keyOf(c.nums))&&seen.add(keyOf(c.nums)));
    let scored=candidates.map(c=>({...c,parts:classicParts(c.nums,ca,trainingRows,includeBonus)}))
      .sort((a,b)=>b.parts.total-a.parts.total||keyOf(a.nums).localeCompare(keyOf(b.nums),undefined,{numeric:true}))
      .slice(0,10);
    if(!scored.length)return[];
    const max=scored[0].parts.total||1,min=scored[scored.length-1].parts.total||0;
    return scored.map((x,i)=>({
      ...x,rank:i+1,
      classicScore:clamp(62+((x.parts.total-min)/(max-min||1))*34)
    }));
  }

  function companionMetrics(nums,trainingRows,includeBonus=true){
    const engine=global.CompanionCombinationEngine;
    if(engine?.scorePatternComboV3){
      try{
        return engine.scorePatternComboV3(nums,{rows:trainingRows,includeBonus});
      }catch(e){}
    }
    if(engine?.scorePatternCombo){
      try{return engine.scorePatternCombo(nums,{includeBonus});}catch(e){}
    }
    return {strength:0,confidence:0,adjusted:0,score:0,components:{},confidenceParts:{}};
  }

  function scoreCandidate(candidate,trainingRows,includeBonus=true){
    const p=companionMetrics(candidate.nums,trainingRows,includeBonus);
    const adjusted=Number(p.adjusted??p.score??0);
    const confidence=Number(p.confidence??0);
    const strength=Number(p.strength??p.score??0);
    const linked=clamp(candidate.classicScore*.70+adjusted*.30);
    return {...candidate,pattern:p,patternStrength:strength,confidence,adjusted,aiLinked:linked};
  }

  function matchInfo(nums,target){
    const normal=nums.filter(n=>(target.numbers||[]).includes(n));
    const bonus=nums.includes(Number(target.bonus));
    return {normal:normal.length,bonus,total:normal.length+(bonus?1:0),matched:normal};
  }

  function singleRound(data,targetRound,baseNums,opts={}){
    const sorted=data.slice().sort((a,b)=>Number(b.round)-Number(a.round));
    const target=sorted.find(x=>Number(x.round)===Number(targetRound));
    if(!target)return{error:'선택한 회차를 찾지 못했습니다.'};
    const training=sorted.filter(x=>Number(x.round)<Number(targetRound));
    if(training.length<100)return{error:'학습 데이터가 부족한 회차입니다.'};
    const base=cleanNums(baseNums);
    if(base.length<2||base.length>6)return{error:'기준번호는 2개 이상 6개 이하로 입력하세요.'};
    const ranked=makeRankedCombos(base,training,opts).map(c=>scoreCandidate(c,training,opts.includeBonus!==false));
    ranked.sort((a,b)=>b.aiLinked-a.aiLinked||b.classicScore-a.classicScore);
    ranked.forEach((x,i)=>{x.rank=i+1;x.hit=matchInfo(x.nums,target);});
    const actualPattern=companionMetrics(target.numbers,training,opts.includeBonus!==false);
    return {
      target,trainingCount:training.length,base,ranked,
      bestHit:ranked.slice().sort((a,b)=>b.hit.total-a.hit.total||a.rank-b.rank)[0]||null,
      actualPattern,
      evolution:{
        classic:ranked[0]?.classicScore||0,
        companion:ranked[0]?.adjusted||0,
        linked:ranked[0]?.aiLinked||0
      }
    };
  }

  function deterministicControls(nums,count=14){
    const base=cleanNums(nums),out=[],seen=new Set();
    for(let shift=1;out.length<count&&shift<45;shift++){
      const c=cleanNums(base.map((n,i)=>((n-1+shift*(i%3+1))%45)+1));
      const k=keyOf(c);
      if(c.length===6&&!seen.has(k)){seen.add(k);out.push(c);}
    }
    return out;
  }

  function walkForward(data,testCount=50,opts={}){
    const sorted=data.slice().sort((a,b)=>Number(b.round)-Number(a.round));
    const targets=sorted.slice(0,Math.min(testCount,sorted.length-150));
    const records=[];
    targets.forEach((target,index)=>{
      const training=sorted.slice(index+1);
      if(training.length<120)return;
      const actual=companionMetrics(target.numbers,training,opts.includeBonus!==false);
      const controls=deterministicControls(target.numbers,14).map(nums=>companionMetrics(nums,training,opts.includeBonus!==false));
      const actualScore=Number(actual.adjusted??actual.score??0);
      const controlScores=controls.map(x=>Number(x.adjusted??x.score??0));
      const percentile=Math.round(controlScores.filter(x=>x<=actualScore).length/(controlScores.length||1)*100);
      records.push({
        round:target.round,date:target.date,
        patternStrength:Number(actual.strength??actual.score??0),
        confidence:Number(actual.confidence??0),
        adjusted:actualScore,percentile,
        top25:percentile>=75,top50:percentile>=50
      });
    });
    return records;
  }

  function thresholdRows(records,field,thresholds){
    return thresholds.map(t=>{
      const rows=records.filter(x=>Number(x[field])>=t);
      const n=rows.length;
      return {
        threshold:t,count:n,
        avgPercentile:n?Math.round(rows.reduce((s,x)=>s+x.percentile,0)/n):0,
        top25:n?Math.round(rows.filter(x=>x.top25).length/n*100):0,
        top50:n?Math.round(rows.filter(x=>x.top50).length/n*100):0
      };
    });
  }

  function validationReport(data,opts={}){
    const records=walkForward(data,Number(opts.testCount)||50,opts);
    const n=records.length||1;
    return {
      count:records.length,
      avgPercentile:Math.round(records.reduce((s,x)=>s+x.percentile,0)/n),
      top25:Math.round(records.filter(x=>x.top25).length/n*100),
      top50:Math.round(records.filter(x=>x.top50).length/n*100),
      confidence:thresholdRows(records,'confidence',[40,50,60,70,80]),
      strength:thresholdRows(records,'patternStrength',[40,50,60,70,80]),
      adjusted:thresholdRows(records,'adjusted',[30,40,50,60,70]),
      records
    };
  }

  global.ValidationEngine=Object.freeze({
    singleRound,validationReport,walkForward,makeRankedCombos,matchInfo
  });
})(window);
