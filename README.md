# Criatório Sertori

Sistema de cadastro das aves do criatório: calopsitas, ring necks, agapórnis, roselas, periquitos australianos, red rumps, bourkes e kakarikis, com as cores (mutações) de cada uma, vacinas, nascimentos e backup.

Site: https://criatorio-sertori.pages.dev

## Usuários

- Cada usuário tem a própria conta e **só vê as próprias aves**, vacinas, nascimentos e backups.
- No primeiro acesso, o site pede para criar a conta do **administrador**.
- Depois disso, só o administrador cadastra novos usuários (aba **Usuários**). Ele também pode redefinir a senha de alguém ou excluir um usuário com todos os dados dele.
- Qualquer usuário pode trocar a própria senha pelo botão **Minha senha**.
- As senhas são guardadas com criptografia (PBKDF2), nunca em texto puro. O login dura 30 dias ou até clicar em **Sair**.

## Funções

- **Aves**: cadastro com nome, espécie, cor/mutação, sexo, anilha, registro e idade. Filtro por espécie e sexo e resumo do plantel.
- **Vacinas**: registro de vacinas e medicamentos por ave, com data da próxima dose.
- **Nascimentos**: registro de filhotes por casal (mãe e pai).
- **Backup**: backup automático diário no banco, backup manual, exportação e importação em JSON.

As cores sugeridas para cada espécie ficam no início de `public/app.js` (objeto `ESPECIES`).

## Como funciona

O site roda no **Cloudflare Pages** com o banco **D1** `criatorio-sertori-db`.

- `public/`: as telas (HTML, CSS, JS e logotipo).
- `functions/api/[[rota]].js`: a API (login, usuários, aves, vacinas, nascimentos e backup).
- `schema.sql`: as tabelas do banco.
- `wrangler.toml`: liga o banco D1 ao site (binding `DB`).

Cada `git push` na branch `main` publica o site automaticamente.

## Testar no computador

```bash
npm install
npm run banco:local   # cria o banco local com as tabelas
npm start             # abre em http://localhost:8788
```
