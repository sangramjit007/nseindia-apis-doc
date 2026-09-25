/**
 * Robust Search Engine & Relevance Scorer for NSE API Explorer
 */

function normalizeSearchText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[-_>/\\():,;?&=#+]/g, " ")  // Replace symbols/hyphens with spaces
    .replace(/\s+/g, " ")                  // Collapse multiple spaces
    .trim();
}

function compactSearchText(text) {
  if (!text) return "";
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Calculates a match score for an API against a search query.
 * Returns score > 0 if it matches, 0 if no match.
 */
function scoreApiMatch(api, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return 100;

  const normalizedQuery = normalizeSearchText(rawQuery);
  const compactQuery = compactSearchText(rawQuery);
  const queryTokens = normalizedQuery.split(" ").filter((t) => t.length > 0);

  if (queryTokens.length === 0) return 100;

  const nameNorm = normalizeSearchText(api.name);
  const nameCompact = compactSearchText(api.name);
  const catNorm = normalizeSearchText(api.categoryPath || api.category || "");
  const pathNorm = normalizeSearchText(api.path);
  const pathCompact = compactSearchText(api.path);
  const timeNorm = normalizeSearchText(api.fetchTime || "");
  const descNorm = normalizeSearchText(api.description || "");

  // Index subTabs (e.g. Bulk Deals, Block Deals, Short Selling)
  const subTabsText = (api.subTabs || [])
    .map((s) => `${s.label} ${s.key} ${s.description} ${s.badge}`)
    .join(" ");
  const subTabsNorm = normalizeSearchText(subTabsText);
  const subTabsCompact = compactSearchText(subTabsText);

  // Index publish times
  const timesText = (api.publishTimes || [])
    .map((pt) => `${pt.window} ${pt.time} ${pt.description}`)
    .join(" ");
  const timesNorm = normalizeSearchText(timesText);

  let score = 0;

  // 1. Direct exact or phrase match in Name
  if (nameNorm.includes(normalizedQuery)) {
    score += 160;
  } else if (nameCompact.includes(compactQuery)) {
    score += 140;
  }

  // 2. Direct match in SubTabs (e.g. "bulk deals", "block deals", "short selling")
  if (subTabsNorm.includes(normalizedQuery)) {
    score += 150;
  } else if (compactQuery && subTabsCompact.includes(compactQuery)) {
    score += 130;
  }

  // 3. Direct match in Category or Path
  if (catNorm.includes(normalizedQuery)) {
    score += 100;
  }
  if (pathNorm.includes(normalizedQuery) || pathCompact.includes(compactQuery)) {
    score += 90;
  }

  // 4. Direct match in Fetch Time or Publish Schedule
  if (timeNorm.includes(normalizedQuery) || timesNorm.includes(normalizedQuery)) {
    score += 85;
  }

  // 5. Token-level matching across all fields
  const allFields = `${nameNorm} ${catNorm} ${pathNorm} ${timeNorm} ${descNorm} ${subTabsNorm} ${timesNorm}`;
  const allCompact = `${nameCompact} ${pathCompact} ${subTabsCompact}`;

  const allTokensMatch = queryTokens.every((token) => {
    const compactTok = compactSearchText(token);
    return allFields.includes(token) || (compactTok && allCompact.includes(compactTok));
  });

  if (allTokensMatch) {
    score += 50;
    const tokensInName = queryTokens.filter((t) => nameNorm.includes(t) || subTabsNorm.includes(t)).length;
    score += tokensInName * 25;
  }

  return score;
}

function isApiMatch(api, rawQuery) {
  return scoreApiMatch(api, rawQuery) > 0;
}

if (typeof window !== "undefined") {
  window.isApiMatch = isApiMatch;
  window.scoreApiMatch = scoreApiMatch;
  window.normalizeSearchText = normalizeSearchText;
  window.compactSearchText = compactSearchText;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { isApiMatch, scoreApiMatch, normalizeSearchText, compactSearchText };
}
