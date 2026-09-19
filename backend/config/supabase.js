import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_fxhT9RinP8YN@ep-solitary-mouse-azofyb0r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('[Neon Postgres Pool Error]', err.message);
});

class QueryBuilder {
  constructor(pool, table) {
    this.pool = pool;
    this.table = table;
    this.operation = 'SELECT';
    this.selectCols = '*';
    this.exactCount = false;
    this.insertData = null;
    this.updateData = null;
    this.whereClauses = [];
    this.params = [];
    this.orderBy = [];
    this.limitVal = null;
    this.offsetVal = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
  }

  select(columns = '*', options = {}) {
    if (this.operation === 'INSERT' || this.operation === 'UPDATE' || this.operation === 'DELETE') {
      return this;
    }
    this.operation = 'SELECT';
    this.selectCols = columns && columns.trim() ? columns : '*';
    if (options && options.count === 'exact') {
      this.exactCount = true;
    }
    return this;
  }

  insert(data) {
    this.operation = 'INSERT';
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this.operation = 'UPDATE';
    this.updateData = data;
    return this;
  }

  delete() {
    this.operation = 'DELETE';
    return this;
  }

  eq(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" = $${this.params.length}`);
    return this;
  }

  neq(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" != $${this.params.length}`);
    return this;
  }

  gt(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" > $${this.params.length}`);
    return this;
  }

  gte(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" >= $${this.params.length}`);
    return this;
  }

  lt(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" < $${this.params.length}`);
    return this;
  }

  lte(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" <= $${this.params.length}`);
    return this;
  }

  ilike(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" ILIKE $${this.params.length}`);
    return this;
  }

  like(column, value) {
    this.params.push(value);
    this.whereClauses.push(`"${column}" LIKE $${this.params.length}`);
    return this;
  }

  in(column, values) {
    const arr = Array.isArray(values) ? values : [values];
    this.params.push(arr);
    this.whereClauses.push(`"${column}" = ANY($${this.params.length})`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    const dir = ascending ? 'ASC' : 'DESC';
    this.orderBy.push(`"${column}" ${dir}`);
    return this;
  }

  limit(count) {
    this.limitVal = count;
    return this;
  }

  range(from, to) {
    this.offsetVal = from;
    this.limitVal = (to - from) + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute() {
    try {
      if (this.operation === 'SELECT') {
        let sql = '';
        if (this.exactCount) {
          sql = `SELECT ${this.selectCols}, COUNT(*) OVER() AS __total_count FROM "${this.table}"`;
        } else {
          sql = `SELECT ${this.selectCols} FROM "${this.table}"`;
        }

        if (this.whereClauses.length > 0) {
          sql += ` WHERE ` + this.whereClauses.join(' AND ');
        }

        if (this.orderBy.length > 0) {
          sql += ` ORDER BY ` + this.orderBy.join(', ');
        }

        if (this.limitVal !== null) {
          this.params.push(this.limitVal);
          sql += ` LIMIT $${this.params.length}`;
        }

        if (this.offsetVal !== null) {
          this.params.push(this.offsetVal);
          sql += ` OFFSET $${this.params.length}`;
        }

        const res = await this.pool.query(sql, this.params);
        let count = res.rowCount;
        let data = res.rows;

        if (this.exactCount && res.rows.length > 0) {
          count = parseInt(res.rows[0].__total_count, 10) || res.rowCount;
          data = res.rows.map(r => {
            const copy = { ...r };
            delete copy.__total_count;
            return copy;
          });
        }

        if (this.isSingle) {
          if (data.length === 0) {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          }
          return { data: data[0], error: null };
        }

        if (this.isMaybeSingle) {
          return { data: data.length > 0 ? data[0] : null, error: null };
        }

        return { data, count, error: null };
      }

      if (this.operation === 'INSERT') {
        if (!this.insertData || this.insertData.length === 0) {
          return { data: [], error: null };
        }

        const keysSet = new Set();
        this.insertData.forEach(d => Object.keys(d).forEach(k => keysSet.add(k)));
        const columns = Array.from(keysSet);

        const valuesClauses = [];
        for (const item of this.insertData) {
          const rowPlaceholders = [];
          for (const col of columns) {
            this.params.push(item[col] !== undefined ? item[col] : null);
            rowPlaceholders.push(`$${this.params.length}`);
          }
          valuesClauses.push(`(${rowPlaceholders.join(', ')})`);
        }

        const colNames = columns.map(c => `"${c}"`).join(', ');
        const sql = `INSERT INTO "${this.table}" (${colNames}) VALUES ${valuesClauses.join(', ')} RETURNING *;`;

        const res = await this.pool.query(sql, this.params);
        const data = this.insertData.length === 1 && (this.isSingle || this.isMaybeSingle) ? res.rows[0] : res.rows;
        return { data, error: null };
      }

      if (this.operation === 'UPDATE') {
        const updateCols = Object.keys(this.updateData);
        if (updateCols.length === 0) {
          return { data: [], error: null };
        }

        const setClauses = [];
        for (const col of updateCols) {
          this.params.push(this.updateData[col]);
          setClauses.push(`"${col}" = $${this.params.length}`);
        }

        let sql = `UPDATE "${this.table}" SET ${setClauses.join(', ')}`;
        if (this.whereClauses.length > 0) {
          sql += ` WHERE ` + this.whereClauses.join(' AND ');
        }
        sql += ` RETURNING *;`;

        const res = await this.pool.query(sql, this.params);
        return { data: res.rows, error: null };
      }

      if (this.operation === 'DELETE') {
        let sql = `DELETE FROM "${this.table}"`;
        if (this.whereClauses.length > 0) {
          sql += ` WHERE ` + this.whereClauses.join(' AND ');
        }
        sql += ` RETURNING *;`;

        const res = await this.pool.query(sql, this.params);
        return { data: res.rows, error: null };
      }

      return { data: null, error: { message: `Unsupported operation: ${this.operation}` } };
    } catch (err) {
      console.error(`[DB Error in ${this.table}]`, err.message);
      return { data: null, error: err };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }
}

// Neon Client instance matching Supabase SDK interface
export const supabase = {
  from(table) {
    return new QueryBuilder(pool, table);
  },
  table(table) {
    return new QueryBuilder(pool, table);
  },
  auth: {
    admin: {
      async createUser({ email, password, user_metadata = {} }) {
        try {
          const userId = crypto.randomUUID();
          const username = user_metadata.username || (email ? email.split('@')[0] : 'user_' + Date.now());
          const college = user_metadata.college_name || 'VNSGU Affiliated College';

          const res = await pool.query(
            `INSERT INTO profiles (id, email, username, password, college_name, role, status)
             VALUES ($1, $2, $3, $4, $5, 'user', 'active')
             RETURNING id, email, username`,
            [userId, email.toLowerCase(), username, password, college]
          );

          return { data: { user: res.rows[0] }, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      async deleteUser(id) {
        try {
          await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
          return { data: {}, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      }
    }
  }
};

export default supabase;
