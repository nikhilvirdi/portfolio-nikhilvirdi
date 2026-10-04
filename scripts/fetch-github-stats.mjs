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

// Config constant: file patterns to exclude from line counts (case-insensitive)
const EXCLUDED_FILE_PATTERNS = ['*.md', '*.mdx'];

// Target output path and cache
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/github-stats.json');
const CACHE_DIR = path.resolve(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'commit-stats.json');

function isExcludedFile(filename) {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  for (const pattern of EXCLUDED_FILE_PATTERNS) {
    const p = pattern.toLowerCase();
    if (p.startsWith('*.')) {
      const ext = p.slice(1);
      if (lower.endsWith(ext)) return true;
    } else {
      const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(lower) || regex.test(path.basename(lower))) return true;
    }
  }
  return false;
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

let commitCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    commitCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    console.warn('[WARN] Could not parse commit cache, starting fresh:', e.message);
  }
}

function saveCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(commitCache, null, 2), 'utf8');
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
// Step 2: Fetch Commit Diffs (excluding markdown) and Languages
// ============================================================================

async function getCommitDiffStats(owner, repoName, sha) {
  const cacheKey = `${owner}/${repoName}#${sha}`;
  if (commitCache[cacheKey]) {
    return commitCache[cacheKey];
  }

  let url = `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}`;
  let added = 0;
  let deleted = 0;

  while (url) {
    const res = await fetchJson(url);
    if (!res.ok) {
      console.warn(`Failed to fetch commit ${owner}/${repoName}@${sha.slice(0, 7)}: HTTP ${res.status}`);
      break;
    }
    const data = await res.json();
    if (Array.isArray(data.files)) {
      for (const file of data.files) {
        if (!isExcludedFile(file.filename)) {
          added += file.additions || 0;
          deleted += file.deletions || 0;
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

  const result = { added, deleted };
  commitCache[cacheKey] = result;
  return result;
}

async function fetchRepoData(repos) {
  console.log(`[2/4] Fetching languages and per-commit line stats for ${repos.length} repos...`);
  const languagesMap = {};
  let totalCommits = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  let processedCommitCount = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const owner = repo.owner ? repo.owner.login : USERNAME;
    const repoName = repo.name;
    const progress = `[${i + 1}/${repos.length}] ${owner}/${repoName}`;

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

    // 2. Fetch all commits by author (skipping merge commits)
    let page = 1;
    const repoCommitShas = [];

    while (true) {
      try {
        const commitsRes = await fetchJson(
          `https://api.github.com/repos/${owner}/${repoName}/commits?author=${encodeURIComponent(
            USERNAME
          )}&per_page=100&page=${page}`
        );

        if (!commitsRes.ok) {
          if (commitsRes.status === 409 || commitsRes.status === 404) {
            // Git repository is empty or disabled
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
          if (c.sha) {
            repoCommitShas.push(c.sha);
          }
        }

        if (commits.length < 100) break;
        page++;
      } catch (err) {
        console.warn(`${progress}: Error listing commits: ${err.message}`);
        break;
      }
    }

    // 3. For each commit, fetch or load cached diff stats
    for (const sha of repoCommitShas) {
      totalCommits++; // All author non-merge commits (including md-only)
      const diff = await getCommitDiffStats(owner, repoName, sha);
      totalAdditions += diff.added;
      totalDeletions += diff.deleted;
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

  return { languagesMap, totalCommits, totalAdditions, totalDeletions };
}

// ============================================================================
// Step 3: Fetch Account-Wide Active Days (GraphQL)
// ============================================================================

async function fetchActiveDays() {
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

  console.log(`Found ${activeDates.size} distinct all-time active contribution days.`);
  return activeDates.size;
}

// ============================================================================
// Step 4: Aggregation & Publishing
// ============================================================================

async function main() {
  const repos = await discoverRepos();
  const { languagesMap, totalCommits, totalAdditions, totalDeletions } = await fetchRepoData(repos);
  const activeDays = await fetchActiveDays();

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
