import { Injectable } from '@angular/core';
import { StorageService } from '../core/storage.service';
import { PousadaConfig, POUSADA_CONFIG_PADRAO } from '../models/pousada-config.model';

const CHAVE_CONFIG = 'pousadaConfig';
const CHAVE_ULTIMO_BACKUP = 'ultimoBackup';
const CHAVES_DADOS = ['suites', 'hospedes', 'reservas', 'pagamentos', 'lancamentos', CHAVE_CONFIG];

@Injectable({ providedIn: 'root' })
export class PousadaService {
  constructor(private storage: StorageService) {}

  async getConfig(): Promise<PousadaConfig> {
    // Sempre uma cópia: a tela edita o objeto direto e não pode alterar o padrão.
    return { ...POUSADA_CONFIG_PADRAO, ...((await this.storage.get<PousadaConfig>(CHAVE_CONFIG)) ?? {}) };
  }

  async salvarConfig(config: PousadaConfig): Promise<void> {
    await this.storage.set(CHAVE_CONFIG, config);
  }

  async exportarBackup(): Promise<Record<string, unknown>> {
    const dados: Record<string, unknown> = {};
    for (const chave of CHAVES_DADOS) {
      dados[chave] = (await this.storage.get(chave)) ?? null;
    }
    dados['exportadoEm'] = new Date().toISOString();
    return dados;
  }

  async registrarBackupFeito(): Promise<void> {
    await this.storage.set(CHAVE_ULTIMO_BACKUP, new Date().toISOString());
  }

  /** Data (ISO) da última cópia de segurança salva, ou null se nunca foi feita. */
  async ultimoBackup(): Promise<string | null> {
    return this.storage.get<string>(CHAVE_ULTIMO_BACKUP);
  }

  /** Confere se o arquivo escolhido é mesmo uma cópia deste app. */
  ehBackupValido(dados: unknown): dados is Record<string, unknown> {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return false;
    const registro = dados as Record<string, unknown>;
    const chavesDeLista = ['suites', 'hospedes', 'reservas', 'pagamentos', 'lancamentos'].filter((c) => c in registro);
    return chavesDeLista.length > 0 && chavesDeLista.every((c) => registro[c] === null || Array.isArray(registro[c]));
  }

  async importarBackup(dados: Record<string, unknown>): Promise<void> {
    for (const chave of CHAVES_DADOS) {
      if (chave in dados) {
        await this.storage.set(chave, dados[chave] ?? (chave === CHAVE_CONFIG ? null : []));
      }
    }
    this.storage.invalidarCaches();
  }

  async limparTudo(): Promise<void> {
    await this.storage.clear();
  }
}
