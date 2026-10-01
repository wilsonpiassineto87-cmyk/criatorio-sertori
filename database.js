const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(__dirname, 'criatorio.db');

// Cria pasta de backups se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

const db = new sqlite3.Database(DB_PATH);

// Criar tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS aves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    especie TEXT NOT NULL,
    cor TEXT NOT NULL,
    sexo TEXT NOT NULL,
    anilha TEXT,
    registro TEXT,
    idade REAL NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vacinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ave_id INTEGER,
    nome_vacina TEXT NOT NULL,
    data_aplicacao DATE NOT NULL,
    proxima_dose DATE,
    observacoes TEXT,
    FOREIGN KEY (ave_id) REFERENCES aves(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS nascimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mae_id INTEGER,
    pai_id INTEGER,
    data_nascimento DATE NOT NULL,
    quantidade INTEGER DEFAULT 1,
    observacoes TEXT,
    FOREIGN KEY (mae_id) REFERENCES aves(id),
    FOREIGN KEY (pai_id) REFERENCES aves(id)
  )`);
});

// Backup automático diário
function fazerBackup() {
  if (!fs.existsSync(DB_PATH)) return;
  const data = new Date().toISOString().split('T')[0];
  const backupPath = path.join(BACKUP_DIR, `criatorio_${data}.db`);

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Backup criado: ${backupPath}`);
  }
}

// Fazer backup a cada 24h
setInterval(fazerBackup, 24 * 60 * 60 * 1000);
fazerBackup(); // Primeiro backup imediato

db.DB_PATH = DB_PATH;
db.BACKUP_DIR = BACKUP_DIR;

module.exports = db;
