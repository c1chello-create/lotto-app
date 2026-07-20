(function(){'use strict';const $=id=>document.getElementById(id);let data=[],batchCount=50;
function status(t,error=false){$('status').textContent=t;$('status').classList.toggle('bt-error',error)}
async function load(){try{const r=await fetch('./data/lotto.json?ts='+Date.now());data=(await r.json()).slice().sort((a,b)=>b.round-a.round);$('roundSelect').innerHTML=data.filter(x=>x.round>30).map((x,i)=>`<option value="${x.round}" ${i===1?'selected':''}>${x.round}회 · ${x.date}</option>`).join('');status(`전체 ${data.length}개 회차를 불러왔습니다. 선택 회차 이후 데이터는 계산에 사용하지 않습니다.`)}catch(e){status('data/lotto.json을 읽지 못했습니다.',true)}}
function formatUserNums(value){
  const normalized=String(value||'').replace(/[^0-9,\s]/g,' ').replace(/[,\s]+/g,' ').trimStart();
  const parts=normalized.split(' '),out=[];
  for(const part of parts){
    if(!part)continue;
    let token=part;
    while(token.length>2||Number(token)>45){
      if(token.length===1)break;
      out.push(token.slice(0,-1));
      token=token.slice(-1);
    }
    out.push(token);
  }
  return out.filter(Boolean).slice(0,6).join(' ');
}
const userInput=$('userNums');
userInput.addEventListener('input',()=>{
  const before=userInput.value,after=formatUserNums(before);
  if(before!==after)userInput.value=after;
});
userInput.addEventListener('blur',()=>{userInput.value=formatUserNums(userInput.value)});
function opts(){return{data,round:Number($('roundSelect').value),userNums:userInput.value,dreamKeyword:$('dreamKeyword').value,scope:$('scopeSelect').value,includeBonus:$('includeBonus').checked}}
$('runBtn').onclick=()=>{try{const r=BacktestEngine.run(opts());$('singleResult').innerHTML=BacktestReport.renderSingle(r);status(`${r.round}회 검증 완료 · 이전 ${r.historyCount}회만 사용`)}catch(e){status(e.message,true)}};
document.querySelectorAll('.bt-range-buttons button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.bt-range-buttons button').forEach(x=>x.classList.remove('active'));b.classList.add('active');batchCount=Number(b.dataset.count)});
$('batchBtn').onclick=async()=>{if(!data.length)return;const p=$('progress');p.hidden=false;$('batchBtn').disabled=true;$('batchResult').innerHTML='';try{const res=await BacktestEngine.runBatch({...opts(),count:batchCount},v=>{p.querySelector('i').style.width=`${Math.round(v*100)}%`;p.querySelector('span').textContent=`${Math.round(v*100)}%`});$('batchResult').innerHTML=BacktestReport.renderBatch(res);status(`${res.length}개 회차 구간 백테스트 완료`)}catch(e){status(e.message,true)}finally{$('batchBtn').disabled=false}};load();
})();
