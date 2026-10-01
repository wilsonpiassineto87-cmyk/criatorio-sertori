# Criatório Sertori

Sistema de cadastro das aves do criatório: calopsitas, ring necks, agapórnis, roselas, periquitos australianos, red rumps, bourkes e kakarikis, com as cores (mutações) de cada uma, vacinas, nascimentos e backup.

Site: https://criatorio-sertori.pages.dev

## Usuários

- Cada usuário tem a própria conta e **só vê as próprias aves**, vacinas, nascimentos e backups.
- No primeiro acesso, o site pede para criar a conta do **administrador**.
- Depois disso, só o administrador cadastra novos usuários (aba **Usuários**). Ele também pode gerar um link de nova senha para alguém ou excluir um usuário com todos os dados dele.
- Qualquer usuário pode trocar a própria senha pelo botão **Minha senha**.
- As senhas são guardadas com criptografia (PBKDF2), nunca em texto puro. O login dura 30 dias ou até clicar em **Sair**.

### Esqueci a senha

Trocar a senha **nunca apaga** aves, vacinas, nascimentos ou backups.

- Cada usuário tem um **código de recuperação** (ex.: `K7MP-Q2XA-9RT4`), mostrado uma única vez quando a conta é criada. Também dá para gerar um novo em **Minha senha → Código de recuperação**.
- Na tela de entrar, **Esqueci a senha** pede e-mail + código + senha nova. Cada código só funciona uma vez; depois de usar, o site mostra um código novo.
- Se a pessoa perdeu o código, o administrador clica em **Link de nova senha** na aba Usuários e manda o link (por WhatsApp, por exemplo). O link vale 24 horas e uma única vez.
- Ao trocar a senha por esses caminhos, o usuário é desconectado dos outros aparelhos.

## Funções

- **Painel**: resumo do criatório: aves no plantel, filhotes do ano, vendido no mês e no ano, valor a receber, plantel à venda, aves por espécie, vacinas atrasadas e dos próximos 30 dias, faturamento dos últimos 12 meses, vendas por forma de pagamento e por espécie, e as últimas vendas.
- **Vendas**: registro da venda (ave, comprador, telefone, valor, forma de pagamento, situação). A ave sai do plantel; se a venda for cancelada, ela volta. Situações: aguardando pagamento, pago ou cancelada.
- **Pix**: em **Vendas → Meu Pix**, cadastre sua chave. Cada venda por Pix gera o QR Code e o "Pix copia e cola" com o valor, que dá para enviar pelo WhatsApp. O dinheiro cai direto na sua conta, sem taxa. A confirmação é manual: confira no app do banco e clique em **Recebi**. Dinheiro e cartão (maquininha) são só registrados.

- **Aves**: cadastro com nome, espécie, cor/mutação, sexo, anilha, registro, idade e preço de venda (opcional). Filtro por espécie e sexo e resumo do plantel.
- **Vacinas**: registro de vacinas e medicamentos por ave, com data da próxima dose.
- **Nascimentos**: registro de filhotes por casal (mãe e pai).
- **Backup**: backup automático diário no banco, backup manual, exportação e importação em JSON.

As cores sugeridas para cada espécie ficam no início de `public/app.js` (objeto `ESPECIES`).

## Como funciona

O site roda no **Cloudflare Pages** com o banco **D1** `criatorio-sertori-db`.

- `public/`: as telas (HTML, CSS, JS e logotipo). `public/pix.js` gera o código Pix (padrão BR Code do Banco Central) e `public/vendor/qrcode.js` desenha o QR Code.
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
