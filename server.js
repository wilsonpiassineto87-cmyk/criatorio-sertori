const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== AVES ====================

app.get('/api/aves', (req, res) => {
  const { especie, sexo, cor } = req.query;
  let query = 'SELECT * FROM aves WHERE 1=1';
  const params = [];

  if (especie) {
    query += ' AND especie = ?';
    params.push(especie);
  }
  if (sexo) {
    query += ' AND sexo = ?';
    params.push(sexo);
  }
  if (cor) {
    query += ' AND cor = ?';
    params.push(cor);
  }

  query += ' ORDER BY criado_em DESC, id DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/aves/:id', (req, res) => {
  db.get('SELECT * FROM aves WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Ave não encontrada' });
    res.json(row);
  });
});

app.post('/api/aves', (req, res) => {
  const { nome, especie, cor, sexo, anilha, registro, idade } = req.body;

  if (!nome || !especie || !cor || !sexo || idade === undefined || idade === '') {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  const sql = `INSERT INTO aves (nome, especie, cor, sexo, anilha, registro, idade)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [nome, especie, cor, sexo, anilha || '', registro || '', idade], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Ave cadastrada com sucesso!' });
  });
});

app.put('/api/aves/:id', (req, res) => {
  const { nome, especie, cor, sexo, anilha, registro, idade } = req.body;

  if (!nome || !especie || !cor || !sexo || idade === undefined || idade === '') {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  const sql = `UPDATE aves
               SET nome=?, especie=?, cor=?, sexo=?, anilha=?, registro=?, idade=?, atualizado_em=CURRENT_TIMESTAMP
               WHERE id=?`;

  db.run(sql, [nome, especie, cor, sexo, anilha || '', registro || '', idade, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Ave não encontrada' });
    res.json({ message: 'Ave atualizada com sucesso!' });
  });
});

app.delete('/api/aves/:id', (req, res) => {
  db.run('DELETE FROM aves WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Ave não encontrada' });
    res.json({ message: 'Ave excluída com sucesso!' });
  });
});

app.get('/api/estatisticas', (req, res) => {
  db.all('SELECT especie, COUNT(*) as total FROM aves GROUP BY especie ORDER BY total DESC', (err, especies) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT especie, cor, COUNT(*) as total FROM aves GROUP BY especie, cor ORDER BY especie, total DESC', (err, cores) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(`SELECT COUNT(*) as total,
                     SUM(CASE WHEN sexo = 'Macho' THEN 1 ELSE 0 END) as machos,
                     SUM(CASE WHEN sexo = 'Fêmea' THEN 1 ELSE 0 END) as femeas
              FROM aves`, (err, totais) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          total: totais.total,
          machos: totais.machos || 0,
          femeas: totais.femeas || 0,
          especies,
          cores
        });
      });
    });
  });
});

// ==================== VACINAS ====================

app.get('/api/vacinas', (req, res) => {
  db.all(`SELECT v.*, a.nome as ave_nome, a.especie, a.cor
          FROM vacinas v
          LEFT JOIN aves a ON v.ave_id = a.id
          ORDER BY v.data_aplicacao DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/vacinas', (req, res) => {
  const { ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes } = req.body;

  if (!ave_id || !nome_vacina || !data_aplicacao) {
    return res.status(400).json({ error: 'Preencha ave, vacina e data de aplicação' });
  }

  const sql = `INSERT INTO vacinas (ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes)
               VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [ave_id, nome_vacina, data_aplicacao, proxima_dose || '', observacoes || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Vacina registrada!' });
  });
});

app.delete('/api/vacinas/:id', (req, res) => {
  db.run('DELETE FROM vacinas WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Vacina não encontrada' });
    res.json({ message: 'Vacina excluída!' });
  });
});

// ==================== NASCIMENTOS ====================

app.get('/api/nascimentos', (req, res) => {
  db.all(`SELECT n.*,
          m.nome as mae_nome, m.especie as mae_especie, m.cor as mae_cor,
          p.nome as pai_nome, p.especie as pai_especie, p.cor as pai_cor
          FROM nascimentos n
          LEFT JOIN aves m ON n.mae_id = m.id
          LEFT JOIN aves p ON n.pai_id = p.id
          ORDER BY n.data_nascimento DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/nascimentos', (req, res) => {
  const { mae_id, pai_id, data_nascimento, quantidade, observacoes } = req.body;

  if (!data_nascimento) {
    return res.status(400).json({ error: 'Informe a data do nascimento' });
  }

  const sql = `INSERT INTO nascimentos (mae_id, pai_id, data_nascimento, quantidade, observacoes)
               VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [mae_id || null, pai_id || null, data_nascimento, quantidade || 1, observacoes || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Nascimento registrado!' });
  });
});

app.delete('/api/nascimentos/:id', (req, res) => {
  db.run('DELETE FROM nascimentos WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Nascimento não encontrado' });
    res.json({ message: 'Nascimento excluído!' });
  });
});

// ==================== BACKUP ====================

app.get('/api/backup', (req, res) => {
  const agora = new Date();
  const data = agora.toISOString().split('T')[0];
  const hora = agora.toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupPath = path.join(db.BACKUP_DIR, `criatorio_${data}_${hora}.db`);

  if (!fs.existsSync(db.BACKUP_DIR)) {
    fs.mkdirSync(db.BACKUP_DIR);
  }

  fs.copyFile(db.DB_PATH, backupPath, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Backup criado com sucesso!', arquivo: path.basename(backupPath) });
  });
});

app.get('/api/exportar', (req, res) => {
  db.all('SELECT * FROM aves', (err, aves) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT * FROM vacinas', (err, vacinas) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all('SELECT * FROM nascimentos', (err, nascimentos) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ aves, vacinas, nascimentos, exportado_em: new Date().toISOString() });
      });
    });
  });
});

app.post('/api/importar', (req, res) => {
  const { aves, vacinas, nascimentos } = req.body;

  if (!aves || !Array.isArray(aves)) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('DELETE FROM vacinas');
    db.run('DELETE FROM nascimentos');
    db.run('DELETE FROM aves');

    // Mantém os ids originais para que vacinas e nascimentos continuem ligados às aves certas
    const insertAve = db.prepare('INSERT INTO aves (id, nome, especie, cor, sexo, anilha, registro, idade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    aves.forEach(a => {
      insertAve.run(a.id, a.nome, a.especie, a.cor || '', a.sexo, a.anilha || '', a.registro || '', a.idade);
    });
    insertAve.finalize();

    if (Array.isArray(vacinas)) {
      const insertVacina = db.prepare('INSERT INTO vacinas (ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes) VALUES (?, ?, ?, ?, ?)');
      vacinas.forEach(v => {
        insertVacina.run(v.ave_id, v.nome_vacina, v.data_aplicacao, v.proxima_dose || '', v.observacoes || '');
      });
      insertVacina.finalize();
    }

    if (Array.isArray(nascimentos)) {
      const insertNascimento = db.prepare('INSERT INTO nascimentos (mae_id, pai_id, data_nascimento, quantidade, observacoes) VALUES (?, ?, ?, ?, ?)');
      nascimentos.forEach(n => {
        insertNascimento.run(n.mae_id, n.pai_id, n.data_nascimento, n.quantidade || 1, n.observacoes || '');
      });
      insertNascimento.finalize();
    }

    db.run('COMMIT', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Dados importados com sucesso!' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🦜 Criatório Sertori rodando na porta ${PORT}`);
  console.log(`📁 Banco de dados: ${db.DB_PATH}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
