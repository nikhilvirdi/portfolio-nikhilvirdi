import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration & Exclusions
// ============================================================================

const USERNAME = 'nikhilvirdi';

// Config constant: maximum additions for a single file in a single commit before skipping entirely
const MAX_LINES_PER_FILE_PER_COMMIT = 5000;

// Config constant: path patterns excluded from line counts (case-insensitive, whole path segment only)
const EXCLUDED_PATH_PATTERNS = [
  'node_modules/',
  'dist/',
  'build/',
  'out/',
  '.next/',
  'coverage/',
  'vendor/',
  '.venv/',
  'venv/',
  '__pycache__/',
  '.gen/',
];

// Config constant: file patterns excluded from line counts (case-insensitive, matched against filename/basename)
const EXCLUDED_FILE_PATTERNS = [
  '*.md',
  '*.mdx',
  '*.markdown',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.lock',
  '*.ipynb',
  '*.min.js',
  '*.map',
  'LICENSE',
  'LICENSE.*',
  '*.drawio',
  '*.svg',
  '*.d.ts',
  '*.generated.*',
  '*.json',
];

// Compile path patterns to regex matching whole path segments only
// e.g. (^|/)out(/|$) ensures "out/" does NOT match "layout/", "checkout/", or "about/"
const COMPILED_PATH_PATTERNS = EXCLUDED_PATH_PATTERNS.map((pattern) => {
  const segment = pattern.replace(/\/+$/, '');
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    name: pattern,
    regex: new RegExp('(^|/)' + escaped + '(/|$)', 'i'),
  };
});

// Compile file patterns to strict regex anchored to full basename (^...$)
const COMPILED_FILE_PATTERNS = EXCLUDED_FILE_PATTERNS.map((pattern) => {
  const p = pattern.trim();
  if (p.toLowerCase() === 'license') {
    return { name: pattern, regex: /^license$/i };
  }
  if (p.toLowerCase() === 'license.*') {
    // Matches LICENSE.txt, LICENSE.md, etc., but never code files like license.ts, license.js, license.py
    return {
      name: pattern,
      regex: /^license\.(?!(ts|tsx|js|jsx|py|java|go|rs|cpp|c|cs)$)[a-z0-9_-]+$/i,
    };
  }
  // Convert glob to anchored regex
  const escaped = p
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return { name: pattern, regex: new RegExp('^' + escaped + '$', 'i') };
});

// Target output path and cache
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/github-stats.json');
const CACHE_DIR = path.resolve(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'commit-stats.json');

// Returns the matched pattern name if excluded, or null if legitimate code
function getExclusionMatch(filePath) {
  if (!filePath) return null;
  const norm = filePath.replace(/\\/g, '/');
  const base = path.posix.basename(norm);

  // 1. Check path patterns (whole segment match)
  for (const p of COMPILED_PATH_PATTERNS) {
    if (p.regex.test(norm)) {
      return p.name;
    }
  }

  // 2. Check file patterns (strict basename match)
  for (const f of COMPILED_FILE_PATTERNS) {
    if (f.regex.test(base)) {
      return f.name;
    }
  }

  return null;
}

// Config constant: explicit allowlist of commit author / committer email identities (case-insensitive)
const AUTHOR_IDENTITIES = [
  'nkvir2468@gmail.com',
  'nlvir2468@gmail.com',
  '1ms24cs111@msrit.edu',
].map((e) => e.toLowerCase());

// A commit counts as mine ONLY if:
// 1. the GitHub login of the commit author is "nikhilvirdi" (case-insensitive), OR
// 2. the commit author email or committer email exactly equals (case-insensitive) one of AUTHOR_IDENTITIES
// (strictly NO substring or name-based matching)
function checkAuthorMatch(c) {
  if (c.author?.login && c.author.login.toLowerCase() === USERNAME.toLowerCase()) {
    return { matched: true, rule: `GitHub login "${c.author.login}"` };
  }
  const authorEmail = (c.commit?.author?.email || '').trim().toLowerCase();
  if (authorEmail && AUTHOR_IDENTITIES.includes(authorEmail)) {
    return { matched: true, rule: `author email "${authorEmail}"` };
  }
  const committerEmail = (c.commit?.committer?.email || '').trim().toLowerCase();
  if (committerEmail && AUTHOR_IDENTITIES.includes(committerEmail)) {
    return { matched: true, rule: `committer email "${committerEmail}"` };
  }
  return { matched: false, rule: null };
}

function isAuthorCommit(c) {
  return checkAuthorMatch(c).matched;
}

// ============================================================================
// Authentication
// ============================================================================

function getAuthToken() {
  if (process.env.STATS_TOKEN && process.env.STATS_TOKEN.trim().length > 0) {
    return process.env.STATS_TOKEN.trim();
  }
  try {
    const token = execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (token) return token;
  } catch {
    // gh CLI not installed or not authenticated
  }
  return null;
}

const token = getAuthToken();
if (!token) {
  console.error('[FATAL] No GitHub token found. Please set STATS_TOKEN or authenticate via `gh auth login`.');
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${token}`,
  'User-Agent': 'github-stats-fetcher',
  Accept: 'application/vnd.github.v3+json',
};

// ============================================================================
// Cache Management & Rate Limiting
// ============================================================================

function isValidCacheEntry(entry) {
  if (!Array.isArray(entry)) return false;
  for (const item of entry) {
    if (!Array.isArray(item) || item.length < 3 || typeof item[0] !== 'string') {
      return false;
    }
  }
  return true;
}

let commitCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    const rawCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    let invalidated = 0;
    for (const [key, value] of Object.entries(rawCache)) {
      if (key.split('#').length === 2 && isValidCacheEntry(value)) {
        commitCache[key] = value;
      } else {
        invalidated++;
      }
    }
    if (invalidated > 0) {
      console.log(`[CACHE] Invalidation: Purged ${invalidated} old-format/invalid cache entries.`);
    }
  } catch (e) {
    console.warn('[WARN] Could not parse commit cache, starting fresh:', e.message);
  }
}

function saveCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(commitCache), 'utf8');
  } catch (err) {
    console.warn('[WARN] Failed to write cache:', err.message);
  }
}

function checkRateLimit(res) {
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    const rem = parseInt(remaining, 10);
    if (!isNaN(rem) && rem < 200) {
      console.warn(`\n[WARN] Rate limit threshold reached (${rem} requests remaining < 200).`);
      saveCache();
      console.warn('[WARN] Cache saved. Exiting cleanly without overwriting github-stats.json.');
      process.exit(0);
    }
  }
}

async function fetchJson(url, options = {}, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...HEADERS,
          ...(options.headers || {}),
        },
      });
      checkRateLimit(res);
      return res;
    } catch (err) {
      if (attempt < retries) {
        const delay = attempt * 1500;
        console.warn(`[WARN] Network error on ${url}: ${err.message}. Retrying in ${delay}ms (${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ============================================================================
// Step 1: Discover Repositories (COUNT EVERY REPO OWNED with NO filtering)
// ============================================================================

async function discoverRepos() {
  console.log(`[1/4] Discovering all repositories owned by ${USERNAME}...`);
  const allRepos = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/user/repos?affiliation=owner&per_page=100&page=${page}`;
    const res = await fetchJson(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list repositories (status ${res.status}): ${errText}`);
    }
    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) break;
    allRepos.push(...repos);
    if (repos.length < 100) break;
    page++;
  }

  console.log(`Counted ${allRepos.length} repos owned.`);
  return allRepos;
}

// ============================================================================
// Step 2: Fetch Commit Diffs (raw per-file list cached, filtered at aggregation)
// ============================================================================


async function getCommitFiles(owner, repoName, sha) {
  const cacheKey = `${owner}/${repoName}#${sha}`;
  const cached = commitCache[cacheKey];
  if (isValidCacheEntry(cached)) {
    return cached;
  }

  let url = `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}`;
  const files = [];

  while (url) {
    const res = await fetchJson(url);
    if (!res.ok) {
      console.warn(`Failed to fetch commit ${owner}/${repoName}@${sha.slice(0, 7)}: HTTP ${res.status}`);
      break;
    }
    const data = await res.json();
    if (Array.isArray(data.files)) {
      for (const file of data.files) {
        if (file.filename) {
          files.push([file.filename, file.additions || 0, file.deletions || 0]);
        }
      }
    }

    // Handle file pagination for commits with more than 300 files
    const linkHeader = res.headers.get('link');
    url = null;
    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        url = match[1];
      }
    }
  }

  commitCache[cacheKey] = files;
  return files;
}

async function fetchRepoData(repos) {
  console.log(`[2/4] Fetching languages and per-commit line stats for ${repos.length} repos...`);
  const languagesMap = {};
  let totalCommits = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  let processedCommitCount = 0;

  const isDebug = process.env.STATS_DEBUG?.trim() === '1' && !process.env.GITHUB_ACTIONS;

  // Diagnostics structures
  const repoStats = {};
  const overallPatternLines = {};
  const matchedIdentities = new Map();
  const unmatchedNikhilVirCommits = [];
  const thynklyCountedCommits = [];
  const countedCommitDates = new Set();
  const skippedLargeFiles = [];

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const owner = repo.owner ? repo.owner.login : USERNAME;
    const repoName = repo.name;
    const progress = `[${i + 1}/${repos.length}] ${owner}/${repoName}`;

    repoStats[repoName] = {
      commits: 0,
      added: 0,
      excluded: 0,
      deleted: 0,
      patternLines: {},
    };

    // 1. Fetch languages for repo
    try {
      const langRes = await fetchJson(`https://api.github.com/repos/${owner}/${repoName}/languages`);
      if (langRes.ok) {
        const langData = await langRes.json();
        for (const [lang, bytes] of Object.entries(langData)) {
          languagesMap[lang] = (languagesMap[lang] || 0) + bytes;
        }
      }
    } catch (err) {
      console.warn(`${progress}: Error fetching languages: ${err.message}`);
    }

    // 2. Fetch all commits in repo without author URL filter (to include unlinked git author emails)
    let page = 1;
    const repoCommitItems = [];

    while (true) {
      try {
        const commitsRes = await fetchJson(
          `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=100&page=${page}`
        );

        if (!commitsRes.ok) {
          if (commitsRes.status === 409 || commitsRes.status === 404) {
            break;
          }
          console.warn(`${progress}: Failed to list commits (page ${page}): HTTP ${commitsRes.status}`);
          break;
        }

        const commits = await commitsRes.json();
        if (!Array.isArray(commits) || commits.length === 0) break;

        for (const c of commits) {
          // Skip merge commits (more than 1 parent)
          if (Array.isArray(c.parents) && c.parents.length > 1) {
            continue;
          }

          const match = checkAuthorMatch(c);
          if (match.matched && c.sha) {
            const authorName = c.commit?.author?.name || 'unknown';
            const authorEmail = (c.commit?.author?.email || 'none').toLowerCase();
            const idKey = `${authorName} <${authorEmail}>`;
            if (!matchedIdentities.has(idKey)) {
              matchedIdentities.set(idKey, {
                name: authorName,
                email: authorEmail,
                count: 0,
                rules: new Set(),
              });
            }
            const stat = matchedIdentities.get(idKey);
            stat.count++;
            stat.rules.add(match.rule);

            // Record UTC author date (YYYY-MM-DD) for active days calculation
            const authorDateRaw = c.commit?.author?.date || c.commit?.committer?.date;
            if (authorDateRaw) {
              try {
                const utcDate = new Date(authorDateRaw).toISOString().slice(0, 10);
                countedCommitDates.add(utcDate);
              } catch {
                // Ignore unparseable dates
              }
            }

            repoCommitItems.push({
              sha: c.sha,
              message: (c.commit?.message || '').split('\n')[0],
              date: (c.commit?.author?.date || c.commit?.committer?.date || '').slice(0, 10),
            });
          } else {
            // Unmatched commit - check if name, email, committer or login contains "nikhil" or "vir"
            const aName = (c.commit?.author?.name || '').toLowerCase();
            const aEmail = (c.commit?.author?.email || '').toLowerCase();
            const cName = (c.commit?.committer?.name || '').toLowerCase();
            const cEmail = (c.commit?.committer?.email || '').toLowerCase();
            const aLogin = (c.author?.login || '').toLowerCase();

            const haystack = `${aName} ${aEmail} ${cName} ${cEmail} ${aLogin}`;
            if (haystack.includes('nikhil') || haystack.includes('vir')) {
              unmatchedNikhilVirCommits.push({
                repo: repoName,
                sha: c.sha ? c.sha.slice(0, 7) : 'unknown',
                name: c.commit?.author?.name || 'unknown',
                email: c.commit?.author?.email || 'unknown',
                message: (c.commit?.message || '').split('\n')[0],
              });
            }
          }
        }

        if (commits.length < 100) break;
        page++;
      } catch (err) {
        console.warn(`${progress}: Error listing commits: ${err.message}`);
        break;
      }
    }

    // 3. For each commit, fetch or load cached file list and aggregate non-excluded
    for (const item of repoCommitItems) {
      totalCommits++;
      repoStats[repoName].commits++;

      const files = await getCommitFiles(owner, repoName, item.sha);

      let commitAdded = 0;
      let commitDeleted = 0;

      for (const [filename, added, deleted] of files) {
        const matchedPattern = getExclusionMatch(filename);
        if (matchedPattern) {
          // Excluded file
          repoStats[repoName].excluded += added;
          repoStats[repoName].patternLines[matchedPattern] =
            (repoStats[repoName].patternLines[matchedPattern] || 0) + added;
          overallPatternLines[matchedPattern] =
            (overallPatternLines[matchedPattern] || 0) + added;
        } else if (added > MAX_LINES_PER_FILE_PER_COMMIT) {
          // Skipped file exceeding per-commit single-file limit
          skippedLargeFiles.push({
            repo: repoName,
            sha: item.sha.slice(0, 7),
            path: filename,
            lines: added,
            deleted,
          });
          repoStats[repoName].excluded += added;
          const limitKey = `> ${MAX_LINES_PER_FILE_PER_COMMIT} lines/file`;
          repoStats[repoName].patternLines[limitKey] =
            (repoStats[repoName].patternLines[limitKey] || 0) + added;
          overallPatternLines[limitKey] =
            (overallPatternLines[limitKey] || 0) + added;
        } else {
          // Counted file
          commitAdded += added;
          commitDeleted += deleted;
        }
      }

      if (repoName === 'Thynkly.io') {
        const countedFiles = files
          .filter(([filename, add]) => !getExclusionMatch(filename) && add <= MAX_LINES_PER_FILE_PER_COMMIT)
          .sort((a, b) => b[1] - a[1]);

        thynklyCountedCommits.push({
          sha: item.sha.slice(0, 7),
          date: item.date,
          message: item.message,
          filesCount: files.length,
          linesAdded: commitAdded,
          top3Files: countedFiles.slice(0, 3).map(([fn, add]) => ({ filename: fn, added: add })),
        });
      }

      totalAdditions += commitAdded;
      totalDeletions += commitDeleted;
      repoStats[repoName].added += commitAdded;
      repoStats[repoName].deleted += commitDeleted;

      processedCommitCount++;
      if (processedCommitCount % 20 === 0) {
        saveCache();
        console.log(`Processed ${processedCommitCount} commits (cached & fresh)...`);
      }
    }
  }

  saveCache();
  console.log(`\nProcessed ${totalCommits} total non-merge author commits across ${repos.length} repos.`);
  console.log(`Lines added: +${totalAdditions}, Lines deleted: -${totalDeletions}, Net lines of code: ${totalAdditions - totalDeletions}`);

  if (isDebug) {
    const compactFormatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });

    console.log('\n================== 2(a) MATCHED AUTHOR IDENTITIES ==================');
    if (matchedIdentities.size === 0) {
      console.log('  No author identities matched.');
    } else {
      for (const [idKey, stat] of matchedIdentities.entries()) {
        const rulesStr = Array.from(stat.rules).join('; ');
        console.log(`  - Identity: ${idKey}`);
        console.log(`    Commits : ${stat.count.toLocaleString()}`);
        console.log(`    Matched : ${rulesStr}`);
      }
    }

    console.log('\n================== 2(b) UNMATCHED COMMITS WITH "nikhil" OR "vir" ==================');
    if (unmatchedNikhilVirCommits.length === 0) {
      console.log('  None. All commits with "nikhil" or "vir" matched the allowlist.');
    } else {
      console.log(`  Found ${unmatchedNikhilVirCommits.length} commits containing "nikhil" or "vir" that did NOT match allowlist:`);
      const summaryByIdentity = {};
      for (const item of unmatchedNikhilVirCommits) {
        const key = `${item.name} <${item.email}>`;
        summaryByIdentity[key] = (summaryByIdentity[key] || 0) + 1;
      }
      console.log('  Grouped Summary:');
      for (const [id, count] of Object.entries(summaryByIdentity)) {
        console.log(`    * ${id}: ${count.toLocaleString()} commits`);
      }
      console.log('\n  Commit Details:');
      for (const item of unmatchedNikhilVirCommits) {
        console.log(`    [${item.repo}] ${item.sha} - ${item.name} <${item.email}> : "${item.message}"`);
      }
    }

    console.log('\n================== 3. THYNKLY.IO COUNTED COMMITS ==================');
    if (thynklyCountedCommits.length === 0) {
      console.log('  No commits counted for Thynkly.io.');
    } else {
      console.log(`  Counted ${thynklyCountedCommits.length} commits for Thynkly.io:`);
      for (const c of thynklyCountedCommits) {
        console.log(`  ------------------------------------------------------------------------`);
        console.log(`  SHA         : ${c.sha}`);
        console.log(`  Date        : ${c.date}`);
        console.log(`  Message     : "${c.message}"`);
        console.log(`  Files       : ${c.filesCount}`);
        console.log(`  Lines Added : +${c.linesAdded.toLocaleString()}`);
        if (c.top3Files.length === 0) {
          console.log(`  Top 3 Files : None (0 additions after exclusions)`);
        } else {
          console.log(`  Top 3 Files by additions:`);
          for (const f of c.top3Files) {
            console.log(`    +${f.added.toLocaleString().padStart(6)} : ${f.filename}`);
          }
        }
      }
      console.log(`  ------------------------------------------------------------------------`);
    }

    console.log(`\n================== SKIPPED FILES (> ${MAX_LINES_PER_FILE_PER_COMMIT.toLocaleString()} LINES ADDED) ==================`);
    if (skippedLargeFiles.length === 0) {
      console.log(`  None. No single file exceeded ${MAX_LINES_PER_FILE_PER_COMMIT.toLocaleString()} additions in a single commit.`);
    } else {
      console.log(`  Found ${skippedLargeFiles.length} file(s) skipped exceeding ${MAX_LINES_PER_FILE_PER_COMMIT.toLocaleString()} additions in a single commit:`);
      for (const f of skippedLargeFiles) {
        console.log(`  - repo: ${f.repo}, sha: ${f.sha}, path: ${f.path}, lines: +${f.lines.toLocaleString()}`);
      }
    }

    console.log('\n================== PER-REPO STATS TABLE (ALL 31 REPOS) ==================');
    console.log(
      'Repo Name'.padEnd(36) +
      'Commits'.padStart(9) +
      'Added'.padStart(11) +
      'Excluded'.padStart(12) +
      'Deleted'.padStart(11) +
      '   Top 3 Exclusion Patterns'
    );
    console.log('-'.repeat(120));

    for (const repo of repos) {
      const rName = repo.name;
      const stat = repoStats[rName] || { commits: 0, added: 0, excluded: 0, deleted: 0, patternLines: {} };
      const cCount = stat.commits.toLocaleString();
      const added = stat.added.toLocaleString();
      const excluded = stat.excluded.toLocaleString();
      const deleted = stat.deleted.toLocaleString();

      const top3 = Object.entries(stat.patternLines)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pat, lines]) => `${pat} (-${lines.toLocaleString()})`)
        .join(', ') || 'None';

      console.log(
        rName.padEnd(36) +
        cCount.padStart(9) +
        added.padStart(11) +
        excluded.padStart(12) +
        deleted.padStart(11) +
        '   ' + top3
      );
    }
    console.log('-'.repeat(120));

    console.log('\n================== TOP 10 EXCLUSION PATTERNS OVERALL ==================');
    const topPatterns = Object.entries(overallPatternLines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topPatterns.length === 0) {
      console.log('  (No lines were excluded)');
    } else {
      topPatterns.forEach(([pattern, lines], idx) => {
        console.log(`  #${idx + 1} ${pattern.padEnd(25)}: -${lines.toLocaleString()} lines removed`);
      });
    }

    console.log('\n================== TOTALS COMPARISON ==================');
    console.log('Previous totals:');
    console.log('  Initial run totals (before file exclusions) : 620.3K net, +629.5K / -9.2K (851 commits)');
    console.log('  Broken run totals (with substring/out bug)  : 12.8K net, +20.5K / -7.8K (851 commits)');
    console.log('  Previous fuzzy match run totals             : 161.4K net, +248.0K / -86.6K (1,785 commits)');
    console.log('\nNew totals with explicit AUTHOR_IDENTITIES allowlist:');
    console.log(
      `  Net lines of code : ${compactFormatter.format(totalAdditions - totalDeletions)} (${(totalAdditions - totalDeletions).toLocaleString()})`
    );
    console.log(
      `  Lines added / del : +${compactFormatter.format(totalAdditions)} / -${compactFormatter.format(totalDeletions)} (+${totalAdditions.toLocaleString()} / -${totalDeletions.toLocaleString()})`
    );
    console.log(`  Total commits     : ${totalCommits.toLocaleString()}`);
    console.log('========================================================\n');
  }

  return { languagesMap, totalCommits, totalAdditions, totalDeletions, countedCommitDates };
}

// ============================================================================
// Step 3: Fetch Account-Wide Active Days (GraphQL)
// ============================================================================

async function fetchActiveDays(countedCommitDates = new Set()) {
  console.log(`[3/4] Fetching all-time active contribution days via GraphQL...`);

  const createdQuery = `
    query($login: String!) {
      user(login: $login) {
        createdAt
      }
    }
  `;

  const createdRes = await fetchJson('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query: createdQuery, variables: { login: USERNAME } }),
  });

  if (!createdRes.ok) {
    throw new Error(`Failed to query user createdAt: HTTP ${createdRes.status}`);
  }

  const createdJson = await createdRes.json();
  const createdAtStr = createdJson.data?.user?.createdAt;
  if (!createdAtStr) {
    throw new Error(`Could not find user createdAt in response: ${JSON.stringify(createdJson)}`);
  }

  const startYear = new Date(createdAtStr).getFullYear();
  const currentYear = new Date().getFullYear();
  const activeDates = new Set();

  const calendarQuery = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  for (let year = startYear; year <= currentYear; year++) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;

    const calRes = await fetchJson('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: calendarQuery,
        variables: { login: USERNAME, from, to },
      }),
    });

    if (!calRes.ok) {
      console.warn(`[WARNING] GraphQL failed for year ${year}: HTTP ${calRes.status}`);
      continue;
    }

    const calJson = await calRes.json();
    const weeks = calJson.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
    for (const week of weeks) {
      if (Array.isArray(week.contributionDays)) {
        for (const day of week.contributionDays) {
          if (day.contributionCount > 0) {
            activeDates.add(day.date);
          }
        }
      }
    }
  }

  // Compute union of (a) GraphQL calendar active days and (b) UTC dates of every counted commit
  const graphqlDaysCount = activeDates.size;
  for (const date of countedCommitDates) {
    activeDates.add(date);
  }
  const unionTotal = activeDates.size;
  const additionalFromCommits = unionTotal - graphqlDaysCount;

  console.log(
    `Found ${unionTotal} distinct all-time active contribution days (${graphqlDaysCount} from GraphQL calendar + ${additionalFromCommits} additional unlinked commit dates).`
  );
  return unionTotal;
}

// ============================================================================
// Step 4: Aggregation & Publishing
// ============================================================================

async function main() {
  const repos = await discoverRepos();
  const { languagesMap, totalCommits, totalAdditions, totalDeletions, countedCommitDates } = await fetchRepoData(repos);
  const activeDays = await fetchActiveDays(countedCommitDates);

  // Merge "Jupyter Notebook" into "Python"
  if (languagesMap['Jupyter Notebook']) {
    languagesMap['Python'] = (languagesMap['Python'] || 0) + languagesMap['Jupyter Notebook'];
    delete languagesMap['Jupyter Notebook'];
  }

  // Calculate total bytes
  const totalBytes = Object.values(languagesMap).reduce((sum, b) => sum + b, 0);
  if (totalBytes === 0) {
    console.error('[FATAL] Total language bytes is 0.');
    process.exit(1);
  }

  // Convert to sorted array
  const languages = Object.entries(languagesMap)
    .map(([name, bytes]) => {
      const percent = Number(((bytes / totalBytes) * 100).toFixed(1));
      return { name, bytes, percent };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const totals = {
    linesNet: totalAdditions - totalDeletions,
    linesAdded: totalAdditions,
    linesDeleted: totalDeletions,
    commits: totalCommits,
    activeDays,
  };

  const newStats = {
    generatedAt: new Date().toISOString(),
    languages,
    totals,
  };

  // Publish only once every commit has been processed
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(newStats, null, 2) + '\n', 'utf8');
  console.log(`[SUCCESS] Published updated stats to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('[FATAL] Script error:', err);
  process.exit(1);
});
