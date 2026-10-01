// Versão online da API (Cloudflare Pages Functions + banco D1).
// Mesmas rotas do server.js; o banco fica no binding "DB" (veja wrangler.toml).

const json = (corpo, status = 200) => Response.json(corpo, { status });
const erro = (mensagem, status) => json({ error: mensagem }, status);
const vazio = (v) => v === undefined || v === null || v === '';
const validarAve = (b) => !vazio(b.nome) && !vazio(b.especie) && !vazio(b.cor) && !vazio(b.sexo) && !vazio(b.idade);

async function exportarTudo(db) {
  const [aves, vacinas, nascimentos] = await db.batch([
    db.prepare('SELECT * FROM aves'),
    db.prepare('SELECT * FROM vacinas'),
    db.prepare('SELECT * FROM nascimentos')
  ]);
  return { aves: aves.results, vacinas: vacinas.results, nascimentos: nascimentos.results };
}

// Backup automático diário: guarda uma cópia dos dados na primeira alteração de cada dia
async function backupDiario(db) {
  const hoje = await db.prepare("SELECT 1 FROM backups WHERE date(criado_em) = date('now') LIMIT 1").first();
  if (!hoje) {
    const dados = await exportarTudo(db);
    await db.prepare('INSERT INTO backups (dados) VALUES (?)').bind(JSON.stringify(dados)).run();
  }
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return erro('Banco de dados D1 não configurado (binding "DB")', 500);

  if (env.SENHA_ACESSO && request.headers.get('x-senha') !== env.SENHA_ACESSO) {
    return erro('Senha incorreta', 401);
  }

  const url = new URL(request.url);
  const [recurso, id] = params.rota || [];
  const metodo = request.method;
  const corpo = metodo === 'POST' || metodo === 'PUT' ? await request.json().catch(() => ({})) : {};

  if (metodo !== 'GET') await backupDiario(db);

  // ==================== AVES ====================
  if (recurso === 'aves') {
    if (metodo === 'GET' && !id) {
      let sql = 'SELECT * FROM aves WHERE 1=1';
      const valores = [];
      for (const campo of ['especie', 'sexo', 'cor']) {
        const valor = url.searchParams.get(campo);
        if (valor) {
          sql += ` AND ${campo} = ?`;
          valores.push(valor);
        }
      }
      const { results } = await db.prepare(sql + ' ORDER BY criado_em DESC, id DESC').bind(...valores).all();
      return json(results);
    }
    if (metodo === 'GET') {
      const ave = await db.prepare('SELECT * FROM aves WHERE id = ?').bind(id).first();
      return ave ? json(ave) : erro('Ave não encontrada', 404);
    }
    if (metodo === 'POST') {
      if (!validarAve(corpo)) return erro('Preencha todos os campos obrigatórios', 400);
      const r = await db.prepare('INSERT INTO aves (nome, especie, cor, sexo, anilha, registro, idade) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(corpo.nome, corpo.especie, corpo.cor, corpo.sexo, corpo.anilha || '', corpo.registro || '', Number(corpo.idade)).run();
      return json({ id: r.meta.last_row_id, message: 'Ave cadastrada com sucesso!' });
    }
    if (metodo === 'PUT') {
      if (!validarAve(corpo)) return erro('Preencha todos os campos obrigatórios', 400);
      const r = await db.prepare(`UPDATE aves SET nome=?, especie=?, cor=?, sexo=?, anilha=?, registro=?, idade=?, atualizado_em=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(corpo.nome, corpo.especie, corpo.cor, corpo.sexo, corpo.anilha || '', corpo.registro || '', Number(corpo.idade), id).run();
      return r.meta.changes ? json({ message: 'Ave atualizada com sucesso!' }) : erro('Ave não encontrada', 404);
    }
    if (metodo === 'DELETE') {
      const r = await db.prepare('DELETE FROM aves WHERE id = ?').bind(id).run();
      return r.meta.changes ? json({ message: 'Ave excluída com sucesso!' }) : erro('Ave não encontrada', 404);
    }
  }

  if (recurso === 'estatisticas' && metodo === 'GET') {
    const [especies, cores, totais] = await db.batch([
      db.prepare('SELECT especie, COUNT(*) as total FROM aves GROUP BY especie ORDER BY total DESC'),
      db.prepare('SELECT especie, cor, COUNT(*) as total FROM aves GROUP BY especie, cor ORDER BY especie, total DESC'),
      db.prepare(`SELECT COUNT(*) as total,
                         SUM(CASE WHEN sexo = 'Macho' THEN 1 ELSE 0 END) as machos,
                         SUM(CASE WHEN sexo = 'Fêmea' THEN 1 ELSE 0 END) as femeas
                  FROM aves`)
    ]);
    const t = totais.results[0];
    return json({ total: t.total, machos: t.machos || 0, femeas: t.femeas || 0, especies: especies.results, cores: cores.results });
  }

  // ==================== VACINAS ====================
  if (recurso === 'vacinas') {
    if (metodo === 'GET') {
      const { results } = await db.prepare(`SELECT v.*, a.nome as ave_nome, a.especie, a.cor
                                            FROM vacinas v LEFT JOIN aves a ON v.ave_id = a.id
                                            ORDER BY v.data_aplicacao DESC`).all();
      return json(results);
    }
    if (metodo === 'POST') {
      if (vazio(corpo.ave_id) || vazio(corpo.nome_vacina) || vazio(corpo.data_aplicacao)) {
        return erro('Preencha ave, vacina e data de aplicação', 400);
      }
      const r = await db.prepare('INSERT INTO vacinas (ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes) VALUES (?, ?, ?, ?, ?)')
        .bind(Number(corpo.ave_id), corpo.nome_vacina, corpo.data_aplicacao, corpo.proxima_dose || '', corpo.observacoes || '').run();
      return json({ id: r.meta.last_row_id, message: 'Vacina registrada!' });
    }
    if (metodo === 'DELETE') {
      const r = await db.prepare('DELETE FROM vacinas WHERE id = ?').bind(id).run();
      return r.meta.changes ? json({ message: 'Vacina excluída!' }) : erro('Vacina não encontrada', 404);
    }
  }

  // ==================== NASCIMENTOS ====================
  if (recurso === 'nascimentos') {
    if (metodo === 'GET') {
      const { results } = await db.prepare(`SELECT n.*,
                                              m.nome as mae_nome, m.especie as mae_especie, m.cor as mae_cor,
                                              p.nome as pai_nome, p.especie as pai_especie, p.cor as pai_cor
                                            FROM nascimentos n
                                            LEFT JOIN aves m ON n.mae_id = m.id
                                            LEFT JOIN aves p ON n.pai_id = p.id
                                            ORDER BY n.data_nascimento DESC`).all();
      return json(results);
    }
    if (metodo === 'POST') {
      if (vazio(corpo.data_nascimento)) return erro('Informe a data do nascimento', 400);
      const r = await db.prepare('INSERT INTO nascimentos (mae_id, pai_id, data_nascimento, quantidade, observacoes) VALUES (?, ?, ?, ?, ?)')
        .bind(vazio(corpo.mae_id) ? null : Number(corpo.mae_id), vazio(corpo.pai_id) ? null : Number(corpo.pai_id),
              corpo.data_nascimento, Number(corpo.quantidade) || 1, corpo.observacoes || '').run();
      return json({ id: r.meta.last_row_id, message: 'Nascimento registrado!' });
    }
    if (metodo === 'DELETE') {
      const r = await db.prepare('DELETE FROM nascimentos WHERE id = ?').bind(id).run();
      return r.meta.changes ? json({ message: 'Nascimento excluído!' }) : erro('Nascimento não encontrado', 404);
    }
  }

  // ==================== BACKUP ====================
  if (recurso === 'backup' && metodo === 'GET') {
    const dados = await exportarTudo(db);
    const r = await db.prepare('INSERT INTO backups (dados) VALUES (?)').bind(JSON.stringify(dados)).run();
    return json({ message: 'Backup criado com sucesso!', arquivo: `backup nº ${r.meta.last_row_id} (guardado no banco)` });
  }

  if (recurso === 'exportar' && metodo === 'GET') {
    return json({ ...(await exportarTudo(db)), exportado_em: new Date().toISOString() });
  }

  if (recurso === 'importar' && metodo === 'POST') {
    const { aves, vacinas, nascimentos } = corpo;
    if (!Array.isArray(aves)) return erro('Dados inválidos', 400);

    // Mantém os ids originais para que vacinas e nascimentos continuem ligados às aves certas
    const comandos = [
      db.prepare('DELETE FROM vacinas'),
      db.prepare('DELETE FROM nascimentos'),
      db.prepare('DELETE FROM aves'),
      ...aves.map(a => db.prepare('INSERT INTO aves (id, nome, especie, cor, sexo, anilha, registro, idade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(a.id ?? null, a.nome, a.especie, a.cor || '', a.sexo, a.anilha || '', a.registro || '', a.idade)),
      ...(Array.isArray(vacinas) ? vacinas : []).map(v => db.prepare('INSERT INTO vacinas (ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes) VALUES (?, ?, ?, ?, ?)')
        .bind(v.ave_id ?? null, v.nome_vacina, v.data_aplicacao, v.proxima_dose || '', v.observacoes || '')),
      ...(Array.isArray(nascimentos) ? nascimentos : []).map(n => db.prepare('INSERT INTO nascimentos (mae_id, pai_id, data_nascimento, quantidade, observacoes) VALUES (?, ?, ?, ?, ?)')
        .bind(n.mae_id ?? null, n.pai_id ?? null, n.data_nascimento, n.quantidade || 1, n.observacoes || ''))
    ];
    await db.batch(comandos); // batch roda tudo numa transação: se algo falhar, nada é apagado
    return json({ message: 'Dados importados com sucesso!' });
  }

  return erro('Rota não encontrada', 404);
}
