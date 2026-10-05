import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERNAME = 'nikhilvirdi';
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/leetcode-activity.json');

const GRAPHQL_QUERY = `query userProfileCalendar($username: String!, $year: Int) {
  matchedUser(username: $username) {
    userCalendar(year: $year) {
      totalActiveDays
      streak
      submissionCalendar
    }
  }
}`;

async function fetchCalendarForYear(year) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Timeout after 15s fetching year ${year}`));
  }, 15000);

  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: {
          username: USERNAME,
          year,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function areDaysEqual(aDays = {}, bDays = {}) {
  const aKeys = Object.keys(aDays).sort();
  const bKeys = Object.keys(bDays).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i];
    if (k !== bKeys[i] || aDays[k] !== bDays[k]) return false;
  }
  return true;
}

async function main() {
  const currentYear = new Date().getUTCFullYear();
  const previousYear = currentYear - 1;
  const years = [previousYear, currentYear];

  console.log(`[INFO] Fetching LeetCode activity for ${USERNAME} (years: ${years.join(', ')})...`);

  const results = [];
  for (const year of years) {
    let res;
    try {
      res = await fetchCalendarForYear(year);
    } catch (err) {
      console.warn(`[WARN] Request failed or timed out for year ${year}: ${err.message}`);
      process.exit(0);
    }

    if (!res.ok) {
      console.warn(`[WARN] LeetCode GraphQL returned HTTP ${res.status} for year ${year}`);
      process.exit(0);
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      console.warn(`[WARN] Failed to parse JSON response for year ${year}: ${err.message}`);
      process.exit(0);
    }

    const userCalendar = json?.data?.matchedUser?.userCalendar;
    if (!userCalendar) {
      console.warn(`[WARN] Response missing userCalendar for year ${year}`);
      process.exit(0);
    }

    results.push({ year, userCalendar });
  }

  // Parse submission calendars and merge
  const mergedDays = {};
  const startDateStr = '2025-04-01'; // Matches the date range the heatmap displays today
  const todayStr = new Date().toISOString().slice(0, 10);

  let latestStreak = 0;

  for (const { year, userCalendar } of results) {
    if (typeof userCalendar.streak === 'number' && year === currentYear) {
      latestStreak = userCalendar.streak;
    }

    let rawCalendar = {};
    if (typeof userCalendar.submissionCalendar === 'string') {
      try {
        rawCalendar = JSON.parse(userCalendar.submissionCalendar);
      } catch (err) {
        console.warn(`[WARN] Failed to parse submissionCalendar JSON for year ${year}: ${err.message}`);
        process.exit(0);
      }
    } else if (userCalendar.submissionCalendar && typeof userCalendar.submissionCalendar === 'object') {
      rawCalendar = userCalendar.submissionCalendar;
    }

    for (const [timestamp, count] of Object.entries(rawCalendar)) {
      const val = Number(timestamp);
      const num = Number(count);
      if (!Number.isNaN(val) && !Number.isNaN(num) && num > 0) {
        const ms = val < 1e11 ? val * 1000 : val;
        const dateStr = new Date(ms).toISOString().slice(0, 10);
        if (dateStr >= startDateStr && dateStr <= todayStr) {
          mergedDays[dateStr] = (mergedDays[dateStr] || 0) + num;
        }
      }
    }
  }

  // Calculate totals from merged days
  let totalSubmissions = 0;
  for (const count of Object.values(mergedDays)) {
    totalSubmissions += count;
  }
  const activeDays = Object.keys(mergedDays).length;

  // Stale-safe check: Empty or 0 submissions
  if (totalSubmissions === 0 || activeDays === 0) {
    console.warn('[WARN] No submissions found in merged calendar data. Stale-safe abort without overwriting.');
    process.exit(0);
  }

  // Sort dates chronologically
  const sortedDays = {};
  for (const dateKey of Object.keys(mergedDays).sort()) {
    sortedDays[dateKey] = mergedDays[dateKey];
  }

  const newData = {
    generatedAt: new Date().toISOString(),
    days: sortedDays,
    totalSubmissions,
    activeDays,
    streak: latestStreak,
  };

  // Inspect existing file
  let existingData = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    } catch (err) {
      console.warn('[WARN] Existing snapshot file could not be parsed:', err.message);
    }
  }

  // Stale-safe check: new totalSubmissions < 50% of existing file's total
  if (
    existingData &&
    typeof existingData.totalSubmissions === 'number' &&
    existingData.totalSubmissions > 0
  ) {
    if (totalSubmissions < 0.5 * existingData.totalSubmissions) {
      console.warn(
        `[WARN] New total submissions (${totalSubmissions}) is below 50% of existing file's total (${existingData.totalSubmissions}). Stale-safe abort.`
      );
      process.exit(0);
    }
  }

  // Stale-safe check: only write if content actually changed (ignoring generatedAt)
  if (existingData && existingData.days) {
    const isSameSubmissions = existingData.totalSubmissions === newData.totalSubmissions;
    const isSameActiveDays = existingData.activeDays === newData.activeDays;
    const isSameStreak = existingData.streak === newData.streak;
    const isSameDays = areDaysEqual(existingData.days, sortedDays);

    if (isSameSubmissions && isSameActiveDays && isSameStreak && isSameDays) {
      console.log('[INFO] LeetCode snapshot content is unchanged (ignoring generatedAt). Skipping write.');
      process.exit(0);
    }
  }

  // Write new snapshot
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(newData, null, 2) + '\n', 'utf8');
  console.log(`[SUCCESS] Updated LeetCode activity snapshot in ${OUTPUT_FILE} (${totalSubmissions} submissions across ${activeDays} days).`);
}

main().catch((err) => {
  console.warn('[WARN] Unexpected error in LeetCode fetch script:', err.message);
  process.exit(0);
});
