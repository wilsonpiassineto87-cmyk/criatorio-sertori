# Criatório Sertori

Sistema de cadastro das aves do criatório: calopsitas, ring necks, agapórnis, roselas, periquitos australianos, red rumps, bourkes e kakarikis, com as cores (mutações) de cada uma, vacinas, nascimentos e backup.

## Como rodar no computador

```bash
npm install
npm start
```

Depois acesse http://localhost:3000

## Funções

- **Aves**: cadastro com nome, espécie, cor/mutação, sexo, anilha, registro e idade. Filtro por espécie e sexo e resumo do plantel.
- **Vacinas**: registro de vacinas e medicamentos por ave, com data da próxima dose.
- **Nascimentos**: registro de filhotes por casal (mãe e pai).
- **Backup**: backup automático diário em `backups/`, backup manual, exportação e importação em JSON.

As cores sugeridas para cada espécie ficam no início de `public/app.js` (objeto `ESPECIES`). Para adicionar uma espécie ou mutação nova, basta editar essa lista. O campo de cor também aceita cores digitadas à mão.

## Versão online (Cloudflare Pages)

A versão online usa o Cloudflare Pages com o banco **D1** `criatorio-sertori-db`, que já foi criado com as tabelas de `schema.sql`.

- `functions/api/[[rota]].js`: a API online (mesmas rotas do `server.js`).
- `wrangler.toml`: liga o banco D1 ao site (binding `DB`) e diz que o site fica na pasta `public`.

Para publicar:

1. No painel do Cloudflare, vá em **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório `criatorio-sertori`.
2. Em **Build settings**, deixe o *Build command* vazio e coloque `public` em *Build output directory*. Clique em **Save and Deploy**.
3. Em **Settings → Variables and Secrets**, adicione a variável `SENHA_ACESSO` (tipo *Secret*) com a senha que você quer usar para entrar no sistema e faça um novo deploy.

Depois disso, cada `git push` na branch `main` atualiza o site automaticamente.

Para testar a versão online no computador: `npx wrangler d1 execute criatorio-sertori-db --local --file schema.sql` e depois `npx wrangler pages dev`.
