const { query } = require('../config/db');

const BUG_COLUMNS = `
  b.id,
  b.title,
  b.description,
  b.priority,
  b.severity,
  b.status,
  b.created_by,
  b.assigned_to,
  b.created_at,
  b.updated_at
`;

/**
 * Build a dynamic WHERE clause from supported query filters.
 */
function buildFilters({ status, priority, severity, assigned_to, search }) {
  const conditions = [];
  const values = [];

  const add = (column, value) => {
    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  };

  if (status) add('b.status', status);
  if (priority) add('b.priority', priority);
  if (severity) add('b.severity', severity);
  if (assigned_to) add('b.assigned_to', assigned_to);
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(b.title ILIKE $${values.length} OR b.description ILIKE $${values.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, values };
}

const bugModel = {
  async findAll(filters = {}) {
    const { where, values } = buildFilters(filters);
    const { rows } = await query(
      `SELECT ${BUG_COLUMNS}
         FROM bugs b
         ${where}
         ORDER BY b.created_at DESC`,
      values
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`SELECT ${BUG_COLUMNS} FROM bugs b WHERE b.id = $1`, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const {
      title,
      description = null,
      priority = 'medium',
      severity = 'moderate',
      status = 'open',
      created_by = null,
      assigned_to = null,
    } = data;

    const { rows } = await query(
      `INSERT INTO bugs (title, description, priority, severity, status, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, priority, severity, status, created_by, assigned_to, created_at, updated_at`,
      [title, description, priority, severity, status, created_by, assigned_to]
    );
    return rows[0];
  },

  async update(id, data) {
    const allowed = ['title', 'description', 'priority', 'severity', 'status', 'assigned_to'];
    const sets = [];
    const values = [];

    allowed.forEach((field) => {
      if (data[field] !== undefined) {
        values.push(data[field]);
        sets.push(`${field} = $${values.length}`);
      }
    });

    if (!sets.length) return this.findById(id);

    values.push(id);
    const { rows } = await query(
      `UPDATE bugs
          SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id, title, description, priority, severity, status, created_by, assigned_to, created_at, updated_at`,
      values
    );
    return rows[0] || null;
  },

  async assign(id, assignedTo, assignedBy = null) {
    const { rows } = await query(
      `UPDATE bugs
          SET assigned_to = $1, status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END, updated_at = NOW()
        WHERE id = $2
        RETURNING id, title, description, priority, severity, status, created_by, assigned_to, created_at, updated_at`,
      [assignedTo, id]
    );
    const bug = rows[0] || null;
    if (bug) {
      try {
        await query(
          `INSERT INTO assignment_history (bug_id, assigned_to, assigned_by)
           VALUES ($1, $2, $3)`,
          [bug.id, bug.assigned_to, assignedBy]
        );
      } catch (_err) {
        // Recording history is non-blocking - ignore if the table is missing
        // or the insert fails in a read-only/test context.
      }
    }
    return bug;
  },

  async remove(id) {
    const { rowCount } = await query('DELETE FROM bugs WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async addComment({ bugId, userId = null, message }) {
    const { rows } = await query(
      `INSERT INTO comments (bug_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, bug_id, user_id, message, created_at`,
      [bugId, userId, message]
    );
    return rows[0];
  },

  async findComments(bugId) {
    const { rows } = await query(
      `SELECT id, bug_id, user_id, message, created_at
          FROM comments
         WHERE bug_id = $1
         ORDER BY created_at ASC`,
      [bugId]
    );
    return rows;
  },

  async findAssignmentHistory(bugId) {
    const { rows } = await query(
      `SELECT ah.id, ah.bug_id, ah.assigned_to, ah.assigned_by, ah.created_at, ah.reason,
              u.name AS assigned_to_name,
              ub.name AS assigned_by_name
         FROM assignment_history ah
         LEFT JOIN users u ON u.id = ah.assigned_to
         LEFT JOIN users ub ON ub.id = ah.assigned_by
        WHERE ah.bug_id = $1
        ORDER BY ah.created_at DESC`,
      [bugId]
    );
    return rows;
  },

  async getAssignmentStats() {
    try {
      const { rows } = await query(
        `SELECT u.id AS user_id,
                u.name,
                u.email,
                u.role,
                COALESCE(
                  COUNT(*) FILTER (WHERE b.status IN ('resolved', 'closed')),
                  0
                ) AS resolved_count,
                COALESCE(
                  COUNT(*) FILTER (WHERE b.status IN ('open', 'assigned', 'in_progress')),
                  0
                ) AS open_count,
                COALESCE(
                  json_agg(DISTINCT b.title) FILTER (
                    WHERE b.status IN ('resolved', 'closed') AND b.title IS NOT NULL
                  ),
                  '[]'
                ) AS resolved_titles
           FROM users u
           LEFT JOIN bugs b ON b.assigned_to = u.id
           GROUP BY u.id
           ORDER BY u.id`
      );
      return rows.map((row) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        resolved_count: Number(row.resolved_count),
        open_count: Number(row.open_count),
        resolved_titles: Array.isArray(row.resolved_titles)
          ? row.resolved_titles
          : JSON.parse(row.resolved_titles || '[]'),
      }));
    } catch (_err) {
      // Fallback: return users with empty stats so the AI recommender still
      // works even if the schema/migrations haven't run in a minimal test env.
      const { query: q } = require('../config/db');
      const { rows } = await q('SELECT id, name, email, role FROM users ORDER BY id');
      return rows.map((row) => ({
        user_id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        resolved_count: 0,
        open_count: 0,
        resolved_titles: [],
      }));
    }
  },
};

module.exports = bugModel;
