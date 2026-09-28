import { Injectable } from '@angular/core';
import { EntityStore, gerarId } from '../core/entity-store';
import { StorageService } from '../core/storage.service';
import { Reserva } from '../models/reserva.model';
import { dataISO, hojeISO } from '../core/format.util';

function periodosSeSobrepoe(inicioA: string, fimA: string, inicioB: string, fimB: string): boolean {
  return inicioA < fimB && inicioB < fimA;
}

@Injectable({ providedIn: 'root' })
export class ReservaService extends EntityStore<Reserva> {
  constructor(storage: StorageService) {
    super(storage, 'reservas');
  }

  novaReserva(): Reserva {
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    return {
      id: gerarId(),
      hospedeId: '',
      suiteId: '',
      checkIn: dataISO(hoje),
      checkOut: dataISO(amanha),
      valorDiaria: 0,
      valorTotal: 0,
      status: 'confirmada',
      observacoes: '',
      criadoEm: new Date().toISOString(),
    };
  }

  async porSuite(suiteId: string): Promise<Reserva[]> {
    return (await this.getAll()).filter((r) => r.suiteId === suiteId);
  }

  async porHospede(hospedeId: string): Promise<Reserva[]> {
    return (await this.getAll()).filter((r) => r.hospedeId === hospedeId);
  }

  /** Reservas ativas (não canceladas) de uma suíte que conflitam com o período informado. */
  async conflitos(suiteId: string, checkIn: string, checkOut: string, ignorarReservaId?: string): Promise<Reserva[]> {
    const reservas = await this.porSuite(suiteId);
    return reservas.filter(
      (r) =>
        r.id !== ignorarReservaId &&
        r.status !== 'cancelada' &&
        periodosSeSobrepoe(r.checkIn, r.checkOut, checkIn, checkOut),
    );
  }

  async chegadasHoje(): Promise<Reserva[]> {
    const hoje = hojeISO();
    return (await this.getAll()).filter((r) => r.checkIn === hoje && r.status !== 'cancelada');
  }

  async saidasHoje(): Promise<Reserva[]> {
    const hoje = hojeISO();
    return (await this.getAll()).filter((r) => r.checkOut === hoje && r.status !== 'cancelada');
  }

  async ocupacaoEm(data: string): Promise<Reserva[]> {
    return (await this.getAll()).filter(
      (r) => r.status !== 'cancelada' && r.checkIn <= data && data < r.checkOut,
    );
  }
}
