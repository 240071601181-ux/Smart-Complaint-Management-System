import { Lead } from '../models/lead';
import { LeadRepository } from '../repositories/leadRepository';

export class LeadService {
  private repo = new LeadRepository();

  async createLead(data: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) {
    // Business logic could be added here later (e.g., default status)
    return this.repo.create(data);
  }

  async getLead(id: string) {
    return this.repo.findById(id);
  }

  async updateLead(id: string, fields: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>) {
    return this.repo.update(id, fields);
  }
}
