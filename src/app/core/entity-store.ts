import { StorageService } from './storage.service';

export abstract class EntityStore<T extends { id: string }> {
  private cache: T[] | null = null;

  protected constructor(
    private readonly storage: StorageService,
    private readonly key: string,
  ) {
    storage.aoInvalidar(() => (this.cache = null));
  }

  private async load(): Promise<T[]> {
    if (!this.cache) {
      this.cache = (await this.storage.get<T[]>(this.key)) ?? [];
    } else {
      // Leitura do cache não passa pelo banco; agenda o redesenho da tela do mesmo jeito.
      this.storage.atualizarTela();
    }
    return this.cache;
  }

  private async persist(items: T[]): Promise<void> {
    this.cache = items;
    await this.storage.set(this.key, items);
  }

  async getAll(): Promise<T[]> {
    return [...(await this.load())];
  }

  async getById(id: string): Promise<T | undefined> {
    return (await this.load()).find((item) => item.id === id);
  }

  async save(item: T): Promise<T> {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    await this.persist(items);
    return item;
  }

  async remove(id: string): Promise<void> {
    const items = await this.load();
    await this.persist(items.filter((i) => i.id !== id));
  }
}

export function gerarId(): string {
  return (crypto as { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
