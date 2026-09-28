import { ApplicationRef, Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private ready: Promise<Storage>;
  private readonly appRef = inject(ApplicationRef);
  private atualizacaoAgendada = false;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<Storage> {
    const storage = new Storage();
    await storage.create();
    return storage;
  }

  /**
   * O Ionic 9 cria as telas fora da zona do Angular, então dados que chegam do banco
   * depois de um `await` não redesenham a tela sozinhos. Toda leitura/gravação agenda
   * um redesenho logo depois que as telas terminam de usar o resultado.
   */
  atualizarTela(): void {
    if (this.atualizacaoAgendada) return;
    this.atualizacaoAgendada = true;
    setTimeout(() => {
      this.atualizacaoAgendada = false;
      this.appRef.tick();
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const storage = await this.ready;
    try {
      return await storage.get(key);
    } finally {
      this.atualizarTela();
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const storage = await this.ready;
    try {
      await storage.set(key, value);
    } finally {
      this.atualizarTela();
    }
  }

  async remove(key: string): Promise<void> {
    const storage = await this.ready;
    try {
      await storage.remove(key);
    } finally {
      this.atualizarTela();
    }
  }

  async keys(): Promise<string[]> {
    const storage = await this.ready;
    return storage.keys();
  }

  async clear(): Promise<void> {
    const storage = await this.ready;
    try {
      await storage.clear();
      this.invalidarCaches();
    } finally {
      this.atualizarTela();
    }
  }

  private ouvintesInvalidacao: (() => void)[] = [];

  /** Registra quem mantém cache em memória e precisa descartá-lo quando os dados mudam em massa. */
  aoInvalidar(ouvinte: () => void): void {
    this.ouvintesInvalidacao.push(ouvinte);
  }

  invalidarCaches(): void {
    this.ouvintesInvalidacao.forEach((ouvinte) => ouvinte());
  }
}
