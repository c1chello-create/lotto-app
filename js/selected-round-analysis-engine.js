(function(global){
  'use strict';
  if(global.__selectedRoundAnalysisV1)return;
  global.__selectedRoundAnalysisV1=true;

  const MIN_ROUNDS=5, MAX_ROUNDS=50;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cls=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=(n,extra='')=>`<span class="ball small-ball ${cls(Number(n))} ${extra}">${Number(n)}</span>`;
  const pct=(a,b)=>b?Math.round(a/b*1000)/10:0;

  function getRows(){
    const cands=[global.LOTTO_DATA,global.lottoData];
    for(const x of cands)if(Array.isArray(x)&&x.length)return x.slice().sort((a,b)=>Number(a.round)-Number(b.round));
    try{if(typeof lottoData!=='undefined'&&Array.isArray(lottoData)&&lottoData.length)return lottoData.slice().sort((a,b)=>Number(a.round)-Number(b.round));}catch(e){}
    return [];
  }

  function normalizeNums(row,includeBonus=false){
    const out=(row?.numbers||[]).map(Number).filter(n=>n>=1&&n<=45);
    if(includeBonus&&Number(row?.bonus)>=1&&Number(row?.bonus)<=45)out.push(Number(row.bonus));
    return [...new Set(out)];
  }

  function parseRounds(raw){
    const values=[];
    const parts=String(raw||'').split(/[\s,]+/).map(x=>x.trim()).filter(Boolean);
    for(const p of parts){
      const m=p.match(/^(\d+)\s*[~-]\s*(\d+)$/);
      if(m){
        let a=Number(m[1]),b=Number(m[2]);
        const step=a<=b?1:-1;
        for(let r=a;;r+=step){values.push(r);if(r===b)break;if(values.length>MAX_ROUNDS*4)break;}
      }else if(/^\d+$/.test(p)) values.push(Number(p));
    }
    return [...new Set(values.filter(n=>Number.isInteger(n)&&n>0))];
  }

  function sampleLabel(n){
    if(n<=7)return ['표본 적음','선택 회차가 적어 반복률 변동이 큽니다.'];
    if(n<=12)return ['참고 표본','패턴 후보를 참고용으로 해석하세요.'];
    if(n<=25)return ['보통 표본','빈도·동반·흐름 비교에 적절한 규모입니다.'];
    return ['충분한 표본','지정회차 내부 비교에 충분한 표본입니다.'];
  }

  function combinations(arr,k){
    const out=[];
    function rec(start,p){
      if(p.length===k){out.push(p.slice());return;}
      for(let i=start;i<=arr.length-(k-p.length);i++){p.push(arr[i]);rec(i+1,p);p.pop();}
    }
    rec(0,[]);return out;
  }

  function frequency(rows,includeBonus){
    const counts=Array(46).fill(0);
    rows.forEach(r=>normalizeNums(r,includeBonus).forEach(n=>counts[n]++));
    return Array.from({length:45},(_,i)=>({n:i+1,count:counts[i+1],rate:pct(counts[i+1],rows.length)}))
      .sort((a,b)=>b.count-a.count||a.n-b.n);
  }

  function companions(rows,includeBonus,k){
    const map=new Map();
    for(const r of rows){
      const nums=normalizeNums(r,includeBonus).sort((a,b)=>a-b);
      for(const c of combinations(nums,k)){
        const key=c.join('-');const x=map.get(key)||{nums:c,count:0,rounds:[]};x.count++;x.rounds.push(Number(r.round));map.set(key,x);
      }
    }
    return [...map.values()].filter(x=>x.count>=2).map(x=>({...x,rate:pct(x.count,rows.length)}))
      .sort((a,b)=>b.count-a.count||a.nums.join('-').localeCompare(b.nums.join('-')));
  }

  function flow(rows,includeBonus){
    const n=rows.length,cut=Math.floor(n/2),older=rows.slice(0,cut),recent=rows.slice(cut);
    const out=[];
    for(let num=1;num<=45;num++){
      const pos=[];rows.forEach((r,i)=>{if(normalizeNums(r,includeBonus).includes(num))pos.push(i)});
      const oldCount=older.filter(r=>normalizeNums(r,includeBonus).includes(num)).length;
      const recentCount=recent.filter(r=>normalizeNums(r,includeBonus).includes(num)).length;
      const oldRate=older.length?oldCount/older.length:0,recentRate=recent.length?recentCount/recent.length:0;
      const delta=(recentRate-oldRate)*100;
      const lastGap=pos.length?((n-1)-pos[pos.length-1]):null;
      let state='중립';
      if(recentCount>=2&&delta>=10)state='상승';
      else if(recentCount>=1&&delta<=-10)state='약화';
      else if(recentCount>=2&&Math.abs(delta)<10)state='유지';
      else if(recentCount===0&&oldCount>0)state='휴식';
      const score=Math.max(0,Math.min(100,Math.round(recentRate*70+Math.max(0,delta)/100*30)*100));
      out.push({n:num,count:pos.length,oldCount,recentCount,oldRate:pct(oldCount,older.length),recentRate:pct(recentCount,recent.length),delta:Math.round(delta*10)/10,lastGap,state,score});
    }
    return out.sort((a,b)=>{
      const rank={상승:4,유지:3,중립:2,약화:1,휴식:0};
      return rank[b.state]-rank[a.state]||b.recentRate-a.recentRate||b.count-a.count||a.n-b.n;
    });
  }

  function strengthSets(freq,comp2,flowData){
    const activeFreq=freq.filter(x=>x.count>0);
    const freqTop=new Set(activeFreq.slice(0,Math.min(12,Math.max(6,Math.ceil(activeFreq.length*.3)))).map(x=>x.n));
    const compScore=new Map();
    comp2.forEach((x,idx)=>{const w=Math.max(1,20-idx);x.nums.forEach(n=>compScore.set(n,(compScore.get(n)||0)+x.count*10+w));});
    const compTop=new Set([...compScore.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,12).map(x=>x[0]));
    const flowTop=new Set(flowData.filter(x=>x.state==='상승'||x.state==='유지').slice(0,12).map(x=>x.n));
    const all=[...new Set([...freqTop,...compTop,...flowTop])].map(n=>({n,hits:Number(freqTop.has(n))+Number(compTop.has(n))+Number(flowTop.has(n)),freq:freqTop.has(n),comp:compTop.has(n),flow:flowTop.has(n)}))
      .sort((a,b)=>b.hits-a.hits||a.n-b.n);
    return {freqTop,compTop,flowTop,all,three:all.filter(x=>x.hits===3),two:all.filter(x=>x.hits===2)};
  }

  const PATTERNS=[
    {name:'2·4',gaps:[2,4],series:'2계열'},
    {name:'2·6',gaps:[2,6],series:'2계열'},
    {name:'4·6',gaps:[4,6],series:'2계열'},
    {name:'3·6',gaps:[3,6],series:'3계열'},
    {name:'3·9',gaps:[3,9],series:'3계열'},
    {name:'6·9',gaps:[6,9],series:'3계열'}
  ];

  function intersect(a,b){const s=new Set(b);return [...new Set(a.filter(n=>s.has(n)))].sort((x,y)=>x-y)}

  function repeatPatterns(rows,includeBonus){
    const pools=rows.map(r=>normalizeNums(r,includeBonus));
    const singles=[];const pairs=[];
    for(const pat of PATTERNS){
      const [g1,g2]=pat.gaps,maxg=Math.max(g1,g2);
      if(rows.length<=maxg)continue;
      const perNum=new Map(),perPair=new Map();
      let patternSamples=0;
      for(let i=maxg;i<rows.length;i++){
        const candidates=intersect(pools[i-g1],pools[i-g2]);
        if(!candidates.length)continue;
        patternSamples++;
        const target=new Set(pools[i]);
        for(const num of candidates){const x=perNum.get(num)||{opps:0,hits:0,hitRounds:[]};x.opps++;if(target.has(num)){x.hits++;x.hitRounds.push(Number(rows[i].round));}perNum.set(num,x)}
        for(const pr of combinations(candidates,2)){
          const key=pr.join('-');const x=perPair.get(key)||{nums:pr,opps:0,hits:0,hitRounds:[]};x.opps++;if(pr.every(n=>target.has(n))){x.hits++;x.hitRounds.push(Number(rows[i].round));}perPair.set(key,x)
        }
      }
      const nextIndex=rows.length;
      const nextCandidates=nextIndex>=maxg?intersect(pools[nextIndex-g1],pools[nextIndex-g2]):[];
      const nextSet=new Set(nextCandidates);
      for(const [num,x] of perNum){
        if(!nextSet.has(num))continue;
        singles.push({n:num,pattern:pat.name,series:pat.series,opps:x.opps,hits:x.hits,rate:pct(x.hits,x.opps),sampleCount:patternSamples,hitRounds:x.hitRounds});
      }
      const nextPairs=combinations(nextCandidates,2);const nextPairKeys=new Set(nextPairs.map(x=>x.join('-')));
      for(const [key,x] of perPair){
        if(!nextPairKeys.has(key))continue;
        pairs.push({...x,pattern:pat.name,series:pat.series,rate:pct(x.hits,x.opps),sampleCount:patternSamples});
      }
    }
    singles.sort((a,b)=>b.rate-a.rate||b.hits-a.hits||b.opps-a.opps||a.n-b.n);
    pairs.sort((a,b)=>b.rate-a.rate||b.hits-a.hits||b.opps-a.opps||a.nums.join('-').localeCompare(b.nums.join('-')));
    return {singles,pairs};
  }

  function aggregateRepeat(patternData){
    const m=new Map();
    patternData.singles.forEach(x=>{const a=m.get(x.n)||{n:x.n,weighted:0,weight:0,hits:0,opps:0,patterns:[]};const w=Math.max(1,x.opps);a.weighted+=x.rate*w;a.weight+=w;a.hits+=x.hits;a.opps+=x.opps;a.patterns.push(x);m.set(x.n,a)});
    return [...m.values()].map(x=>({...x,score:x.weight?Math.round(x.weighted/x.weight):0})).sort((a,b)=>b.score-a.score||b.hits-a.hits||a.n-b.n);
  }

  function analyze(roundIds,includeBonus){
    const all=getRows(),byRound=new Map(all.map(r=>[Number(r.round),r]));
    const missing=roundIds.filter(r=>!byRound.has(r));
    if(missing.length)return {error:`데이터에 없는 회차가 있습니다: ${missing.slice(0,8).join(', ')}${missing.length>8?' 외':''}`};
    const rows=roundIds.map(r=>byRound.get(r)).sort((a,b)=>Number(a.round)-Number(b.round));
    const freq=frequency(rows,includeBonus),comp2=companions(rows,includeBonus,2),comp3=companions(rows,includeBonus,3),comp4=companions(rows,includeBonus,4),flowData=flow(rows,includeBonus);
    const common=strengthSets(freq,comp2,flowData),patterns=repeatPatterns(rows,includeBonus),repeatTop=aggregateRepeat(patterns);
    return {rows,freq,comp2,comp3,comp4,flow:flowData,common,patterns,repeatTop,includeBonus};
  }

  function shell(){
    return `<section class="combo-card sra-card" id="selectedRoundAnalysisCard">
      <div class="sra-head"><div><b>📊 지정회차 통합분석</b><p>사용자가 지정한 5~50개 회차만 별도 표본으로 분석합니다.</p></div><span>독립 엔진</span></div>
      <textarea id="sraRoundInput" class="combo-input sra-input" rows="3" inputmode="text" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="예: 1165, 887, 682, 676, 488  또는  1100~1110"></textarea>
      <div class="sra-options"><span id="sraCount">0 / 50회</span><label><input type="checkbox" id="sraBonus"> 보너스 포함</label></div>
      <button type="button" class="combo-btn" id="sraRun">지정회차 분석하기</button>
      <p class="sra-note">※ 반복패턴은 지정회차를 오름차순으로 놓은 <b>선택목록 순서</b>를 기준으로 2·4, 2·6, 3·6 등의 재현을 검사합니다. 선택회차가 연속이면 실제 회차 간격과 같습니다.</p>
      <div id="sraStatus" class="sra-status">회차를 5개 이상 입력하세요.</div>
      <div id="sraResult"></div>
    </section>`;
  }

  function injectStyle(){
    if($('sraStyleV1'))return;
    const st=document.createElement('style');st.id='sraStyleV1';st.textContent=`
      .sra-card{border-color:#b9d8ff!important;background:linear-gradient(180deg,#fbfdff,#f7fbff)!important}.sra-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.sra-head b{font-size:18px;color:#11366b}.sra-head p{margin:5px 0 0;color:#667085;font-size:12px;line-height:1.5}.sra-head>span{white-space:nowrap;background:#e9f2ff;color:#1769aa;font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px}.sra-input{margin-top:13px!important}.sra-options{display:flex;justify-content:space-between;align-items:center;margin:4px 1px 10px;font-size:12px;color:#667085}.sra-options label{display:flex;gap:5px;align-items:center}.sra-options input{width:17px;height:17px;accent-color:#11366b}.sra-note{font-size:11px;line-height:1.55;color:#667085;margin:10px 0 0}.sra-status{margin-top:11px;padding:10px 11px;border-radius:12px;background:#f2f4f7;color:#667085;font-size:12px}.sra-status.error{background:#fff1f0;color:#b42318}.sra-status.ok{background:#eef8f2;color:#257746}.sra-block{margin-top:15px;padding-top:14px;border-top:1px solid #dce7f6}.sra-block-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:9px}.sra-block-title b{color:#11366b;font-size:15px}.sra-block-title span{font-size:10px;color:#667085}.sra-round{display:grid;grid-template-columns:62px 1fr 34px;gap:5px;align-items:center;padding:8px 0;border-top:1px solid #edf2f7}.sra-round:first-child{border-top:0}.sra-round-meta b,.sra-round-meta small{display:block}.sra-round-meta small{font-size:9px;color:#98a2b3;margin-top:2px}.sra-balls{display:flex;gap:3px;flex-wrap:wrap;align-items:center}.sra-plus{font-size:10px;color:#98a2b3}.sra-freq-row{display:grid;grid-template-columns:38px 1fr 74px;gap:7px;align-items:center;padding:7px 0;border-top:1px solid #edf2f7}.sra-freq-row:first-child{border-top:0}.sra-bar{height:8px;background:#e8eff7;border-radius:99px;overflow:hidden}.sra-bar i{display:block;height:100%;background:#2d8cff;border-radius:99px}.sra-value{text-align:right;font-size:11px;font-weight:850;color:#11366b}.sra-tabs{display:flex;gap:6px;margin-bottom:8px}.sra-tabs button{border:1px solid #d4deeb;background:#fff;color:#475467;padding:7px 10px;border-radius:10px;font-size:11px;font-weight:900}.sra-tabs button.active{background:#11366b;color:#fff;border-color:#11366b}.sra-combo-row{display:grid;grid-template-columns:minmax(0,1fr) 72px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #edf2f7}.sra-combo-row:first-child{border-top:0}.sra-combo-row .sra-balls{gap:4px}.sra-combo-row>span{text-align:right;font-size:11px;font-weight:850;color:#11366b}.sra-flow-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.sra-flow-item{border:1px solid #e4ebf4;background:#fff;border-radius:12px;padding:9px}.sra-flow-head{display:flex;justify-content:space-between;align-items:center}.sra-flow-head strong{font-size:11px}.sra-flow-head strong.up{color:#b54708}.sra-flow-head strong.keep{color:#257746}.sra-flow-head strong.down{color:#667085}.sra-flow-item small{display:block;font-size:9px;color:#667085;line-height:1.4;margin-top:5px}.sra-common{background:#fffaf0;border:1px solid #ecd79e;border-radius:14px;padding:11px;margin-top:8px}.sra-common-row{display:grid;grid-template-columns:86px 1fr;gap:6px;align-items:center;margin-top:8px}.sra-common-row:first-child{margin-top:0}.sra-common-row>span{font-size:11px;font-weight:900;color:#8a5b00}.sra-pattern-card{border:1px solid #d9ead3;background:#f7fff4;border-radius:14px;padding:11px;margin-top:9px}.sra-pattern-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.sra-pattern-head b{color:#257746}.sra-pattern-head span{font-size:10px;font-weight:900;background:#e8f5eb;color:#257746;padding:4px 7px;border-radius:999px}.sra-pattern-card p{font-size:10px;color:#667085;line-height:1.5;margin:6px 0 0}.sra-pattern-lines{margin-top:7px}.sra-pattern-line{display:grid;grid-template-columns:58px 1fr 70px;gap:6px;align-items:center;padding:6px 0;border-top:1px solid #e4efe3}.sra-pattern-line:first-child{border-top:0}.sra-pattern-line>span{font-size:10px;color:#475467}.sra-pattern-line>strong{text-align:right;font-size:10px;color:#257746}.sra-empty{padding:18px 5px;text-align:center;color:#98a2b3;font-size:11px}.sra-disclaimer{margin-top:12px;padding:10px;border-radius:12px;background:#f8fafc;color:#667085;font-size:10px;line-height:1.55}@media(max-width:420px){.sra-round{grid-template-columns:58px 1fr 30px}.sra-flow-grid{grid-template-columns:1fr}.sra-common-row{grid-template-columns:78px 1fr}.sra-pattern-line{grid-template-columns:52px 1fr 64px}}
    `;document.head.appendChild(st);
  }

  function renderRounds(rows,includeBonus){return rows.map(r=>`<div class="sra-round"><div class="sra-round-meta"><b>${r.round}회</b><small>${esc(r.date||'')}</small></div><div class="sra-balls">${(r.numbers||[]).map(n=>ball(n)).join('')}${includeBonus?`<span class="sra-plus">+</span>${ball(r.bonus)}`:''}</div><span></span></div>`).join('')}

  function renderFreq(items,total){
    const top=items.filter(x=>x.count>0).slice(0,15),max=Math.max(...top.map(x=>x.count),1);
    return top.map(x=>`<div class="sra-freq-row">${ball(x.n)}<div class="sra-bar"><i style="width:${Math.round(x.count/max*100)}%"></i></div><div class="sra-value">${x.count}회 · ${x.rate}%</div></div>`).join('');
  }

  function renderCompList(list){
    if(!list.length)return '<div class="sra-empty">2회 이상 함께 출현한 조합이 없습니다.</div>';
    return list.slice(0,15).map(x=>`<div class="sra-combo-row"><div class="sra-balls">${x.nums.map(n=>ball(n)).join('')}</div><span>${x.count}회 · ${x.rate}%</span></div>`).join('');
  }

  function renderFlow(list){
    const useful=list.filter(x=>x.count>0).slice(0,12);
    return `<div class="sra-flow-grid">${useful.map(x=>{const c=x.state==='상승'?'up':x.state==='유지'?'keep':'down';return `<div class="sra-flow-item"><div class="sra-flow-head">${ball(x.n)}<strong class="${c}">${x.state}</strong></div><small>전반 ${x.oldRate}% → 후반 ${x.recentRate}%${x.lastGap===null?'':` · 최근 ${x.lastGap===0?'마지막 선택회차 출현':x.lastGap+'칸 전 출현'}`}</small></div>`}).join('')}</div>`;
  }

  function commonBalls(items){return items.length?`<div class="sra-balls">${items.map(x=>ball(x.n)).join('')}</div>`:'<small style="color:#98a2b3">없음</small>'}

  function renderPatterns(data){
    const top=data.repeatTop.slice(0,8);
    const pairTop=data.patterns.pairs.filter(x=>x.opps>=1).slice(0,6);
    if(!top.length&&!pairTop.length)return '<div class="sra-empty">현재 선택목록 끝부분에서 재현 조건을 만족하는 반복 후보가 없습니다.</div>';
    let html='';
    if(top.length){html+=`<div class="sra-pattern-card"><div class="sra-pattern-head"><b>단일번호 반복 후보</b><span>TOP ${top.length}</span></div><p>현재 선택목록의 마지막 위치에서 동일 간격에 겹쳐 나온 번호를 과거 재현률로 평가합니다.</p><div class="sra-pattern-lines">${top.map(x=>`<div class="sra-pattern-line">${ball(x.n)}<span>${x.patterns.map(p=>`${p.pattern} ${p.hits}/${p.opps}`).join(' · ')}</span><strong>반복강도 ${x.score}</strong></div>`).join('')}</div></div>`}
    if(pairTop.length){html+=`<div class="sra-pattern-card"><div class="sra-pattern-head"><b>동반 반복 후보</b><span>PAIR</span></div><p>예: 2·4 위치에서 같은 두 번호가 함께 겹친 뒤 목표 위치에서도 함께 재현된 이력을 계산합니다.</p><div class="sra-pattern-lines">${pairTop.map(x=>`<div class="sra-pattern-line"><div class="sra-balls">${x.nums.map(n=>ball(n)).join('')}</div><span>${x.pattern} · ${x.hits}/${x.opps} 재현</span><strong>${x.rate}%</strong></div>`).join('')}</div></div>`}
    return html;
  }

  let compTab=2,lastData=null;
  function renderResult(data){
    lastData=data;
    const [sampleTitle,sampleText]=sampleLabel(data.rows.length);
    $('sraStatus').className='sra-status ok';$('sraStatus').textContent=`${data.rows.length}개 회차 분석 완료 · ${sampleTitle} · ${sampleText}`;
    $('sraResult').innerHTML=`
      <div class="sra-block"><div class="sra-block-title"><b>① 지정회차 목록 · 당첨번호</b><span>${data.rows.length}회 · ${data.includeBonus?'보너스 포함':'보너스 제외'}</span></div>${renderRounds(data.rows,data.includeBonus)}</div>
      <div class="sra-block"><div class="sra-block-title"><b>② 번호별 출현빈도</b><span>횟수 + 출현율</span></div>${renderFreq(data.freq,data.rows.length)}</div>
      <div class="sra-block"><div class="sra-block-title"><b>③ 2·3·4번호 동반출현</b><span>2회 이상 표시</span></div><div class="sra-tabs"><button data-sra-tab="2" class="${compTab===2?'active':''}">2번호</button><button data-sra-tab="3" class="${compTab===3?'active':''}">3번호</button><button data-sra-tab="4" class="${compTab===4?'active':''}">4번호</button></div><div id="sraCompList">${renderCompList(data['comp'+compTab])}</div></div>
      <div class="sra-block"><div class="sra-block-title"><b>④ 회차 순서 기반 흐름분석</b><span>전반 ↔ 후반 비교</span></div>${renderFlow(data.flow)}</div>
      <div class="sra-block"><div class="sra-block-title"><b>⑤ 세 분석의 공통 강세번호</b><span>빈도 · 동반 · 흐름</span></div><div class="sra-common"><div class="sra-common-row"><span>3개 분석 공통</span>${commonBalls(data.common.three)}</div><div class="sra-common-row"><span>2개 분석 공통</span>${commonBalls(data.common.two)}</div></div></div>
      <div class="sra-block"><div class="sra-block-title"><b>⑥ 반복패턴 예상번호</b><span>선택목록 순서 기반</span></div>${renderPatterns(data)}<div class="sra-disclaimer">반복강도와 재현율은 지정한 회차 표본 안에서 관찰된 패턴 지표이며 실제 당첨확률을 의미하지 않습니다. 선택회차가 불연속이면 ‘2·4’는 실제 2회·4회 전이 아니라 선택목록에서 2칸·4칸 전을 뜻합니다.</div></div>`;
  }

  function run(){
    const ids=parseRounds($('sraRoundInput')?.value||'');
    if(ids.length<MIN_ROUNDS||ids.length>MAX_ROUNDS){$('sraStatus').className='sra-status error';$('sraStatus').textContent=`서로 다른 회차를 ${MIN_ROUNDS}개 이상 ${MAX_ROUNDS}개 이하로 입력하세요. 현재 ${ids.length}개입니다.`;return;}
    const data=analyze(ids,!!$('sraBonus')?.checked);
    if(data.error){$('sraStatus').className='sra-status error';$('sraStatus').textContent=data.error;return;}
    renderResult(data);
  }

  function bind(){
    $('sraRoundInput')?.addEventListener('input',e=>{const n=parseRounds(e.target.value).length;$('sraCount').textContent=`${n} / ${MAX_ROUNDS}회`;if(n>MAX_ROUNDS)$('sraCount').style.color='#b42318';else $('sraCount').style.color='';});
    $('sraRun')?.addEventListener('click',run);
    $('sraResult')?.addEventListener('click',e=>{const b=e.target.closest('[data-sra-tab]');if(!b||!lastData)return;compTab=Number(b.dataset.sraTab)||2;renderResult(lastData);});
  }

  function init(){
    injectStyle();
    let host=$('selectedRoundAnalysis');
    if(!host){host=document.createElement('div');host.id='selectedRoundAnalysis';const after=$('pool25DedicatedAnalysis')||$('candidatePool25Card');if(after)after.insertAdjacentElement('afterend',host);else document.querySelector('.combo-wrap')?.appendChild(host)}
    host.innerHTML=shell();bind();
  }

  global.SelectedRoundAnalysis={version:'1.0.0',analyze,parseRounds,run};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
