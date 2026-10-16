const { query } = require('../config/db');

const PUBLIC_COLUMNS = 'id, name, email, role, created_at';

const userModel = {
  async findAll() {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async create({ name, email, role = 'reporter' }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, role)
       VALUES ($1, $2, $3)
       RETURNING ${PUBLIC_COLUMNS}`,
      [name, email, role]
    );
    return rows[0];
  },
};

module.exports = userModel;
