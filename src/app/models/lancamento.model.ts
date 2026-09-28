export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pago' | 'pendente';

/** Receita ou despesa avulsa da pousada (as receitas de hospedagem vêm dos pagamentos das reservas). */
export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  status: StatusLancamento;
  formaPagamento?: string;
  observacoes?: string;
  criadoEm: string;
}

export const CATEGORIA_HOSPEDAGEM = 'Hospedagem';

export const CATEGORIAS_DESPESA = [
  'Limpeza e higiene',
  'Lavanderia',
  'Energia elétrica',
  'Água',
  'Gás',
  'Internet / TV',
  'Café da manhã / alimentação',
  'Funcionários',
  'Manutenção e reparos',
  'Compras e enxoval',
  'Comissões (Booking, Airbnb...)',
  'Marketing e anúncios',
  'Impostos e taxas',
  'Outras despesas',
];

export const CATEGORIAS_RECEITA = ['Consumo / frigobar', 'Passeios', 'Estacionamento', 'Eventos', 'Outras receitas'];

export const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Boleto'];
