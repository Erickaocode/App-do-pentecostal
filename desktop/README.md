# App do Pentecostal — versão para PC

Este é o mesmo app (Bíblia, anotações e favoritos) empacotado como programa de
computador com Electron, reaproveitando o build web já existente em
`../web/webapp`.

## Rodar em modo de desenvolvimento

```bash
npm install
npm start
```

## Atualizar o conteúdo do app (opcional)

Se o app React Native mudou, gere um novo build web antes de empacotar:

```bash
npm run build:web
```

## Gerar o instalador

```bash
npm install
npm run dist:win   # gera o instalador .exe (NSIS) em desktop/release
```

Também é possível rodar `npm run dist` para gerar o build padrão da
plataforma atual (Windows, macOS ou Linux).
