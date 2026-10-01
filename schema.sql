-- Esquema do banco D1 "criatorio-sertori-db".
-- Cada ave, vacina, nascimento e backup pertence a um usuário (usuario_id).

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  senha_salt TEXT NOT NULL,
  admin INTEGER NOT NULL DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Código de recuperação de senha (só o hash)
  codigo_hash TEXT,
  codigo_salt TEXT
);

-- Guarda só o hash do token de login, nunca o token em si
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  expira_em DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);

-- Links de redefinição de senha gerados pelo administrador (só o hash do token)
CREATE TABLE IF NOT EXISTS redefinicoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  expira_em DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS aves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  especie TEXT NOT NULL,
  cor TEXT NOT NULL,
  sexo TEXT NOT NULL,
  anilha TEXT,
  registro TEXT,
  idade REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'plantel', -- 'plantel' ou 'vendida'
  preco REAL,                             -- preço de venda pedido (opcional)
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_aves_usuario ON aves(usuario_id);

CREATE TABLE IF NOT EXISTS vacinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  ave_id INTEGER,
  nome_vacina TEXT NOT NULL,
  data_aplicacao DATE NOT NULL,
  proxima_dose DATE,
  observacoes TEXT
);
CREATE INDEX IF NOT EXISTS idx_vacinas_usuario ON vacinas(usuario_id);

CREATE TABLE IF NOT EXISTS nascimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  mae_id INTEGER,
  pai_id INTEGER,
  data_nascimento DATE NOT NULL,
  quantidade INTEGER DEFAULT 1,
  observacoes TEXT
);
CREATE INDEX IF NOT EXISTS idx_nascimentos_usuario ON nascimentos(usuario_id);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  dia TEXT NOT NULL DEFAULT (date('now')),
  automatico INTEGER NOT NULL DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  dados TEXT NOT NULL
);
-- No máximo um backup automático por usuário por dia
CREATE UNIQUE INDEX IF NOT EXISTS idx_backup_diario ON backups(usuario_id, dia) WHERE automatico = 1;

-- Vendas: guarda nome/espécie/cor da ave para o histórico não depender do cadastro da ave
CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  ave_id INTEGER,
  ave_nome TEXT NOT NULL,
  ave_especie TEXT NOT NULL,
  ave_cor TEXT,
  comprador_nome TEXT,
  comprador_telefone TEXT,
  valor REAL NOT NULL,
  forma_pagamento TEXT NOT NULL,                   -- Pix, Dinheiro, Cartão de crédito, Cartão de débito
  status_pagamento TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago ou cancelada
  data_venda DATE NOT NULL,
  data_pagamento DATE,
  observacoes TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id, data_venda);

-- Dados do Pix de cada usuário, para gerar o QR Code das vendas
CREATE TABLE IF NOT EXISTS config_pix (
  usuario_id INTEGER PRIMARY KEY,
  tipo TEXT NOT NULL,   -- cpf, cnpj, celular, email ou aleatoria
  chave TEXT NOT NULL,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL
);
