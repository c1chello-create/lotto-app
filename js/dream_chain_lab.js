/*
  Dream Chain Lab v0.1
  행운로또 v1.6.2용 실험 모듈

  기능:
  - 기존 app.js 기능은 그대로 유지
  - 꿈해몽 추천 결과 아래에 Dream Chain Lab 카드 추가
  - 1차 / 2차 / 3차 동반번호 보정 비교
  - 유지번호, 변화율, 안정도, 자동평가 표시
*/

(function () {
  "use strict";

  const VERSION = "Dream Chain Lab v0.1";

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function normalizeDraw(draw, idx) {
    const round = Number(draw.round || draw.drwNo || draw.no || draw.id || idx + 1);
    const date = draw.date || draw.drwNoDate || draw.drawDate || "";

    let nums = draw.numbers || draw.nums || draw.winNumbers || draw.winningNumbers;
    if (!Array.isArray(nums)) {
      nums = [
        draw.drwtNo1, draw.drwtNo2, draw.drwtNo3,
        draw.drwtNo4, draw.drwtNo5, draw.drwtNo6
      ].filter(Boolean);
    }

    const bonus = Number(draw.bonus || draw.bnusNo || draw.bonusNumber || 0);

    return {
      round,
      date,
      numbers: nums.map(Number).filter(n => n >= 1 && n <= 45),
      bonus
    };
  }

  function getDraws() {
    const candidates = [
      window.lottoData,
      window.LOTTO_DATA,
      window.lottoHistory,
      window.allLottoData,
      window.draws
    ];

    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) {
        return c.map(normalizeDraw).filter(d => d.numbers.length >= 6)
          .sort((a, b) => b.round - a.round);
      }
    }

    return [];
  }

  function parseNumbers(text) {
    return [...new Set(String(text || "").match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 45) || [])];
  }

  function getDreamBaseNumbers() {
    const dreamResult = qs("#dreamResult");

    if (dreamResult) {
      const nums = parseNumbers(dreamResult.innerText);
      if (nums.length >= 2) return nums.slice(0, 6);
    }

    const balls = qsa("#dreamResult .ball, #dreamResult .lotto-ball, #dreamResult span");
    const numsFromBalls = parseNumbers(balls.map(b => b.innerText).join(" "));
    if (numsFromBalls.length >= 2) return numsFromBalls.slice(0, 6);

    const inputNums = parseNumbers(qs("#dreamInput")?.value || "");
    if (inputNums.length >= 2) return inputNums.slice(0, 6);

    return [];
  }

  function ballClass(n) {
    if (n <= 9) return "dcl-yellow";
    if (n <= 19) return "dcl-blue";
    if (n <= 29) return "dcl-red";
    if (n <= 39) return "dcl-black";
    return "dcl-green";
  }

  function ball(n, mark = false) {
    return `<span class="dcl-ball ${ballClass(n)} ${mark ? "dcl-mark" : ""}">${n}</span>`;
  }

  function getRangeDraws(draws, range) {
    if (range === "all") return draws;
    return draws.slice(0, Number(range));
  }

  function companionScores(seedNums, draws) {
    const seed = new Set(seedNums);
    const score = {};
    const links = {};
    const rounds = {};

    for (const draw of draws) {
      const all = [...draw.numbers];
      if (draw.bonus >= 1 && draw.bonus <= 45) all.push(draw.bonus);

      const hit = all.filter(n => seed.has(n));
      if (!hit.length) continue;

      for (const n of all) {
        if (seed.has(n)) continue;

        score[n] = (score[n] || 0) + hit.length;
        links[n] = links[n] || new Set();
        rounds[n] = rounds[n] || [];

        hit.forEach(h => links[n].add(h));
        rounds[n].push(draw.round);
      }
    }

    return Object.keys(score).map(n => ({
      n: Number(n),
      score: score[n],
      links: [...links[n]].sort((a, b) => a - b),
      rounds: [...new Set(rounds[n])].slice(0, 6)
    })).sort((a, b) => b.score - a.score || a.n - b.n);
  }

  function makePreview(baseNums, compList) {
    const out = [...baseNums];
    for (const item of compList) {
      if (out.length >= 6) break;
      if (!out.includes(item.n)) out.push(item.n);
    }
    return out.slice(0, 6).sort((a, b) => a - b);
  }

  function stageSimilarity(prev, current) {
    if (!prev || !prev.length) return 100;
    const p = new Set(prev);
    const same = current.filter(n => p.has(n)).length;
    return Math.round((same / Math.max(prev.length, current.length)) * 100);
  }

  function scoreStage(preview, compList, baseNums) {
    const baseSet = new Set(baseNums);
    const addNums = preview.filter(n => !baseSet.has(n));
    const compScore = compList
      .filter(x => addNums.includes(x.n))
      .reduce((sum, x) => sum + x.score, 0);

    return {
      addNums,
      compScore,
      addCount: addNums.length
    };
  }

  function runChain(baseNums, draws, range, depth = 3) {
    const data = getRangeDraws(draws, range);
    const stages = [];
    let seed = [...baseNums].sort((a, b) => a - b);
    let prevPreview = null;

    for (let step = 1; step <= depth; step++) {
      const comp = companionScores(seed, data).slice(0, 10);
      const preview = makePreview(baseNums, comp);
      const sim = stageSimilarity(prevPreview || baseNums, preview);
      const detail = scoreStage(preview, comp, baseNums);

      stages.push({
        step,
        seed,
        comp,
        preview,
        similarity: sim,
        ...detail
      });

      prevPreview = preview;
      seed = preview;
    }

    return stages;
  }

  function stableNumbers(stages) {
    if (!stages.length) return [];
    let keep = new Set(stages[0].preview);
    for (const s of stages.slice(1)) {
      keep = new Set(s.preview.filter(n => keep.has(n)));
    }
    return [...keep].sort((a, b) => a - b);
  }

  function starRating(percent) {
    if (percent >= 90) return "★★★★★";
    if (percent >= 75) return "★★★★☆";
    if (percent >= 60) return "★★★☆☆";
    if (percent >= 45) return "★★☆☆☆";
    return "★☆☆☆☆";
  }

  function autoJudge(stages) {
    const keep = stableNumbers(stages);
    const s1 = stages[0]?.similarity || 0;
    const s2 = stages[1]?.similarity || 0;
    const s3 = stages[2]?.similarity || 0;

    if (keep.length >= 5 && s3 >= 75) {
      return {
        title: "3차까지 테스트 가치 있음",
        desc: "번호 흔들림이 적고 유지번호가 많습니다. 3차 보정까지 관찰할 가치가 있습니다.",
        recommend: "3차 관찰"
      };
    }

    if (keep.length >= 4 && s2 >= 60) {
      return {
        title: "2차 보정 우선 추천",
        desc: "핵심 번호는 유지되면서 일부 후보가 교체됩니다. 현재는 2차까지 보는 것이 가장 적절합니다.",
        recommend: "2차 추천"
      };
    }

    return {
      title: "1차 보정 유지 권장",
      desc: "2차·3차로 갈수록 결과가 흔들릴 가능성이 있습니다. 현재는 1차 보정을 중심으로 보는 것이 안전합니다.",
      recommend: "1차 유지"
    };
  }

  function percentChange(a, b) {
    if (!a) return "+0%";
    const v = Math.round(((b - a) / Math.max(1, a)) * 100);
    return (v >= 0 ? "+" : "") + v + "%";
  }

  function renderStage(stage, prevStage, baseNums) {
    const baseSet = new Set(baseNums);
    const addedSet = new Set(stage.preview.filter(n => !baseSet.has(n)));
    const change = prevStage ? percentChange(prevStage.compScore, stage.compScore) : "+0%";

    const rows = stage.comp.slice(0, 5).map(x => `
      <tr>
        <td>${ball(x.n)}</td>
        <td>${x.score}</td>
        <td>${x.links.join(", ")}</td>
        <td>${x.rounds.join(", ")}</td>
      </tr>
    `).join("");

    return `
      <div class="dcl-stage">
        <div class="dcl-stage-head">
          <h4>${stage.step}차 보정 Preview</h4>
          <span class="dcl-badge">${starRating(stage.similarity)}</span>
        </div>

        <div class="dcl-balls">${stage.preview.map(n => ball(n, addedSet.has(n))).join("")}</div>

        <div class="dcl-metrics">
          <div><b>${stage.similarity}%</b><span>안정도</span></div>
          <div><b>${stage.compScore}</b><span>보정점수</span></div>
          <div><b>${change}</b><span>변화율</span></div>
        </div>

        <table class="dcl-table">
          <thead><tr><th>후보</th><th>점수</th><th>연결</th><th>회차</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderLab(baseNums, stages, range) {
    const keep = stableNumbers(stages);
    const judge = autoJudge(stages);
    const last = stages[stages.length - 1];

    let stagesHtml = "";
    stages.forEach((s, idx) => {
      stagesHtml += renderStage(s, stages[idx - 1], baseNums);
    });

    return `
      <div id="dreamChainLab" class="dcl-card">
        <h3>🧪 Dream Chain Lab</h3>
        <p class="dcl-desc">1차·2차·3차 동반번호 보정을 비교해 실제로 어느 단계까지 의미가 있는지 검증합니다.</p>

        <div class="dcl-box">
          <b>기본 꿈번호</b>
          <div class="dcl-balls">${baseNums.map(n => ball(n)).join("")}</div>
        </div>

        <div class="dcl-judge">
          <div>
            <b>${judge.title}</b>
            <p>${judge.desc}</p>
          </div>
          <span>${judge.recommend}</span>
        </div>

        <div class="dcl-box">
          <b>3차까지 유지번호</b>
          <div class="dcl-balls">${keep.length ? keep.map(n => ball(n, true)).join("") : "<p>유지번호 없음</p>"}</div>
        </div>

        ${stagesHtml}

        <div class="dcl-final">
          <b>최종 실험 Preview</b>
          <div class="dcl-balls">${last.preview.map(n => ball(n)).join("")}</div>
        </div>

        <p class="dcl-note">분석 범위: ${range === "all" ? "전체 회차" : "최근 " + range + "회"} · ${VERSION}</p>
      </div>
    `;
  }

  function injectStyle() {
    if (qs("#dreamChainLabStyle")) return;

    const style = document.createElement("style");
    style.id = "dreamChainLabStyle";
    style.textContent = `
      .dcl-card{background:#f6fff2;border:1px solid #dfead8;border-radius:22px;padding:18px;margin:18px 0;box-shadow:0 2px 8px rgba(20,40,80,.05)}
      .dcl-card h3{margin:0 0 8px;font-size:23px;font-weight:900;color:#152033}
      .dcl-card h4{margin:0;font-size:19px;color:#152033}
      .dcl-desc,.dcl-note{color:#667085;line-height:1.5;font-size:14px}
      .dcl-box,.dcl-final{background:#fff;border:1px solid #e5eaf2;border-radius:18px;padding:14px;margin:12px 0}
      .dcl-judge{display:flex;gap:10px;align-items:center;justify-content:space-between;background:#fff8dc;border:1px solid #efd77a;border-radius:18px;padding:14px;margin:12px 0}
      .dcl-judge b{font-size:17px;color:#423600}
      .dcl-judge p{margin:6px 0 0;color:#665400;font-size:14px;line-height:1.45}
      .dcl-judge span{white-space:nowrap;background:#213f78;color:white;padding:8px 10px;border-radius:999px;font-weight:900;font-size:13px}
      .dcl-stage{border-top:1px solid #dfe7d8;margin-top:18px;padding-top:14px}
      .dcl-stage-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .dcl-badge{background:#eef2ff;color:#253b6e;border-radius:999px;padding:6px 10px;font-weight:900;font-size:14px}
      .dcl-balls{margin-top:8px}
      .dcl-ball{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;color:#fff;font-weight:900;font-size:20px;margin:5px 5px 5px 0;box-shadow:0 4px 10px rgba(0,0,0,.18)}
      .dcl-mark{outline:5px solid #f8e388}
      .dcl-yellow{background:#e7b926}.dcl-blue{background:#2f73c8}.dcl-red{background:#d84338}.dcl-black{background:#374151}.dcl-green{background:#4c984b}
      .dcl-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
      .dcl-metrics div{background:#fff;border:1px solid #e5eaf2;border-radius:14px;padding:10px;text-align:center}
      .dcl-metrics b{display:block;color:#152033;font-size:18px}
      .dcl-metrics span{font-size:12px;color:#667085}
      .dcl-table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff;border-radius:12px;overflow:hidden}
      .dcl-table th,.dcl-table td{border-bottom:1px solid #e5eaf2;padding:8px 3px;text-align:left;color:#475467;font-size:13px}
      .dcl-table .dcl-ball{width:34px;height:34px;font-size:15px;margin:2px}
    `;
    document.head.appendChild(style);
  }

  function findRange() {
    const active = qsa(".filter.active, .active[data-range]").find(el => el.dataset && el.dataset.range);
    return active?.dataset?.range || "50";
  }

  function insertLab(html) {
    qs("#dreamChainLab")?.remove();

    const dreamResult = qs("#dreamResult");
    if (dreamResult) {
      dreamResult.insertAdjacentHTML("afterend", html);
      return;
    }

    qs("#dream")?.insertAdjacentHTML("beforeend", html);
  }

  function runDreamChainLab() {
    injectStyle();

    const draws = getDraws();
    if (draws.length < 10) {
      console.warn("[Dream Chain Lab] 회차 데이터를 찾지 못했습니다.");
      return;
    }

    const baseNums = getDreamBaseNumbers();
    if (baseNums.length < 2) {
      console.warn("[Dream Chain Lab] 꿈번호를 찾지 못했습니다.");
      return;
    }

    const range = findRange();
    const stages = runChain(baseNums.slice(0, 6), draws, range, 3);
    insertLab(renderLab(baseNums.slice(0, 6), stages, range));
  }

  function bind() {
    const dreamBtn = qs("#dreamBtn");
    if (dreamBtn) {
      dreamBtn.addEventListener("click", function () {
        setTimeout(runDreamChainLab, 300);
        setTimeout(runDreamChainLab, 900);
      });
    }

    document.addEventListener("click", function (e) {
      const text = e.target?.innerText || "";
      if (/꿈해몽|추천|Preview|Chain|Lab/.test(text)) {
        setTimeout(runDreamChainLab, 600);
      }
    });
  }

  window.runDreamChainLab = runDreamChainLab;

  document.addEventListener("DOMContentLoaded", function () {
    injectStyle();
    bind();

    setTimeout(runDreamChainLab, 1500);
    setTimeout(runDreamChainLab, 3000);
  });
})();
