<div align="center">

<img src="store/feature-graphic.png" alt="App do Pentecostal — Sua Bíblia, sempre por perto" width="100%" />

# App do Pentecostal

**Leia a Bíblia, grife versículos, favorite e anote suas reflexões, sem internet.**

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.6.0-E8590C)

![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-000000?logo=apple&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-0078D4?logo=windows&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)
<br />
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-offline-003B57?logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)

[Funcionalidades](#-funcionalidades) •
[EKS AI](#-eks-ai-assistente-de-pregação) •
[Privacidade](#-privacidade) •
[Para desenvolvedores](#-para-desenvolvedores) •
[Publicando versões](#-publicando-novas-versões)

</div>

---

## 📖 Sobre

O **App do Pentecostal** é a sua Bíblia sempre por perto. Você pode ler, estudar e guardar o que marca a sua caminhada de fé, tudo num único app, simples e leve.

Não tem cadastro nem anúncios, e funciona **100% offline**. Tudo o que você marca fica salvo no seu próprio aparelho. Para quem prega, o app traz o **EKS AI**, um assistente que sugere versículos e monta esboços de pregação.

<div align="center">
<img src="web/assets/screenshots/devices.png" alt="App do Pentecostal aberto num notebook e num celular" width="760" />
</div>

## ✨ Funcionalidades

| | Recurso | O que faz |
|---|---|---|
| 📚 | **Bíblia completa** | Todos os 66 livros, separados em Antigo e Novo Testamento, com navegação rápida entre capítulos |
| 🔎 | **Busca por palavras** | Digite um trecho e encontre o versículo na hora |
| 🖍️ | **Grifos coloridos** | Destaque versículos em amarelo, verde, azul ou rosa |
| ❤️ | **Favoritos** | Guarde os versículos preferidos para reler quando quiser |
| 📝 | **Anotações** | Escreva reflexões ligadas a cada versículo, salvas automaticamente enquanto você digita, com formatação no estilo do bloco de notas do iPhone: negrito, itálico, Título, Cabeçalho, listas, lista de tarefas, citação, cores e tabelas |
| 💡 | **Sugestões de versículos** | No editor de anotações, um toque sugere versículos ligados ao que você escreveu, agrupados por assunto (temas, personagens bíblicos e referências citadas no texto). Com o EKS AI ligado, ele entende o sentido do texto e explica por que cada versículo combina |
| ✨ | **Esboço de pregação (EKS AI)** | Digite o tema e receba um esboço completo: estudo aprofundado do texto base, introdução, pontos com versículos, aplicação, conclusão com apelo e um auxílio para pregar. Um toque insere tudo na anotação |
| ⏱️ | **Cronômetro de pregação** | Tempos prontos para saudação e pregação (5, 15, 30 min ou 1 hora), aviso no último minuto e tela sempre acesa; aparece também dentro das anotações |
| 📺 | **Holyrics** | Conecte ao Holyrics do computador da igreja e projete os versículos da anotação ou um texto livre, com botões de voltar, avançar e fechar |
| 🏠 | **Tela Início** | Saudação do dia, versículo em destaque, atalho para continuar a leitura de onde parou e frases bíblicas curtas animadas |
| ☀️ | **Versículo do dia** | Um versículo de encorajamento novo a cada dia |
| 🔥 | **Sequência de dias** | Acompanhe quantos dias seguidos você abriu a Palavra |
| 🌙 | **Tema escuro** | Leitura confortável à noite, com um toque |
| 📶 | **Funciona sem internet** | A Bíblia inteira vem dentro do app. Sem internet, as sugestões e o esboço funcionam no modo básico |

## 🤖 EKS AI, assistente de pregação

O assistente fica numa gaveta embaixo do editor de anotações, com três abas: **Versículos**, **Esboço** e **IA**. No celular, ela abre em tela cheia para o teclado não cobrir os campos. No tablet, ela divide a tela com a anotação.

**O que vem num esboço:**

1. **Texto base** com o versículo completo, tirado da Bíblia do app
2. **Estudo do texto base**: contexto (quem escreveu, para quem, quando e por quê), palavras-chave no hebraico ou grego e a verdade central do texto
3. **Introdução**, **3 pontos** com explicação e versículos de apoio, **aplicação** e **conclusão com apelo**
4. **Auxílio para pregar**: uma ilustração, frases de impacto e dicas de condução (como começar, onde dar ênfase, tempo de cada parte, como fazer o apelo)

Com **"Escrever no meu estilo"** ligado, o EKS AI lê trechos de até 3 anotações suas para escrever do seu jeito.

**De onde vem a resposta:**

| Modo | Como funciona |
|---|---|
| ☁️ **EKS AI na nuvem** (padrão) | Google Gemini, chamado por uma ponte própria. Se a cota gratuita de um modelo acabar, a ponte passa para o próximo modelo reserva |
| 💻 **Ollama** | IA no seu computador, pela rede de casa ou da igreja. Se estiver configurado, também entra como reserva quando a nuvem não responde |
| 📴 **Modo básico** | Sem internet e sem IA: monta o esboço com os temas e personagens que o app já conhece |

> [!NOTE]
> Os textos dos versículos sempre vêm da Bíblia do app, nunca da IA. Referências que não existem ficam de fora.

## 🔒 Privacidade

- ❌ Não pede cadastro nem login
- ❌ Não exibe anúncios
- ❌ Não usa ferramentas de análise ou rastreamento
- ✅ Favoritos, grifos e anotações ficam **apenas no seu aparelho**
- ✅ A conexão com o Holyrics é opcional e acontece só pela rede local da igreja
- ⚠️ O EKS AI na nuvem é opcional e pede o seu aceite antes do primeiro uso. Só quando você toca para sugerir versículos ou gerar um esboço, o título e o texto da anotação aberta são enviados ao Google Gemini. A ponte não grava o texto.

Leia a [política de privacidade completa](https://erickaocode.github.io/App-do-pentecostal/web/privacidade/).

---

## 🛠️ Para desenvolvedores

### Tecnologias

- **[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)** + **React Native 0.86** + **React 19**, em TypeScript
- **[expo-sqlite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)** com dois bancos:
  - `blivre.db`: o texto bíblico, só leitura, que vai junto com o app
  - `userdata.db`: os dados da pessoa (grifos, favoritos, anotações, preferências e sequência de dias)
- **React Navigation 7**: abas na parte de baixo e pilhas de telas
- **react-native-web**: a mesma base de código roda no navegador
- **Electron**: versão para computador, que reaproveita o build web
- **App web para iPhone (PWA)**: o mesmo build web, publicado no GitHub Pages com service worker para abrir sem internet
- **EAS Build**: gera as builds de Android e iOS na nuvem
- **Cloudflare Worker** (`ai-proxy/`): ponte do EKS AI, que guarda a chave do Gemini fora do app

### Estrutura do projeto

```text
app/
├── App.tsx                # Provedores (Bíblia, dados do usuário, tema, cronômetro, navegação)
├── app.config.js          # baseUrl configurável para o build web (WEB_BASE_URL)
├── src/
│   ├── screens/           # Início, Livros, Leitura, Busca, Anotações, Editor de nota, Favoritos
│   ├── components/        # Menu do versículo, gaveta do EKS AI, esboço, sugestões, cronômetro, Holyrics
│   ├── ai/                # EKS AI: motor (nuvem/Ollama), sugestões e esboço de pregação
│   ├── hooks/             # Teclado (inclusive no app web do iPhone)
│   ├── bible/             # Lista de versões da Bíblia que vão junto com o app
│   ├── context/           # Versão da Bíblia, tema claro/escuro e cronômetro de pregação
│   ├── db/                # Conexão e consultas dos bancos da Bíblia e do usuário
│   ├── data/              # Versículos do dia e frases curtas da tela Início
│   ├── suggest/           # Sugestão de versículos (temas, personagens, referências, vocabulário)
│   ├── holyrics/          # Cliente do API Server do Holyrics
│   ├── navigation/        # Abas, pilhas e tipos de rotas
│   └── utils/             # Datas e avisos/confirmações que funcionam também na web
├── assets/               # Ícones do app (iPhone, Android, abertura) e bible/blivre.db
├── ai-proxy/              # Ponte do EKS AI (Cloudflare Worker)
├── scripts/               # export-pwa.js e modelo do service worker do app web
├── web/
│   ├── webapp/            # Build web do computador (usado pelo app desktop)
│   ├── app/               # App web do iPhone (gerado por npm run export:pwa)
│   ├── landing/           # Página de download
│   ├── site/              # Site oficial com a logo e a abertura animada (sem downloads, com contato)
│   ├── assets/            # Logo, ícone e prints usados nos sites
│   └── privacidade/       # Política de privacidade
├── desktop/               # App Electron (Windows, macOS, Linux)
└── store/                 # Textos e imagens da Play Store e da App Store
```

### Rodando localmente

Pré-requisito: **Node.js** (versão LTS).

```bash
npm install

npm start           # abre o Expo (leia o QR code com o app Expo Go)
npm run android     # emulador ou celular Android
npm run ios         # simulador iOS (só no macOS)
npm run web         # navegador
```

Para conferir os tipos:

```bash
npx tsc --noEmit
```

### Versão para computador

```bash
cd desktop
npm install
npm start           # abre o app Electron em modo de desenvolvimento
```

Mais detalhes em [`desktop/README.md`](desktop/README.md).

---

## 🚀 Publicando novas versões

<details>
<summary><b>📱 Android</b></summary>

1. Aumente o `versionCode` (e, se quiser, o `version`) em `app.json`.
2. Gere a build:

   ```bash
   npm run build:android:apk   # APK para distribuir direto
   npm run build:android:aab   # AAB para a Google Play
   ```

3. Os textos e imagens da loja estão em [`store/play-store.md`](store/play-store.md).

</details>

<details>
<summary><b>🍎 iOS</b></summary>

1. Aumente o `buildNumber` em `app.json`.
2. Gere a build e envie:

   ```bash
   npm run build:ios           # build de produção
   npm run submit:ios          # envia para o App Store Connect
   ```

3. Os textos da loja e o passo a passo estão em [`store/app-store.md`](store/app-store.md).

</details>

<details>
<summary><b>🌐 Web (computador)</b></summary>

```bash
cd desktop
npm run build:web   # exporta o app para web/webapp
```

Faça commit da pasta `web/webapp` atualizada.

</details>

<details>
<summary><b>📲 iPhone (app web)</b></summary>

O iPhone usa um build web separado, publicado no GitHub Pages em `/App-do-pentecostal/web/app`, com service worker para funcionar sem internet.

```bash
npm run export:pwa   # gera web/app com o subcaminho e o service worker
```

Faça commit da pasta `web/app` atualizada. Sem esse passo, quem usa o iPhone continua na versão antiga.

A versão do service worker é calculada pelo conteúdo de todos os arquivos, inclusive os ícones. Assim, qualquer mudança faz o iPhone baixar o app novo.

> [!NOTE]
> O ícone da tela de início do iPhone só muda quando a pessoa remove o atalho e adiciona de novo pelo Safari ("Adicionar à Tela de Início").

</details>

<details>
<summary><b>💻 Desktop (Windows / macOS / Linux)</b></summary>

1. Atualize o build web (passo acima).
2. Aumente o `version` em `desktop/package.json`.
3. Gere o instalador:

   ```bash
   cd desktop
   npm run dist:win    # Windows (.exe)
   npm run dist        # plataforma atual
   ```

4. Crie uma release no GitHub com a tag **`vX.Y.Z`** (ex.: `v1.4.0`) e anexe o instalador do Windows (`.exe`) e o pacote do Linux (`.tar.gz`).

> [!IMPORTANT]
> O app desktop procura atualizações nas releases com tag `v…` que trazem o `.exe` ou o `.tar.gz` (as tags antigas `desktop-v…` também valem). Sem esses arquivos na release, quem já tem o app instalado não é avisado da nova versão.

</details>

<details>
<summary><b>🤖 Ponte do EKS AI</b></summary>

A ponte fica em [`ai-proxy/`](ai-proxy/) e roda num Cloudflare Worker. O modelo principal e os reservas ficam em [`ai-proxy/wrangler.toml`](ai-proxy/wrangler.toml) (`AI_MODEL` e `AI_FALLBACK_MODELS`). A ponte tenta o próximo modelo quando um fica sem cota (429), sobrecarregado (500/503) ou some (404).

```bash
cd ai-proxy
npx wrangler@4 deploy                 # publica a ponte
npx wrangler@4 secret put AI_API_KEY  # troca a chave do Gemini
```

A chave nunca fica no código. Cada aparelho pode fazer até 8 pedidos por minuto.

</details>

<details>
<summary><b>📥 Página de download</b></summary>

Depois de criar a release no GitHub com os arquivos (APK, instalador do Windows e pacote do Linux), atualize os links da nova versão em [`web/landing/index.html`](web/landing/index.html). O site de apresentação ([`web/site`](web/site/index.html)) é só demonstrativo e não tem links de download. Atualize os links só depois que a release existir, para eles não ficarem quebrados.

</details>

---

## 🙏 Créditos

- Texto bíblico: **Bíblia Livre**
- Ícones: [Ionicons](https://ionic.io/ionicons), via `@expo/vector-icons`
- Integração de projeção: [Holyrics](https://holyrics.com.br) (API Server)
- IA do EKS AI: [Google Gemini](https://ai.google.dev), com [Ollama](https://ollama.com) como opção local

<div align="center">

Feito com ❤️ e fé por **[Erickaocode](https://github.com/Erickaocode)**

[Reportar um problema](https://github.com/Erickaocode/App-do-pentecostal/issues)

</div>
