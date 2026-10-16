/**
 * AI Service Adapter
 * ------------------
 * A small, dependency-free adapter that powers the "AI-Powered Smart Bug
 * Triaging & Assignment" feature.
 *
 * Two operating modes are supported:
 *
 *   1. **Live mode** – used automatically when `AI_API_KEY` is configured.
 *      Requests are sent to a pluggable LLM provider (`AI_PROVIDER`, default
 *      `openai`, or `gemini` / `anthropic`). The provider returns free-form
 *      text which is parsed into a strict, typed response envelope.
 *
 *   2. **Mock / deterministic mode** – the default fallback when no
 *      `AI_API_KEY` is present (local development, CI and the test suites).
 *      A keyword-scoring heuristic produces stable, reproducible suggestions
 *      so the rest of the system can be developed and tested without any
 *      external dependency.
 *
 * Every public entry point degrades gracefully: if a live request fails
 * (missing network, rate limit, malformed response) the deterministic mock is
 * returned instead so the manual workflow is never blocked.
 */
const logger = require('../utils/logger');

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'major', 'critical', 'blocker'];

const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const API_KEY = process.env.AI_API_KEY || '';

const MAX_RECOMMENDATIONS = 5;

/**
 * Keyword → weight maps used by the deterministic triage heuristic. Higher
 * weights indicate a more severe issue. The first matching tier wins so the
 * ordering of these lists matters.
 */
const PRIORITY_SIGNALS = [
  {
    priority: 'critical',
    keywords: [
      'outage',
      'production',
      'data loss',
      'data corruption',
      'corrupt',
      'security',
      'breach',
      'vulnerability',
      'cve',
      'crash',
      'server down',
      'unavailable',
      'payment',
      'deadlock',
      'timeout',
      'connection pool',
      'cannot log in',
      'all users',
    ],
  },
  {
    priority: 'high',
    keywords: [
      'error',
      'fail',
      'exception',
      'broken',
      'regression',
      'memory leak',
      'leak',
      'slow',
      'degraded',
      '500',
      'timeout',
      'blocking',
    ],
  },
  {
    priority: 'medium',
    keywords: ['incorrect', 'wrong', 'inconsistent', 'flaky', 'sometimes', 'intermittent', 'bug'],
  },
  {
    priority: 'low',
    keywords: ['typo', 'cosmetic', 'alignment', 'color', 'spacing', 'tooltip', 'wording', 'label'],
  },
];

const SEVERITY_BY_PRIORITY = {
  critical: ['blocker', 'critical'],
  high: ['critical', 'major'],
  medium: ['major'],
  low: ['minor'],
};

/**
 * Root-cause templates keyed by a detector. The first detector whose keywords
 * appear in the bug text is used.
 */
const ROOT_CAUSE_RULES = [
  {
    keywords: ['timeout', 'connection', 'database', 'db', 'pool', 'postgres', 'query'],
    cause:
      'Likely database connection pool exhaustion or slow queries causing request timeouts. Inspect pool sizing, long-running queries and connection lifecycle management.',
  },
  {
    keywords: ['memory', 'leak', 'heap', 'oom'],
    cause:
      'Possible memory leak or unbounded growth on the server. Profile heap usage and look for retained references or missing cleanup.',
  },
  {
    keywords: ['null', 'undefined', 'typeerror', 'cannot read', 'nan'],
    cause:
      'A null/undefined value is being dereferenced before validation. Add defensive guards and validate data at the boundary.',
  },
  {
    keywords: ['auth', 'login', 'token', 'session', 'permission', 'forbidden', '401', '403'],
    cause:
      'Authentication or authorization state is not being propagated correctly. Verify token/session handling and permission checks.',
  },
  {
    keywords: ['render', 'ui', 'component', 'css', 'react', 'display', 'layout'],
    cause:
      'A rendering/state synchronization issue in the client layer. Check component lifecycle and props/state updates.',
  },
  {
    keywords: ['crash', 'segfault', 'panic', 'fatal'],
    cause:
      'An unhandled fatal error is crashing the process. Add global error boundaries and capture the stack trace.',
  },
];

const GENERIC_ROOT_CAUSE =
  'Root cause not yet determined from the provided details. Reproduce the issue with logging enabled and inspect the failing code path.';

function isLive() {
  return Boolean(API_KEY);
}

function getConfig() {
  return {
    mode: isLive() ? 'live' : 'mock',
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL,
  };
}

function truncate(value, max = 160) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function firstSentence(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return match ? match[0].trim() : truncate(text);
}

/**
 * Extract meaningful lowercase keywords from free-form text. Removes common
 * stop words and short tokens so the heuristic keys on signal.
 */
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'it',
  'this',
  'that',
  'when',
  'then',
  'than',
  'at',
  'by',
  'from',
  'as',
  'not',
  'no',
  'we',
  'i',
  'you',
  'they',
  'can',
  'could',
  'should',
  'would',
  'will',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'so',
  'if',
  'up',
  'out',
  'about',
]);

function extractKeywords(...parts) {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  const tokens = text.match(/[a-z0-9+#-]{3,}/g) || [];
  const unique = new Set();
  tokens.forEach((token) => {
    if (!STOP_WORDS.has(token)) unique.add(token);
  });
  return [...unique];
}

function matchPriority(text) {
  const haystack = text.toLowerCase();
  for (const tier of PRIORITY_SIGNALS) {
    if (tier.keywords.some((keyword) => haystack.includes(keyword))) {
      return tier.priority;
    }
  }
  return 'medium';
}

function matchRootCause(text) {
  const haystack = text.toLowerCase();
  const rule = ROOT_CAUSE_RULES.find((entry) =>
    entry.keywords.some((keyword) => haystack.includes(keyword))
  );
  return rule ? rule.cause : GENERIC_ROOT_CAUSE;
}

function buildTriageSummary({ title, description }) {
  const cleanTitle = truncate(title, 120);
  const detail = firstSentence(description);
  if (!detail) return cleanTitle;
  return `${cleanTitle}: ${truncate(detail, 140)}`;
}

/**
 * Deterministic, keyword-based triage. Always available and used as the
 * fallback whenever live inference is unavailable.
 */
function mockTriage(input = {}) {
  const { title = '', description = '', steps_to_reproduce = '' } = input;
  const combined = [title, description, steps_to_reproduce].filter(Boolean).join(' ');

  const suggested_priority = matchPriority(combined);
  const severityPool = SEVERITY_BY_PRIORITY[suggested_priority];
  const suggested_severity =
    suggested_priority === 'critical' && /crash|outage|down|data loss/.test(combined.toLowerCase())
      ? 'blocker'
      : severityPool[0];

  return {
    suggested_priority,
    suggested_severity,
    summary: buildTriageSummary({ title, description }),
    possible_root_cause: matchRootCause(combined),
    source: 'mock',
  };
}

function buildTriagePrompt({ title, description, steps_to_reproduce }) {
  return [
    'You are a senior software quality engineer. Analyse the bug report below and',
    'return ONLY a compact JSON object (no markdown, no prose) with this shape:',
    '{"suggested_priority":"low|medium|high|critical",',
    '"suggested_severity":"minor|major|critical|blocker",',
    '"summary":"one sentence",',
    '"possible_root_cause":"one or two sentences"}',
    '',
    `Title: ${title || '(none)'}`,
    `Description: ${description || '(none)'}`,
    `Steps to reproduce: ${steps_to_reproduce || '(none)'}`,
  ].join('\n');
}

/**
 * Parse an LLM response into the triage envelope. Accepts raw JSON or JSON
 * embedded in surrounding prose/markdown fences. Returns `null` when the text
 * cannot be coerced into a valid shape.
 */
function parseTriageResponse(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;

  let parsed;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch (_err) {
    return null;
  }

  const priority = String(parsed.suggested_priority || '').toLowerCase();
  const severity = String(parsed.suggested_severity || '').toLowerCase();

  if (!PRIORITIES.includes(priority) || !SEVERITIES.includes(severity)) return null;

  return {
    suggested_priority: priority,
    suggested_severity: severity,
    summary: truncate(parsed.summary || '', 240),
    possible_root_cause: truncate(parsed.possible_root_cause || '', 480),
    source: 'ai',
  };
}

/**
 * Low-level provider call. Kept intentionally thin and dependency-free by
 * relying on the global `fetch` available in Node 18+.
 */
async function callProvider(prompt) {
  const provider = DEFAULT_PROVIDER;
  const timeout = Number.parseInt(process.env.AI_TIMEOUT_MS || '15000', 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Gemini error ${res.status}`);
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
      const data = await res.json();
      return data?.content?.[0]?.text || '';
    }

    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Triage a bug. Uses live inference when configured, otherwise (or on any
 * failure) falls back to the deterministic mock.
 */
async function triageBug(input = {}) {
  const fallback = mockTriage(input);
  if (!isLive()) return fallback;

  try {
    const raw = await callProvider(buildTriagePrompt(input));
    const parsed = parseTriageResponse(raw);
    if (parsed && parsed.summary && parsed.possible_root_cause) return parsed;
    logger.warn('AI triage response could not be parsed; using deterministic fallback');
    return fallback;
  } catch (err) {
    logger.warn(`AI triage request failed (${err.message}); using deterministic fallback`);
    return fallback;
  }
}

/**
 * Compute a normalised workload penalty for a developer. Fewer open tickets →
 * higher availability score in the range [0, 1].
 */
function availabilityScore(openCount, maxOpen) {
  if (maxOpen <= 0) return 1;
  const ratio = Math.min(openCount / maxOpen, 1);
  return 1 - ratio;
}

/**
 * Score how well a developer's resolved history matches the bug keywords.
 * Returns a value in [0, 1].
 */
function expertiseScore(bugKeywords, resolvedTitles) {
  if (!bugKeywords.length || !resolvedTitles.length) return 0;
  const historyKeywords = new Set(extractKeywords(...resolvedTitles));
  const overlap = bugKeywords.filter((keyword) => historyKeywords.has(keyword));
  return Math.min(overlap.length / Math.min(bugKeywords.length, 5), 1);
}

/**
 * Build a deterministic, human-readable justification for a recommendation.
 */
function buildReason({ expertise, resolvedCount, openCount, role }) {
  const parts = [];
  if (expertise >= 0.5) parts.push('strong match with similar resolved tickets');
  else if (expertise > 0) parts.push('related experience on comparable issues');
  else parts.push('generalist fit for this area');

  if (resolvedCount > 0) parts.push(`${resolvedCount} ticket${resolvedCount === 1 ? '' : 's'} resolved`);
  if (openCount === 0) parts.push('currently unassigned / fully available');
  else parts.push(`${openCount} open ticket${openCount === 1 ? '' : 's'}`);
  if (role === 'developer') parts.push('developer role');

  return parts.join(' · ');
}

/**
 * Score a single candidate. Kept pure so it can be unit tested directly.
 */
function scoreAssignee({ bug, candidate, stats = {} }) {
  const bugKeywords = extractKeywords(bug.title, bug.description, bug.steps_to_reproduce);
  const resolvedTitles = stats.resolved_titles || stats.resolvedTitles || [];
  const openCount = Number(stats.open_count ?? stats.openCount ?? 0);
  const resolvedCount = Number(stats.resolved_count ?? stats.resolvedCount ?? 0);
  const maxOpen = Number(stats.max_open ?? stats.maxOpen ?? 0);

  const expertise = expertiseScore(bugKeywords, resolvedTitles);
  const availability = availabilityScore(openCount, maxOpen);
  const experience = Math.min(resolvedCount / 10, 1);
  const roleBonus = candidate.role && candidate.role !== 'reporter' ? 0.05 : 0;

  const raw = 0.5 * expertise + 0.3 * availability + 0.2 * experience + roleBonus;
  const matchScore = Math.max(1, Math.min(99, Math.round(raw * 100)));

  return {
    userId: candidate.id,
    name: candidate.name,
    email: candidate.email,
    matchScore,
    reason: buildReason({
      expertise,
      resolvedCount,
      openCount,
      role: candidate.role,
    }),
  };
}

/**
 * Rank candidates for a bug. `statsByUser` maps a user id to their workload /
 * history stats (see `server/src/models/bugModel.js#getAssignmentStats`).
 */
function recommendAssignees({ bug = {}, users = [], statsByUser = {} } = {}) {
  const statsValues = Object.values(statsByUser);
  const maxOpen = statsValues.reduce(
    (max, stats) => Math.max(max, Number(stats.open_count ?? stats.openCount ?? 0)),
    0
  );

  const recommendations = users
    .map((candidate) =>
      scoreAssignee({
        bug,
        candidate,
        stats: { ...(statsByUser[candidate.id] || {}), max_open: maxOpen },
      })
    )
    .sort((a, b) => b.matchScore - a.matchScore || a.userId - b.userId)
    .slice(0, MAX_RECOMMENDATIONS);

  return { recommendations, source: 'mock' };
}

module.exports = {
  isLive,
  getConfig,
  extractKeywords,
  mockTriage,
  buildTriagePrompt,
  parseTriageResponse,
  triageBug,
  scoreAssignee,
  recommendAssignees,
  PRIORITIES,
  SEVERITIES,
  MAX_RECOMMENDATIONS,
};
