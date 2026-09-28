import { Injectable } from '@angular/core';
import { EntityStore, gerarId } from '../core/entity-store';
import { StorageService } from '../core/storage.service';
import { Suite } from '../models/suite.model';

@Injectable({ providedIn: 'root' })
export class SuiteService extends EntityStore<Suite> {
  constructor(storage: StorageService) {
    super(storage, 'suites');
  }

  novaSuite(): Suite {
    return {
      id: gerarId(),
      nome: '',
      tipo: 'Standard',
      capacidade: 2,
      valorDiaria: 0,
      descricao: '',
      ativo: true,
    };
  }

  async ativas(): Promise<Suite[]> {
    return (await this.getAll()).filter((s) => s.ativo);
  }
}
