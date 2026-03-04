import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const WINDOW_DAYS = 14;

// ---------------------------------------------------------------------------
// Init — crée les tables si elles n'existent pas
// ---------------------------------------------------------------------------
export async function initStatsDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stats_text (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stats_voice (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      minutes     INTEGER NOT NULL DEFAULT 0,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stats_setup (
      guild_id    TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      message_id  TEXT NOT NULL,
      PRIMARY KEY (guild_id)
    );

    CREATE INDEX IF NOT EXISTS idx_stats_text_guild_date
      ON stats_text (guild_id, recorded_at);

    CREATE INDEX IF NOT EXISTS idx_stats_voice_guild_date
      ON stats_voice (guild_id, recorded_at);
  `);
  console.log("[Stats] Tables DB initialisées.");
}

// ---------------------------------------------------------------------------
// Texte — ajouter un message
// ---------------------------------------------------------------------------
export async function recordTextMessage(guildId, userId) {
  await pool.query(
    `INSERT INTO stats_text (guild_id, user_id) VALUES ($1, $2)`,
    [guildId, userId],
  );
}

// ---------------------------------------------------------------------------
// Voix — ajouter des minutes
// ---------------------------------------------------------------------------
export async function recordVoiceMinutes(guildId, userId, minutes) {
  if (minutes <= 0) return;
  await pool.query(
    `INSERT INTO stats_voice (guild_id, user_id, minutes) VALUES ($1, $2, $3)`,
    [guildId, userId, minutes],
  );
}

// ---------------------------------------------------------------------------
// Top 10 Texte sur 14 jours
// ---------------------------------------------------------------------------
export async function getTopText(guildId) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    `SELECT user_id, COUNT(*) AS total
     FROM stats_text
     WHERE guild_id = $1 AND recorded_at >= $2
     GROUP BY user_id
     ORDER BY total DESC
     LIMIT 10`,
    [guildId, since],
  );
  return rows; // [{ user_id, total }]
}

// ---------------------------------------------------------------------------
// Top 10 Vocal sur 14 jours
// ---------------------------------------------------------------------------
export async function getTopVoice(guildId) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    `SELECT user_id, SUM(minutes) AS total_minutes
     FROM stats_voice
     WHERE guild_id = $1 AND recorded_at >= $2
     GROUP BY user_id
     ORDER BY total_minutes DESC
     LIMIT 10`,
    [guildId, since],
  );
  return rows; // [{ user_id, total_minutes }]
}

// ---------------------------------------------------------------------------
// Setup — sauvegarder le salon + message
// ---------------------------------------------------------------------------
export async function saveStatsSetup(guildId, channelId, messageId) {
  await pool.query(
    `INSERT INTO stats_setup (guild_id, channel_id, message_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id) DO UPDATE
       SET channel_id = EXCLUDED.channel_id,
           message_id = EXCLUDED.message_id`,
    [guildId, channelId, messageId],
  );
}

// ---------------------------------------------------------------------------
// Setup — récupérer toutes les configurations (pour le cron)
// ---------------------------------------------------------------------------
export async function getAllStatsSetups() {
  const { rows } = await pool.query(
    `SELECT guild_id, channel_id, message_id FROM stats_setup`,
  );
  return rows; // [{ guild_id, channel_id, message_id }]
}

// ---------------------------------------------------------------------------
// Nettoyage — supprimer les entrées > 14 jours (optionnel, les requêtes filtrent déjà)
// ---------------------------------------------------------------------------
export async function purgeOldStats() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(`DELETE FROM stats_text WHERE recorded_at < $1`, [since]);
  await pool.query(`DELETE FROM stats_voice WHERE recorded_at < $1`, [since]);
}

export { pool };
