<p align="center">
  <img src="src/assets/icon/icon-192.png" width="96" alt="Ícone Kanto Maré & Luar" />
</p>

<h1 align="center">Kanto Maré &amp; Luar</h1>

<p align="center">
  App de gestão para pousadas: reservas, hóspedes, suítes e caixa.<br />
  Funciona <strong>sem internet</strong> e foi pensado para ser fácil de usar por pessoas mais velhas.
</p>

<p align="center">
  <a href="https://github.com/diego1570565/kanto-mare-luar/releases/latest"><strong>⬇️ Baixar o app para Android (APK)</strong></a>
</p>

---

## O que o app faz

| Tela | Para que serve |
| --- | --- |
| **Início** | Quem chega e quem sai hoje, suítes ocupadas, quanto os hóspedes ainda devem e atalhos grandes para as tarefas do dia. |
| **Reservas** | Anotar hóspede, suíte, dias de chegada e saída, valor e pagamentos. O app não deixa reservar a mesma suíte duas vezes nas mesmas datas. |
| **Consultar vagas** | Escolher as datas e ver na hora quais suítes estão livres, com um botão para reservar direto. |
| **Hóspedes** | Cadastro com telefone, cidade e histórico de hospedagens, botão para chamar no WhatsApp e para fazer uma reserva nova. |
| **Suítes** | Cadastro das suítes com valor da diária e capacidade, mostrando se estão livres ou ocupadas hoje. |
| **Caixa** | Entradas e gastos do mês, contas fixas que se repetem, contas atrasadas, quem ainda deve e planilha para o Excel. Os pagamentos das reservas entram sozinhos. |
| **Ajustes** | Dados da pousada e cópia de segurança dos dados (salvar e recuperar). |

Pensado para quem não tem intimidade com tecnologia: letras grandes, botões com nome escrito (nada escondido em "arrastar"), palavras do dia a dia ("Dia da chegada", "Falta pagar") e confirmação antes de apagar qualquer coisa.

## Onde ficam os dados

Tudo fica guardado **somente no próprio aparelho** (IndexedDB), sem servidor e sem internet. Por isso existe a **cópia de segurança** em *Ajustes*: ela gera um arquivo que pode ser enviado pelo WhatsApp, Drive ou e-mail e recuperado depois em outro aparelho. O app lembra de fazer a cópia quando ela passa de 7 dias.

## Instalar no celular

1. Baixe o arquivo `.apk` na página de [versões](https://github.com/diego1570565/kanto-mare-luar/releases/latest).
2. Toque no arquivo baixado. Se o Android pedir, permita "instalar apps de fontes desconhecidas".
3. Abra o app **Kanto Maré & Luar** e toque em **Entrar**.

Requer Android 7.0 ou mais novo.

## Para desenvolvedores

Feito com [Ionic 9](https://ionicframework.com/) + [Angular 22](https://angular.dev/) (componentes standalone) e [Capacitor 8](https://capacitorjs.com/) para o app Android.

```bash
npm install
npm start                 # abre em http://localhost:4200
npx ng build              # gera a versão web em www/
npx cap sync android      # copia a versão web para o projeto Android
cd android && ./gradlew assembleRelease   # gera o APK
```

Para assinar o APK de release, crie `assinatura/keystore.properties` (fora do git) com `storeFile`, `storePassword`, `keyAlias` e `keyPassword`. Sem esse arquivo, o build de release sai sem assinatura.

Estrutura principal:

```
src/app/
  core/       armazenamento local, utilitários de data, dinheiro e arquivos
  models/     suíte, hóspede, reserva, pagamento e lançamento do caixa
  services/   regras de negócio (disponibilidade, caixa, cópia de segurança)
  pages/      telas do app (entrar, início, reservas, vagas, hóspedes, suítes, caixa, ajustes)
android/      projeto Android gerado pelo Capacitor
resources/    ícone e tela de abertura em alta resolução
```
