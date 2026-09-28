export interface PousadaConfig {
  nome: string;
  endereco?: string;
  telefone?: string;
}

export const POUSADA_CONFIG_PADRAO: PousadaConfig = {
  nome: 'Kanto Maré & Luar',
  endereco: '',
  telefone: '',
};
