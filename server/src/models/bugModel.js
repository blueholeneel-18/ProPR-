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

  async assign(id, assignedTo) {
    const { rows } = await query(
      `UPDATE bugs
          SET assigned_to = $1, status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END, updated_at = NOW()
        WHERE id = $2
        RETURNING id, title, description, priority, severity, status, created_by, assigned_to, created_at, updated_at`,
      [assignedTo, id]
    );
    return rows[0] || null;
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
};

module.exports = bugModel;
