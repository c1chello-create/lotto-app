(function (global) {
  'use strict';

  function normalizeNumbers(numbers) {
    return [...new Set((numbers || [])
      .map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 45))]
      .sort((a, b) => a - b);
  }

  function maximalRuns(numbers) {
    const nums = normalizeNumbers(numbers);
    const runs = [];
    let start = 0;

    for (let i = 1; i <= nums.length; i += 1) {
      const continues = i < nums.length && nums[i] === nums[i - 1] + 1;
      if (continues) continue;
      const values = nums.slice(start, i);
      if (values.length >= 2) {
        runs.push({
          values,
          startNumber: values[0],
          endNumber: values[values.length - 1],
          length: values.length,
          startPosition: start + 1,
          endPosition: i
        });
      }
      start = i;
    }
    return runs;
  }

  function categoryKey(length) {
    if (length >= 5) return 'fivePlus';
    if (length === 4) return 'four';
    if (length === 3) return 'three';
    return 'two';
  }

  function analyzeRound(row) {
    const winningNumbers = normalizeNumbers(row && row.numbers);
    const runs = maximalRuns(winningNumbers);
    const longestLength = runs.reduce((max, run) => Math.max(max, run.length), 0);
    const longestRuns = runs.filter(run => run.length === longestLength);
    const remainingNumbers = winningNumbers.filter(n => !longestRuns.some(run => run.values.includes(n)));

    return {
      round: Number(row && row.round) || 0,
      date: row && row.date ? String(row.date) : '',
      numbers: winningNumbers,
      bonus: Number(row && row.bonus) || null,
      runs,
      longestLength,
      longestRuns,
      remainingNumbers,
      category: longestLength >= 2 ? categoryKey(longestLength) : 'none'
    };
  }

  function emptyCounts() {
    return { two: 0, three: 0, four: 0, fivePlus: 0, none: 0, any: 0 };
  }

  function countsFor(items) {
    const counts = emptyCounts();
    items.forEach(item => {
      counts[item.category] += 1;
      if (item.longestLength >= 2) counts.any += 1;
    });
    return counts;
  }

  function positionHistogram(items) {
    const map = {};
    items.forEach(item => {
      item.runs.forEach(run => {
        const key = `${run.startPosition}~${run.endPosition}`;
        if (!map[key]) map[key] = { key, startPosition: run.startPosition, endPosition: run.endPosition, count: 0 };
        map[key].count += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count || a.startPosition - b.startPosition || a.endPosition - b.endPosition);
  }

  function numberStartHistogram(items) {
    const map = {};
    items.forEach(item => item.runs.forEach(run => {
      const key = String(run.startNumber);
      map[key] = (map[key] || 0) + 1;
    }));
    return Object.entries(map)
      .map(([startNumber, count]) => ({ startNumber: Number(startNumber), count }))
      .sort((a, b) => b.count - a.count || a.startNumber - b.startNumber);
  }

  function trendFor(allItems, size) {
    const items = size === 'all' ? allItems : allItems.slice(0, Number(size));
    return { size: size === 'all' ? items.length : Number(size), actualSize: items.length, counts: countsFor(items) };
  }

  function summaryFor(trend, key) {
    const labels = { two: '2연속', three: '3연속', four: '4연속', fivePlus: '5연속 이상' };
    const count = trend.counts[key] || 0;
    const scope = trend.actualSize === trend.size ? `최근 ${trend.actualSize}회` : `최근 ${trend.actualSize}회`;
    if (!count) return `${scope} ${labels[key]} 발생 없음 · 희소 패턴`;
    const rate = trend.actualSize ? Math.round(count / trend.actualSize * 1000) / 10 : 0;
    return `${scope} ${labels[key]} 발생 ${count}회 · ${rate}%`;
  }

  function analyze(rows, options) {
    const opts = options || {};
    const sortedRows = [...(rows || [])]
      .filter(row => row && Array.isArray(row.numbers))
      .sort((a, b) => Number(b.round) - Number(a.round));
    const items = sortedRows.map(analyzeRound);
    const categories = { two: [], three: [], four: [], fivePlus: [] };
    items.forEach(item => {
      if (categories[item.category]) categories[item.category].push(item);
    });

    const longestLength = items.reduce((max, item) => Math.max(max, item.longestLength), 0);
    const longestItems = items.filter(item => item.longestLength === longestLength && longestLength >= 2);
    const trends = {
      50: trendFor(items, 50),
      100: trendFor(items, 100),
      all: trendFor(items, 'all')
    };

    const summaryKey = opts.summaryKey && categories[opts.summaryKey] ? opts.summaryKey : 'three';
    return {
      totalRounds: items.length,
      items,
      counts: countsFor(items),
      categories,
      positionHistogram: positionHistogram(items),
      numberStartHistogram: numberStartHistogram(items),
      trends,
      longest: {
        length: longestLength,
        items: longestItems,
        first: longestItems[0] || null
      },
      summary: {
        recent50: summaryFor(trends[50], summaryKey),
        recent100: summaryFor(trends[100], summaryKey),
        overall: summaryFor(trends.all, summaryKey)
      }
    };
  }

  global.ConsecutivePatternEngine = Object.freeze({
    name: 'ConsecutivePatternEngine',
    version: '2.0.0',
    normalizeNumbers,
    maximalRuns,
    analyzeRound,
    analyze
  });
})(window);
