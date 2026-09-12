import { Lead } from '../models/lead';
import { LeadRepository } from '../repositories/leadRepository';

export type CreateLeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: string;
};

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

  async updateLead(id: string, fields: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>) {
    return this.repo.update(id, fields);
  }
}
