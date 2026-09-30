# Ficha da App Store

## Nome do app (até 30 caracteres)

App do Pentecostal

## Subtítulo (até 30 caracteres)

Bíblia, grifos e anotações

## Texto promocional (até 170 caracteres)

Leia a Bíblia sem internet, grife versículos em cores, guarde seus favoritos e escreva anotações. Sem cadastro, sem anúncios.

## Descrição (até 4000 caracteres)

O App do Pentecostal é a sua Bíblia sempre por perto. Leia, estude e guarde o que marca a sua caminhada de fé, tudo em um único app, simples e leve.

RECURSOS

• Bíblia completa: todos os livros e capítulos organizados, com navegação rápida entre capítulos.
• Busca por palavras: digite um trecho e encontre na hora o versículo que você procura.
• Grifos coloridos: destaque versículos em amarelo, verde, azul ou rosa.
• Favoritos: guarde os versículos preferidos para reler quando quiser.
• Anotações: escreva reflexões pessoais ligadas a cada versículo, organizadas por data.
• Funciona sem internet: tudo fica salvo no seu próprio iPhone.

PRIVACIDADE

O app não pede cadastro, não exibe anúncios e não coleta nenhum dado pessoal. Seus favoritos, grifos e anotações ficam apenas no seu aparelho.

Texto bíblico: Bíblia Livre.

## Palavras-chave (até 100 caracteres, separadas por vírgula)

biblia,bíblia,salmos,versículo,devocional,evangélico,igreja,estudo bíblico,cristão,oração,fé

Não repita palavras do nome do app: a App Store já indexa o nome.

## Categoria

- Principal: Referência
- Secundária: Livros

## URLs

- Política de privacidade: https://erickaocode.github.io/App-do-pentecostal/web/privacidade/
- Suporte (obrigatório): https://github.com/Erickaocode/App-do-pentecostal/issues

## Respostas para o App Store Connect

- **Privacidade do app:** "Dados não coletados".
- **Criptografia:** o app não usa criptografia própria. Já está declarado no `app.json` (`ITSAppUsesNonExemptEncryption: false`).
- **Classificação etária:** responda "Não" para todos os itens do questionário. O resultado esperado é 4+.
- **Acesso ao app:** todas as funções ficam disponíveis sem login, então não é preciso informar conta de teste.
- **Direitos de conteúdo:** o app usa o texto da Bíblia Livre, que tem licença livre.

## Imagens necessárias

- Ícone 1024×1024 sem transparência: `assets/icon.png` (o EAS já envia junto com o build).
- De 1 a 10 capturas de tela de iPhone 6,9" (1320×2868) ou 6,5" (1284×2778), em retrato.
- Não precisa de capturas de iPad: o app está com `supportsTablet: false`.

## Passo a passo para publicar

1. Assine o Apple Developer Program (US$ 99 por ano) em https://developer.apple.com/programs/.
2. Opcional: teste no simulador com `npm run build:ios:simulator` (não precisa de conta paga).
3. Gere o build da loja com `npm run build:ios`. O EAS pede o login da Apple e cria os certificados e o provisioning profile.
4. Crie o app no App Store Connect com o bundle ID `com.erickaocode.appdopentecostal`.
5. Envie o build com `npm run submit:ios`.
6. Preencha a ficha com os textos acima, anexe as capturas de tela e envie para revisão.
