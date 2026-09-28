export type StatusPagamento = 'pago' | 'pendente';

export interface Pagamento {
  id: string;
  reservaId: string;
  valor: number;
  data: string;
  status: StatusPagamento;
  formaPagamento?: string;
  observacoes?: string;
}
