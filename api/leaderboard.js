const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");

const ALLOWED_LEVEL_IDS = new Set(["level-1", "level-2"]);
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;
const SCHEMA_SQL = `
  create table if not exists sudoku_runs (
    id text primary key,
    player_name varchar(32) not null,
    level_id varchar(16) not null check (level_id in ('level-1', 'level-2')),
    seconds_elapsed integer not null check (seconds_elapsed >= 0),
    hints_used integer not null default 0 check (hints_used >= 0 and hints_used <= 5),
    completed_at timestamptz not null default now()
  );

  create index if not exists sudoku_runs_level_time_idx
    on sudoku_runs (level_id, seconds_elapsed asc, hints_used asc, completed_at asc);
`;

const hasDatabaseConfig =
  Boolean(process.env.SUPABASE_DB_HOST) &&
  Boolean(process.env.SUPABASE_DB_USER) &&
  Boolean(process.env.SUPABASE_DB_NAME) &&
  Boolean(process.env.SUPABASE_DB_PASSWORD);

const pool = hasDatabaseConfig
  ? new Pool({
      host: process.env.SUPABASE_DB_HOST,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: process.env.SUPABASE_DB_NAME,
      user: process.env.SUPABASE_DB_USER,
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: process.env.SUPABASE_DB_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000
    })
  : null;

let schemaReadyPromise = null;

module.exports = async function handler(req, res) {
  setDefaultHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!pool) {
    return res.status(503).json({
      error: "Database configuration is incomplete.",
      missing: ["SUPABASE_DB_PASSWORD"]
    });
  }

  try {
    await ensureSchema();

    if (req.method === "GET") {
      return handleList(req, res);
    }

    if (req.method === "POST") {
      return handleCreate(req, res);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Leaderboard API failed.", error);
    return res.status(500).json({ error: "Leaderboard request failed." });
  }
};

async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(SCHEMA_SQL).catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

async function handleList(req, res) {
  const levelId = normalizeLevelId(req.query.levelId);
  if (!levelId) {
    return res.status(400).json({ error: "Invalid levelId." });
  }

  const limit = clampLimit(req.query.limit);
  const { rows } = await pool.query(
    `
      select
        id,
        player_name as "playerName",
        level_id as "levelId",
        seconds_elapsed as "seconds",
        hints_used as "hintsUsed",
        completed_at as "completedAt"
      from sudoku_runs
      where level_id = $1
      order by seconds_elapsed asc, hints_used asc, completed_at asc
      limit $2
    `,
    [levelId, limit]
  );

  return res.status(200).json({ records: rows });
}

async function handleCreate(req, res) {
  const payload = parseBody(req.body);
  const record = normalizePayload(payload);

  if (!record) {
    return res.status(400).json({ error: "Invalid leaderboard payload." });
  }

  const { rows } = await pool.query(
    `
      insert into sudoku_runs (
        id,
        player_name,
        level_id,
        seconds_elapsed,
        hints_used,
        completed_at
      )
      values ($1, $2, $3, $4, $5, $6)
      returning
        id,
        player_name as "playerName",
        level_id as "levelId",
        seconds_elapsed as "seconds",
        hints_used as "hintsUsed",
        completed_at as "completedAt"
    `,
    [
      record.id,
      record.playerName,
      record.levelId,
      record.seconds,
      record.hintsUsed,
      record.completedAt
    ]
  );

  return res.status(201).json({ record: rows[0] });
}

function normalizePayload(payload) {
  const levelId = normalizeLevelId(payload.levelId);
  const playerName = String(payload.playerName || "Anonymous Pilot").trim().slice(0, 32);
  const seconds = Number(payload.seconds);
  const hintsUsed = Number(payload.hintsUsed || 0);
  const completedAt = new Date(payload.completedAt || Date.now());

  if (
    !levelId ||
    !Number.isInteger(seconds) ||
    seconds < 0 ||
    !Number.isInteger(hintsUsed) ||
    hintsUsed < 0 ||
    hintsUsed > 5 ||
    Number.isNaN(completedAt.getTime())
  ) {
    return null;
  }

  return {
    id: payload.id || randomUUID(),
    playerName: playerName || "Anonymous Pilot",
    levelId,
    seconds,
    hintsUsed,
    completedAt: completedAt.toISOString()
  };
}

function normalizeLevelId(levelId) {
  return ALLOWED_LEVEL_IDS.has(levelId) ? levelId : null;
}

function clampLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(numeric)));
}

function parseBody(body) {
  if (!body) {
    return {};
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body;
}

function setDefaultHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}
