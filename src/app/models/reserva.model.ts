export type StatusReserva = 'confirmada' | 'em_andamento' | 'finalizada' | 'cancelada';

export interface Reserva {
  id: string;
  hospedeId: string;
  suiteId: string;
  checkIn: string;
  checkOut: string;
  valorDiaria: number;
  valorTotal: number;
  status: StatusReserva;
  observacoes?: string;
  criadoEm: string;
}

export const STATUS_RESERVA_LABEL: Record<StatusReserva, string> = {
  confirmada: 'Vai chegar',
  em_andamento: 'Hospedado agora',
  finalizada: 'Já foi embora',
  cancelada: 'Cancelada',
};

export const STATUS_RESERVA_COR: Record<StatusReserva, string> = {
  confirmada: 'secondary',
  em_andamento: 'primary',
  finalizada: 'medium',
  cancelada: 'danger',
};
