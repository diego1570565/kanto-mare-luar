const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor || 0);
}

/** Recebe uma data no formato ISO (yyyy-MM-dd ou com horário) e devolve dd/MM/yyyy. */
export function formatarData(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarPeriodo(checkIn: string, checkOut: string): string {
  return `${formatarData(checkIn)} → ${formatarData(checkOut)}`;
}

/** Data local (não UTC) no formato yyyy-MM-dd. */
export function dataISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function hojeISO(): string {
  return dataISO(new Date());
}

export function diasEntre(checkIn: string, checkOut: string): number {
  const inicio = new Date(checkIn + 'T00:00:00');
  const fim = new Date(checkOut + 'T00:00:00');
  const diff = fim.getTime() - inicio.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}
