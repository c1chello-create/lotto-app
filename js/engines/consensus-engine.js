(function (global) {
  'use strict';
  const clamp = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const weights = Object.freeze({ companion: 0.24, frequency: 0.18, continuity: 0.12, pattern: 0.16, replay: 0.12, flow: 0.10, dream: 0.08 });

  function rows(){
    const s=global.ComboLegacy&&global.ComboLegacy.getState();
    return s&&Array.isArray(s.lottoData)?s.lottoData:[];
  }
  function freqMap(source){
    const out={}; for(let n=1;n<=45;n++)out[n]=0;
    (source||[]).forEach(r=>(r.numbers||[]).forEach(n=>out[n]++));
    return out;
  }
  function normalizedMap(map){
    const vals=Object.values(map); const min=Math.min(...vals), max=Math.max(...vals);
    const out={}; for(let n=1;n<=45;n++)out[n]=clamp((map[n]-min)/(max-min||1)*100); return out;
  }
  function context(companionData){
    const all=rows(), recent=all.slice(0,50), prior=all.slice(50,100);
    const frequency=normalizedMap(freqMap(all));
    const rf=normalizedMap(freqMap(recent)), pf=normalizedMap(freqMap(prior));
    const continuity={}; for(let n=1;n<=45;n++)continuity[n]=clamp(50+(rf[n]-pf[n])*.65);
    const companion={}; for(let n=1;n<=45;n++)companion[n]=0;
    ((companionData&&companionData.top)||[]).forEach(x=>companion[x.n]=clamp(x.index));
    return {frequency,continuity,companion};
  }
  function patternSignals(nums){
    let p=null;
    try{ p=global.PatternEngine&&global.PatternEngine.reference(nums); }catch(e){}
    p=p||{};
    const sets={
      pattern:new Set((p.patternTop||p.topNumbers||[]).map(x=>Number(x.n??x))),
      replay:new Set((p.replayTop||[]).map(x=>Number(x.n??x))),
      flow:new Set((p.chains||[]).flatMap(x=>x.chain||[]).map(Number)),
      dream:new Set((p.topNumbers||[]).map(Number))
    };
    return {raw:p,sets};
  }
  function scoreCombo(nums, companionData){
    nums=[...new Set((nums||[]).map(Number))].filter(n=>n>=1&&n<=45).sort((a,b)=>a-b);
    const ctx=context(companionData), ps=patternSignals(nums);
    const details=nums.map(n=>{
      const scores={
        companion:ctx.companion[n]||0,
        frequency:ctx.frequency[n]||0,
        continuity:ctx.continuity[n]||0,
        pattern:ps.sets.pattern.has(n)?clamp(Math.max(65,ps.raw.pattern||0)):clamp((ps.raw.pattern||0)*.35),
        replay:ps.sets.replay.has(n)?clamp(Math.max(65,ps.raw.replay||0)):clamp((ps.raw.replay||0)*.30),
        flow:ps.sets.flow.has(n)?clamp(Math.max(65,ps.raw.flow||0)):clamp((ps.raw.flow||0)*.30),
        dream:ps.sets.dream.has(n)?clamp(Math.max(60,ps.raw.dream||0)):clamp((ps.raw.dream||0)*.25)
      };
      const supporters=Object.keys(scores).filter(k=>scores[k]>=60);
      const weighted=Object.entries(weights).reduce((s,[k,w])=>s+scores[k]*w,0);
      const agreementBonus=Math.max(0,supporters.length-2)*2.5;
      return {number:n,score:clamp(weighted+agreementBonus),supporters,scores};
    });
    const engineScores={};
    Object.keys(weights).forEach(key=>{
      engineScores[key]=clamp(details.reduce((sum,item)=>sum+(Number(item.scores&&item.scores[key])||0),0)/(details.length||1));
    });
    const score=clamp(details.reduce((s,x)=>s+x.score,0)/(details.length||1));
    const agreement=Math.round(details.reduce((s,x)=>s+x.supporters.length,0)/(details.length||1)*10)/10;
    const agreementCount=Object.values(engineScores).filter(value=>value>=60).length;
    const engineCount=Object.keys(engineScores).length;
    const label=score>=85?'매우 높은 합의':score>=72?'높은 합의':score>=58?'보통 합의':score>=42?'낮은 합의':'매우 낮은 합의';
    return {score,label,agreement,agreementCount,engineCount,engineScores,details,weights,mode:'weight-only'};
  }
  function enrich(candidates, companionData){
    if(!Array.isArray(candidates)||!candidates.length)return [];
    const totals=candidates.map(c=>Number(c.parts&&c.parts.total)||0), min=Math.min(...totals), max=Math.max(...totals);
    return candidates.map(c=>{
      const classic=clamp(62+((c.parts.total-min)/(max-min||1))*34);
      const consensus=scoreCombo(c.nums,companionData);
      const finalScore=clamp(classic*.85+consensus.score*.15);
      return {...c,classicTrust:classic,consensus,finalScore};
    }).sort((a,b)=>b.finalScore-a.finalScore||b.classicTrust-a.classicTrust||a.nums.join('').localeCompare(b.nums.join('')));
  }
  global.ConsensusEngine=Object.freeze({name:'ConsensusEngine',version:'1.9.0-phase3.1',weights,scoreCombo,enrich});
})(window);
