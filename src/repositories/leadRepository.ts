import { pool } from '../database';
import { Lead } from '../models/lead';

export class LeadRepository {
  async create(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    // Defensive fallback: never insert NULL for the NOT NULL status column.
    // The canonical default comes from migration 001 (DEFAULT 'NEW').
    const status =
      typeof lead.status === 'string' && lead.status.trim() !== '' ? lead.status : 'NEW';
    const result = await pool.query(
      `INSERT INTO leads (source, name, phone, email, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lead.source, lead.name, lead.phone, lead.email ?? null, status]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Lead | null> {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async update(id: string, fields: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>): Promise<Lead | null> {
    const allowed = ['source', 'name', 'phone', 'email', 'status'];
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (key in fields) {
        setClauses.push(`${key} = $${idx}`);
        // @ts-ignore
        values.push((fields as any)[key]);
        idx++;
      }
    }
    if (setClauses.length === 0) {
      return this.findById(id);
    }
    values.push(id);
    const query = `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
}

export const leadRepository = new LeadRepository();

export const updateLead = async (id: string, fields: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>): Promise<Lead | null> => {
  return leadRepository.update(id, fields);
};

