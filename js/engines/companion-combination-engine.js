(function(global){
  'use strict';

  const state={size:2,scope:'all',includeBonus:true,sort:'count',limit:100,last:[]};
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
  function aggregate(opts={}){
    const size=Number(opts.size||state.size), includeBonus=opts.includeBonus??state.includeBonus;
    const map=new Map();
    scopedRows(opts.scope||state.scope).forEach(row=>{
      choose(pool(row,includeBonus),size).forEach(nums=>{
        const key=keyOf(nums);let item=map.get(key);
        if(!item){item={key,nums,count:0,recentRound:0,recentDate:'',rounds:[]};map.set(key,item);}
        item.count++;
        item.rounds.push(row);
        if(Number(row.round)>Number(item.recentRound||0)){
          item.recentRound=Number(row.round);item.recentDate=row.date||'';
        }
      });
    });
    const list=[...map.values()];
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
  global.CompanionCombinationEngine=Object.freeze({state,aggregate,details,scopedRows,pool,choose,keyOf});
})(window);
