import { Type } from '@angular/core';
import { ModalController } from '@ionic/angular';

export type ResultadoModal<T = unknown> = { data?: T; role?: string };

/** Abre um formulário em tela cheia e devolve como ele foi fechado ('save', 'delete' ou 'cancel'). */
export async function abrirModal<T = unknown>(
  modalCtrl: ModalController,
  component: Type<unknown>,
  componentProps: Record<string, unknown> = {},
): Promise<ResultadoModal<T>> {
  const modal = await modalCtrl.create({ component, componentProps });
  await modal.present();
  return modal.onWillDismiss<T>();
}

/** true quando o formulário mudou algo e a tela de origem deve recarregar. */
export function houveMudanca(resultado: ResultadoModal): boolean {
  return resultado.role === 'save' || resultado.role === 'delete';
}
