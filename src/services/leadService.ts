import { Lead } from '../models/lead';
import { LeadRepository } from '../repositories/leadRepository';

export type CreateLeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: string;
};

export interface ListLeadsOptions {
  search?: string;
  page: number;
  limit: number;
}

export interface ListLeadsResult {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

export class LeadService {
  private repo = new LeadRepository();

  async createLead(data: CreateLeadInput) {
    // status is optional on the API contract; the leads table requires
    // status NOT NULL with DB DEFAULT 'NEW'. Default here so an explicit
    // NULL is never inserted (which would bypass the DB default -> 23502).
    const status = typeof data.status === 'string' && data.status.trim() !== '' ? data.status : 'NEW';
    return this.repo.create({ ...data, status });
  }

  async getLead(id: string) {
    return this.repo.findById(id);
  }

  async listLeads(opts: ListLeadsOptions): Promise<ListLeadsResult> {
    const offset = (opts.page - 1) * opts.limit;
    const [leads, total] = await Promise.all([
      this.repo.findAll({ search: opts.search, limit: opts.limit, offset }),
      this.repo.countAll({ search: opts.search }),
    ]);
    return { leads, total, page: opts.page, limit: opts.limit };
  }

  async updateLead(id: string, fields: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>) {
    return this.repo.update(id, fields);
  }
}
