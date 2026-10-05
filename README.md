# Criadouro Sertori

Sistema de cadastro das aves do criatório: calopsitas, ring necks, agapórnis, roselas, periquitos australianos, red rumps, bourkes e kakarikis, com as cores (mutações) de cada uma, vacinas, nascimentos e backup.

Site: https://criatorio-sertori.pages.dev

## Usuários

- Cada usuário tem a própria conta e **só vê as próprias aves**, vacinas, nascimentos e backups.
- No primeiro acesso, o site pede para criar a conta do **administrador**.
- Depois disso, só o administrador cadastra novos usuários (aba **Usuários**). Ele também pode gerar um link de nova senha para alguém ou excluir um usuário com todos os dados dele.
- Qualquer usuário pode trocar a própria senha pelo botão **Minha senha**.
- As senhas são guardadas com criptografia (PBKDF2), nunca em texto puro. O login dura 30 dias ou até clicar em **Sair**.
- **Limite de tentativas:** depois de 5 erros seguidos de senha (ou de código de recuperação) no mesmo e-mail, novas tentativas ficam bloqueadas por 15 minutos. Um mesmo aparelho/rede também é bloqueado após 30 erros. Acertar a senha zera a contagem, e o "Esqueci a senha" continua funcionando.
- **Proteção do navegador:** `public/_headers` impede que o site seja aberto dentro de outro site e bloqueia scripts de fora.

### Esqueci a senha

Trocar a senha **nunca apaga** aves, vacinas, nascimentos ou backups.

- Cada usuário tem um **código de recuperação** (ex.: `K7MP-Q2XA-9RT4`), mostrado uma única vez quando a conta é criada. Também dá para gerar um novo em **Minha senha → Código de recuperação**.
- Na tela de entrar, **Esqueci a senha** pede e-mail + código + senha nova. Cada código só funciona uma vez; depois de usar, o site mostra um código novo.
- Se a pessoa perdeu o código, o administrador clica em **Link de nova senha** na aba Usuários e manda o link (por WhatsApp, por exemplo). O link vale 24 horas e uma única vez.
- Ao trocar a senha por esses caminhos, o usuário é desconectado dos outros aparelhos.

## Funções

- **Painel**: resumo do criatório: aves no plantel, filhotes do ano, vendido no mês e no ano, valor a receber, plantel à venda, aves por espécie, vacinas atrasadas e dos próximos 30 dias, faturamento dos últimos 12 meses, vendas por forma de pagamento e por espécie, e as últimas vendas.
- **Vendas**: registro da venda (ave, comprador, telefone, valor, forma de pagamento, situação). A ave sai do plantel; se a venda for cancelada, ela volta. Situações: aguardando pagamento, pago ou cancelada.
  - **Excluir** uma venda pergunta o que fazer com a ave: devolver ao plantel ou excluir a ave junto. Venda cancelada é só apagada do histórico.
  - **Excluir canceladas** apaga de uma vez todas as vendas canceladas do histórico.
- **Pix**: em **Vendas → Meu Pix**, cadastre sua chave. Cada venda por Pix gera o QR Code e o "Pix copia e cola" com o valor, que dá para enviar pelo WhatsApp. O dinheiro cai direto na sua conta, sem taxa. A confirmação é manual: confira no app do banco e clique em **Recebi**. Dinheiro e cartão (maquininha) são só registrados.

- **Aves**: cadastro com nome, espécie, cor/mutação, sexo, anilha, registro, idade e preço de venda (opcional). Filtro por situação (no plantel, vendidas ou todas), espécie e sexo e resumo do plantel. Aves vendidas também podem ser editadas ou excluídas (a venda continua no histórico).
- **Espécies**: na aba Aves, dá para excluir uma espécie da lista (só se não houver aves dela no plantel), restaurar uma espécie excluída e adicionar espécies novas. Cada usuário tem a própria lista.
- **Vacinas**: registro de vacinas e medicamentos por ave, com data da próxima dose.
- **Nascimentos**: registro de filhotes por casal (mãe e pai).
- **Backup**: backup automático diário no banco, backup manual, exportação e importação em JSON.

As espécies padrão e as cores sugeridas para cada uma ficam no início de `public/app.js` (objeto `ESPECIES`). As espécies excluídas ou adicionadas por cada usuário ficam na tabela `especies_usuario`.

## Como funciona

O site roda no **Cloudflare Pages** com o banco **D1** `criatorio-sertori-db`.

- `public/`: as telas (HTML, CSS, JS e logotipo). O logotipo está em `logo.webp`/`logo.png` (fundo transparente) e os ícones em `favicon-48.png`, `icone-192.png`, `icone-512.png` e `apple-touch-icon.png`. As cores da identidade visual ficam no início de `public/style.css`. `public/pix.js` gera o código Pix (padrão BR Code do Banco Central) e `public/vendor/qrcode.js` desenha o QR Code.
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
