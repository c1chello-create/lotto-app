/*
 * Interval Pattern Engine v0.1 beta
 * Phase 2 core engine for 행운로또
 *
 * Design rules implemented:
 * - strict sample mode: only rounds containing every selected number
 * - sample sizes: 20 / 30 / 50
 * - 2-series gaps: 2,4,...,24
 * - 3-series gaps: 3,6,...,15
 * - comparisons stay inside the extracted sample
 * - next-round number aggregation
 * - Pattern Purity sample warning policy
 *
 * This module is intentionally independent from combo.js.
 */
(function (global) {
  'use strict';

  const TWO_GAPS = Object.freeze([2,4,6,8,10,12,14,16,18,20,22,24]);
  const THREE_GAPS = Object.freeze([3,6,9,12,15]);

  function clamp(value, min = 0, max = 100) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function uniqueNumbers(values) {
    return Array.from(new Set((values || [])
      .map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 45)))
      .sort((a, b) => a - b);
  }

  function normalizeRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map(row => ({
        round: Number(row.round),
        date: row.date || '',
        numbers: uniqueNumbers(row.numbers),
        bonus: Number(row.bonus)
      }))
      .filter(row => Number.isInteger(row.round) && row.numbers.length >= 6)
      .sort((a, b) => b.round - a.round);
  }

  function rowPool(row, includeBonus) {
    const pool = row.numbers.slice();
    if (includeBonus && Number.isInteger(row.bonus) && row.bonus >= 1 && row.bonus <= 45) {
      pool.push(row.bonus);
    }
    return uniqueNumbers(pool);
  }

  function containsAll(row, selected, includeBonus) {
    const pool = new Set(rowPool(row, includeBonus));
    return selected.every(n => pool.has(n));
  }

  function sampleWarning(sampleCount) {
    if (sampleCount <= 4) {
      return { level: 'strong', label: '매우 부족', message: '유효 샘플이 4개 이하입니다. 결과를 판단 근거로 사용하지 마세요.' };
    }
    if (sampleCount <= 8) {
      return { level: 'warning', label: '부족', message: '유효 샘플이 5~8개입니다. 강한 경고 구간입니다.' };
    }
    if (sampleCount <= 15) {
      return { level: 'caution', label: '주의 필요', message: '유효 샘플이 9~15개입니다. 보조 지표로만 사용하세요.' };
    }
    return { level: 'normal', label: '정상', message: '유효 샘플이 16개 이상입니다.' };
  }

  function countFrequency(rows, includeBonus) {
    const counts = Array.from({ length: 46 }, () => 0);
    rows.forEach(row => rowPool(row, includeBonus).forEach(n => { counts[n] += 1; }));
    return counts;
  }

  function buildRankedCandidates(counts, comparisons, limit = 15) {
    const max = Math.max(...counts, 1);
    return counts
      .map((count, number) => ({
        number,
        count,
        rate: comparisons ? Number(((count / comparisons) * 100).toFixed(1)) : 0,
        strength: Number(((count / max) * 100).toFixed(1))
      }))
      .filter(item => item.number >= 1 && item.number <= 45 && item.count > 0)
      .sort((a, b) => b.count - a.count || a.number - b.number)
      .slice(0, limit);
  }

  function analyzeSeries(samples, gaps, includeBonus, selected) {
    const candidateCounts = Array.from({ length: 46 }, () => 0);
    const gapStats = [];
    let comparisons = 0;
    let replayHits = 0;
    let replayNumberHits = 0;

    gaps.forEach(gap => {
      let localComparisons = 0;
      let localReplayHits = 0;
      const localCounts = Array.from({ length: 46 }, () => 0);

      // samples are newest -> oldest. i + gap is the older sample.
      for (let i = 0; i + gap < samples.length; i += 1) {
        const older = samples[i + gap];
        const pool = rowPool(older, includeBonus);
        localComparisons += 1;
        comparisons += 1;

        const selectedHits = selected.filter(n => pool.includes(n));
        if (selectedHits.length > 0) {
          localReplayHits += 1;
          replayHits += 1;
          replayNumberHits += selectedHits.length;
        }

        pool.forEach(n => {
          localCounts[n] += 1;
          candidateCounts[n] += 1;
        });
      }

      const top = buildRankedCandidates(localCounts, localComparisons, 6);
      gapStats.push({
        gap,
        comparisons: localComparisons,
        replayHits: localReplayHits,
        replayRate: localComparisons ? Number(((localReplayHits / localComparisons) * 100).toFixed(1)) : 0,
        topNumbers: top
      });
    });

    const candidates = buildRankedCandidates(candidateCounts, comparisons, 15);
    const topCount = candidates[0]?.count || 0;
    const topThreeTotal = candidates.slice(0, 3).reduce((sum, item) => sum + item.count, 0);
    const totalCandidateHits = candidateCounts.reduce((sum, count) => sum + count, 0);
    const replayRate = comparisons ? replayHits / comparisons : 0;
    const concentration = totalCandidateHits ? topThreeTotal / totalCandidateHits : 0;
    const topSet = new Set(candidates.slice(0, 10).map(item => item.number));
    const preserved = selected.filter(n => topSet.has(n)).length;
    const preservationRate = selected.length ? preserved / selected.length : 0;

    const score = Math.round(clamp(
      replayRate * 45 +
      concentration * 30 +
      preservationRate * 20 +
      Math.min(5, topCount / Math.max(1, comparisons) * 20)
    ));

    return {
      gaps: gaps.slice(),
      comparisons,
      replayHits,
      replayNumberHits,
      replayRate: Number((replayRate * 100).toFixed(1)),
      concentration: Number((concentration * 100).toFixed(1)),
      preserved,
      preservationRate: Number((preservationRate * 100).toFixed(1)),
      score,
      candidates,
      gapStats
    };
  }

  function nextRoundAggregation(allRows, samples, includeBonus, selected) {
    const byRound = new Map(allRows.map(row => [row.round, row]));
    const counts = Array.from({ length: 46 }, () => 0);
    let validCases = 0;

    samples.forEach(sample => {
      const next = byRound.get(sample.round + 1);
      if (!next) return;
      validCases += 1;
      rowPool(next, includeBonus).forEach(n => {
        // Keep selected numbers in the data, but mark them in the result.
        counts[n] += 1;
      });
    });

    return {
      validCases,
      candidates: buildRankedCandidates(counts, validCases, 15).map(item => ({
        ...item,
        isSelected: selected.includes(item.number)
      }))
    };
  }

  function purityFromResult(sampleCount, mainSeries, nextRound) {
    const sampleFactor = clamp(sampleCount / 16, 0, 1);
    const repeatFactor = clamp(mainSeries.replayRate / 100, 0, 1);
    const concentrationFactor = clamp(mainSeries.concentration / 100, 0, 1);
    const nextTopRate = nextRound.candidates[0]?.rate || 0;
    const nextFactor = clamp(nextTopRate / 100, 0, 1);

    return Math.round(clamp(
      (sampleFactor * 30 + repeatFactor * 35 + concentrationFactor * 20 + nextFactor * 15)
    ));
  }

  function analyze(options) {
    const opts = options || {};
    const rows = normalizeRows(opts.rows || opts.lottoData || []);
    const selected = uniqueNumbers(opts.selectedNumbers || opts.numbers || []);
    const includeBonus = opts.includeBonus !== false;
    const requestedSampleSize = [20, 30, 50].includes(Number(opts.sampleSize)) ? Number(opts.sampleSize) : 50;

    if (selected.length < 2 || selected.length > 6) {
      throw new Error('Interval Pattern Engine: selectedNumbers must contain 2 to 6 unique numbers.');
    }
    if (!rows.length) {
      throw new Error('Interval Pattern Engine: lotto rows are empty or invalid.');
    }

    const matchedRows = rows.filter(row => containsAll(row, selected, includeBonus));
    const samples = matchedRows.slice(0, requestedSampleSize);
    const warning = sampleWarning(samples.length);

    const twoSeries = analyzeSeries(samples, TWO_GAPS, includeBonus, selected);
    const threeSeries = analyzeSeries(samples, THREE_GAPS, includeBonus, selected);
    const dominantSeries = twoSeries.score >= threeSeries.score ? '2-series' : '3-series';
    const mainSeries = dominantSeries === '2-series' ? twoSeries : threeSeries;
    const nextRound = nextRoundAggregation(rows, samples, includeBonus, selected);
    const purity = purityFromResult(samples.length, mainSeries, nextRound);

    const result = {
      version: '0.1-beta',
      generatedAt: new Date().toISOString(),
      input: {
        selectedNumbers: selected,
        includeBonus,
        sampleSize: requestedSampleSize,
        matchMode: 'all-selected-numbers'
      },
      sample: {
        totalMatched: matchedRows.length,
        used: samples.length,
        rounds: samples.map(row => row.round),
        warning
      },
      interval: {
        dominantSeries,
        twoSeries,
        threeSeries
      },
      nextRound,
      patternScore: Math.round((mainSeries.score * 0.75) + (purity * 0.25)),
      patternPurity: purity,
      topNumbers: mainSeries.candidates.slice(0, 6).map(item => item.number),
      reasons: {
        pattern: `${samples.length}개 샘플 · ${dominantSeries === '2-series' ? '2계열' : '3계열'} 우세 · 재현율 ${mainSeries.replayRate}%`,
        purity: `Pattern Purity ${purity}점 · 샘플 상태 ${warning.label}`,
        nextRound: `다음 회차 유효 ${nextRound.validCases}건 · TOP ${nextRound.candidates[0]?.number || '-'}번 ${nextRound.candidates[0]?.count || 0}회`
      }
    };

    return result;
  }

  function analyzeAndStore(options, storageKey = 'interval_pattern_engine_result') {
    const result = analyze(options);
    try {
      global.localStorage?.setItem(storageKey, JSON.stringify(result));
    } catch (error) {
      // localStorage is optional; analysis result remains usable.
    }
    try {
      global.dispatchEvent?.(new CustomEvent('interval-pattern:complete', { detail: result }));
    } catch (error) {
      // CustomEvent may be unavailable in non-browser test environments.
    }
    return result;
  }

  global.IntervalPatternEngine = Object.freeze({
    version: '0.1-beta',
    TWO_GAPS,
    THREE_GAPS,
    analyze,
    analyzeAndStore,
    sampleWarning
  });
})(typeof window !== 'undefined' ? window : globalThis);
