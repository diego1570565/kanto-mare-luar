export interface Suite {
  id: string;
  nome: string;
  tipo: string;
  capacidade: number;
  valorDiaria: number;
  descricao?: string;
  ativo: boolean;
}
