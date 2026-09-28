import { Injectable } from '@angular/core';
import { EntityStore, gerarId } from '../core/entity-store';
import { StorageService } from '../core/storage.service';
import { Hospede } from '../models/hospede.model';

@Injectable({ providedIn: 'root' })
export class HospedeService extends EntityStore<Hospede> {
  constructor(storage: StorageService) {
    super(storage, 'hospedes');
  }

  novoHospede(): Hospede {
    return { id: gerarId(), nome: '', telefone: '', documento: '', cidade: '', observacoes: '' };
  }

  async buscarPorNome(termo: string): Promise<Hospede[]> {
    const alvo = termo.trim().toLowerCase();
    if (!alvo) return this.getAll();
    return (await this.getAll()).filter((h) => h.nome.toLowerCase().includes(alvo));
  }
}
