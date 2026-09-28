import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Entrega um arquivo gerado pelo app para a pessoa guardar.
 * - No navegador: baixa o arquivo.
 * - No celular (APK): o WebView não baixa arquivos, então salva no aparelho e abre o
 *   "Compartilhar" do Android (WhatsApp, Drive, e-mail...).
 * Devolve false se a pessoa fechou o compartilhamento sem escolher nada.
 */
export async function entregarArquivo(nome: string, conteudo: string, tipo: string, titulo: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  const { uri } = await Filesystem.writeFile({
    path: nome,
    data: conteudo,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: titulo, text: titulo, files: [uri], dialogTitle: 'Onde quer guardar?' });
    return true;
  } catch {
    // A pessoa fechou a janela de compartilhar.
    return false;
  }
}
