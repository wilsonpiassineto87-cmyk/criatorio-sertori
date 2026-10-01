// API do Criatório Sertori (Cloudflare Pages Functions + banco D1).
// O banco fica no binding "DB" (veja wrangler.toml) e as tabelas em schema.sql.
// Cada usuário só enxerga os próprios registros (coluna usuario_id).

const DIAS_SESSAO = 30;
const HORAS_LINK_REDEFINICAO = 24;
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I para não confundir
const ITERACOES_PBKDF2 = 100000; // máximo aceito pelo Cloudflare Workers

const json = (corpo, status = 200, headers = {}) => Response.json(corpo, { status, headers });
const erro = (mensagem, status) => json({ error: mensagem }, status);
const vazio = (v) => v === undefined || v === null || v === '';
const validarAve = (b) => !vazio(b.nome) && !vazio(b.especie) && !vazio(b.cor) && !vazio(b.sexo) && !vazio(b.idade);
const emailValido = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ==================== SENHAS E SESSÕES ====================

const paraHex = (buffer) => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
const deHex = (hex) => new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)));

async function hashSenha(senha, saltHex) {
  const salt = saltHex ? deHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERACOES_PBKDF2 }, chave, 256);
  return { hash: paraHex(bits), salt: paraHex(salt) };
}

function iguais(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

async function sha256(texto) {
  return paraHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

function lerCookie(request, nome) {
  const cookies = request.headers.get('Cookie') || '';
  const par = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(nome + '='));
  return par ? decodeURIComponent(par.slice(nome.length + 1)) : null;
}

function cookieSessao(token, maxAge) {
  return `sessao=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

async function criarSessao(db, usuarioId) {
  const token = paraHex(crypto.getRandomValues(new Uint8Array(32)));
  await db.batch([
    db.prepare("DELETE FROM sessoes WHERE expira_em < datetime('now')"),
    db.prepare(`INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, datetime('now', '+${DIAS_SESSAO} days'))`)
      .bind(await sha256(token), usuarioId)
  ]);
  return cookieSessao(token, DIAS_SESSAO * 24 * 60 * 60);
}

async function usuarioLogado(request, db) {
  const token = lerCookie(request, 'sessao');
  if (!token) return null;
  return db.prepare(`SELECT u.id, u.nome, u.email, u.admin, (u.codigo_hash IS NOT NULL) as tem_codigo
                     FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
                     WHERE s.token_hash = ? AND s.expira_em > datetime('now')`).bind(await sha256(token)).first();
}

function validarNovoUsuario(corpo) {
  if (vazio(corpo.nome) || !emailValido(corpo.email)) return 'Informe nome e um e-mail válido';
  if (typeof corpo.senha !== 'string' || corpo.senha.length < 6) return 'A senha precisa ter pelo menos 6 caracteres';
  return null;
}

async function inserirUsuario(db, corpo, admin, soSeVazio = false) {
  const { hash, salt } = await hashSenha(corpo.senha);
  const valores = [String(corpo.nome).trim(), corpo.email.trim().toLowerCase(), hash, salt, admin ? 1 : 0];
  // soSeVazio: só cria se ainda não existir nenhum usuário (primeiro administrador)
  const sql = soSeVazio
    ? 'INSERT INTO usuarios (nome, email, senha_hash, senha_salt, admin) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM usuarios)'
    : 'INSERT INTO usuarios (nome, email, senha_hash, senha_salt, admin) VALUES (?, ?, ?, ?, ?)';
  try {
    const r = await db.prepare(sql).bind(...valores).run();
    return r.meta.changes ? r.meta.last_row_id : null;
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw Object.assign(new Error('Este e-mail já está cadastrado'), { status: 409 });
    throw e;
  }
}

// ==================== RECUPERAÇÃO DE SENHA ====================

const senhaValida = (senha) => typeof senha === 'string' && senha.length >= 6;
const normalizarCodigo = (codigo) => String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function gerarCodigo() {
  const letras = [...crypto.getRandomValues(new Uint8Array(12))].map(b => ALFABETO_CODIGO[b % 32]).join('');
  return `${letras.slice(0, 4)}-${letras.slice(4, 8)}-${letras.slice(8)}`;
}

// Gera um código de recuperação novo (o antigo deixa de valer). Só o hash fica no banco.
async function novoCodigo(db, uid) {
  const codigo = gerarCodigo();
  const { hash, salt } = await hashSenha(normalizarCodigo(codigo));
  await db.prepare('UPDATE usuarios SET codigo_hash = ?, codigo_salt = ? WHERE id = ?').bind(hash, salt, uid).run();
  return codigo;
}

// Troca a senha e desconecta o usuário de todos os aparelhos. Aves e demais dados não mudam.
async function definirSenha(db, uid, senha) {
  const { hash, salt } = await hashSenha(senha);
  await db.batch([
    db.prepare('UPDATE usuarios SET senha_hash = ?, senha_salt = ? WHERE id = ?').bind(hash, salt, uid),
    db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(uid),
    db.prepare('DELETE FROM redefinicoes WHERE usuario_id = ?').bind(uid)
  ]);
}

// ==================== DADOS DO USUÁRIO ====================

async function exportarTudo(db, uid) {
  const [aves, vacinas, nascimentos] = await db.batch([
    db.prepare('SELECT id, nome, especie, cor, sexo, anilha, registro, idade, criado_em, atualizado_em FROM aves WHERE usuario_id = ?').bind(uid),
    db.prepare('SELECT id, ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes FROM vacinas WHERE usuario_id = ?').bind(uid),
    db.prepare('SELECT id, mae_id, pai_id, data_nascimento, quantidade, observacoes FROM nascimentos WHERE usuario_id = ?').bind(uid)
  ]);
  return { aves: aves.results, vacinas: vacinas.results, nascimentos: nascimentos.results };
}

// Backup automático diário: uma cópia por usuário na primeira alteração de cada dia
async function backupDiario(db, uid) {
  const jaTem = await db.prepare("SELECT 1 FROM backups WHERE usuario_id = ? AND automatico = 1 AND dia = date('now')").bind(uid).first();
  if (jaTem) return;
  const dados = JSON.stringify(await exportarTudo(db, uid));
  // O índice único impede duplicatas quando chegam vários pedidos ao mesmo tempo
  await db.prepare("INSERT OR IGNORE INTO backups (usuario_id, dia, automatico, dados) VALUES (?, date('now'), 1, ?)").bind(uid, dados).run();
}

async function aveDoUsuario(db, aveId, uid) {
  if (vazio(aveId)) return true;
  return !!(await db.prepare('SELECT 1 FROM aves WHERE id = ? AND usuario_id = ?').bind(Number(aveId), uid).first());
}

// ==================== ROTAS ====================

export async function onRequest({ request, env, params }) {
  try {
    return await rotear(request, env, params);
  } catch (e) {
    return erro(e.status ? e.message : 'Erro interno: ' + e.message, e.status || 500);
  }
}

async function rotear(request, env, params) {
  const db = env.DB;
  if (!db) return erro('Banco de dados D1 não configurado (binding "DB")', 500);

  const url = new URL(request.url);
  const [recurso, id, extra] = params.rota || [];
  const metodo = request.method;
  const corpo = metodo === 'POST' || metodo === 'PUT' ? await request.json().catch(() => ({})) : {};

  // ---------- Autenticação (não exige login) ----------
  if (recurso === 'auth') {
    if (id === 'estado' && metodo === 'GET') {
      const usuario = await usuarioLogado(request, db);
      const temUsuarios = await db.prepare('SELECT 1 FROM usuarios LIMIT 1').first();
      return json({ usuario, precisaAdmin: !temUsuarios });
    }

    if (id === 'primeiro-admin' && metodo === 'POST') {
      const problema = validarNovoUsuario(corpo);
      if (problema) return erro(problema, 400);
      const novoId = await inserirUsuario(db, corpo, true, true);
      if (!novoId) return erro('O administrador já foi criado. Peça a ele para cadastrar você.', 403);
      const codigo = await novoCodigo(db, novoId);
      return json({ message: 'Administrador criado!', codigo }, 200, { 'Set-Cookie': await criarSessao(db, novoId) });
    }

    // Esqueci a senha: e-mail + código de recuperação + senha nova
    if (id === 'recuperar' && metodo === 'POST') {
      if (!senhaValida(corpo.nova_senha)) return erro('A nova senha precisa ter pelo menos 6 caracteres', 400);
      const email = String(corpo.email || '').trim().toLowerCase();
      const u = await db.prepare('SELECT id, codigo_hash, codigo_salt FROM usuarios WHERE email = ?').bind(email).first();
      const temCodigo = u && u.codigo_hash;
      // Calcula o hash mesmo sem usuário/código, para não revelar pelo tempo de resposta quais e-mails existem
      const { hash } = await hashSenha(normalizarCodigo(corpo.codigo), temCodigo ? u.codigo_salt : '00'.repeat(16));
      if (!temCodigo || !iguais(hash, u.codigo_hash)) {
        return erro('E-mail ou código de recuperação incorretos. Se perdeu o código, peça ao administrador um link de redefinição.', 400);
      }
      await definirSenha(db, u.id, corpo.nova_senha);
      const codigo = await novoCodigo(db, u.id); // cada código só serve uma vez
      return json({ message: 'Senha alterada! Anote seu novo código de recuperação.', codigo }, 200,
                  { 'Set-Cookie': await criarSessao(db, u.id) });
    }

    // Link de redefinição gerado pelo administrador
    if (id === 'redefinir' && metodo === 'POST') {
      if (!senhaValida(corpo.nova_senha)) return erro('A nova senha precisa ter pelo menos 6 caracteres', 400);
      const pedido = await db.prepare("SELECT usuario_id FROM redefinicoes WHERE token_hash = ? AND expira_em > datetime('now')")
        .bind(await sha256(String(corpo.token || ''))).first();
      if (!pedido) return erro('Este link de redefinição é inválido ou já expirou. Peça um novo ao administrador.', 400);
      await definirSenha(db, pedido.usuario_id, corpo.nova_senha);
      const codigo = await novoCodigo(db, pedido.usuario_id);
      return json({ message: 'Senha criada! Anote seu novo código de recuperação.', codigo }, 200,
                  { 'Set-Cookie': await criarSessao(db, pedido.usuario_id) });
    }

    if (id === 'entrar' && metodo === 'POST') {
      const email = String(corpo.email || '').trim().toLowerCase();
      const u = await db.prepare('SELECT id, senha_hash, senha_salt FROM usuarios WHERE email = ?').bind(email).first();
      // Calcula o hash mesmo sem usuário, para não revelar quais e-mails existem pelo tempo de resposta
      const { hash } = await hashSenha(String(corpo.senha || ''), u ? u.senha_salt : '00'.repeat(16));
      if (!u || !iguais(hash, u.senha_hash)) return erro('E-mail ou senha incorretos', 401);
      return json({ message: 'Bem-vindo!' }, 200, { 'Set-Cookie': await criarSessao(db, u.id) });
    }

    if (id === 'sair' && metodo === 'POST') {
      const token = lerCookie(request, 'sessao');
      if (token) await db.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(token)).run();
      return json({ message: 'Até logo!' }, 200, { 'Set-Cookie': cookieSessao('', 0) });
    }
  }

  // ---------- Daqui para baixo, só com login ----------
  const usuario = await usuarioLogado(request, db);
  if (!usuario) return erro('Faça login para continuar', 401);
  const uid = usuario.id;

  if (recurso === 'auth' && id === 'trocar-senha' && metodo === 'POST') {
    const u = await db.prepare('SELECT senha_hash, senha_salt FROM usuarios WHERE id = ?').bind(uid).first();
    const { hash } = await hashSenha(String(corpo.senha_atual || ''), u.senha_salt);
    if (!iguais(hash, u.senha_hash)) return erro('Senha atual incorreta', 400);
    if (typeof corpo.nova_senha !== 'string' || corpo.nova_senha.length < 6) return erro('A nova senha precisa ter pelo menos 6 caracteres', 400);
    const nova = await hashSenha(corpo.nova_senha);
    await db.prepare('UPDATE usuarios SET senha_hash = ?, senha_salt = ? WHERE id = ?').bind(nova.hash, nova.salt, uid).run();
    return json({ message: 'Senha alterada!' });
  }

  // Gera um novo código de recuperação (pede a senha atual por segurança)
  if (recurso === 'auth' && id === 'novo-codigo' && metodo === 'POST') {
    const u = await db.prepare('SELECT senha_hash, senha_salt FROM usuarios WHERE id = ?').bind(uid).first();
    const { hash } = await hashSenha(String(corpo.senha_atual || ''), u.senha_salt);
    if (!iguais(hash, u.senha_hash)) return erro('Senha atual incorreta', 400);
    return json({ message: 'Novo código gerado! O anterior não vale mais.', codigo: await novoCodigo(db, uid) });
  }

  if (metodo !== 'GET') await backupDiario(db, uid);

  // ==================== USUÁRIOS (só administrador) ====================
  if (recurso === 'usuarios') {
    if (!usuario.admin) return erro('Apenas o administrador pode gerenciar usuários', 403);

    if (metodo === 'GET') {
      const { results } = await db.prepare(`SELECT u.id, u.nome, u.email, u.admin, u.criado_em,
                                              (SELECT COUNT(*) FROM aves a WHERE a.usuario_id = u.id) as total_aves
                                            FROM usuarios u ORDER BY u.nome`).all();
      return json(results);
    }
    if (metodo === 'POST' && !id) {
      const problema = validarNovoUsuario(corpo);
      if (problema) return erro(problema, 400);
      const novoId = await inserirUsuario(db, corpo, !!corpo.admin);
      const codigo = await novoCodigo(db, novoId);
      return json({ id: novoId, codigo, message: 'Usuário cadastrado!' });
    }
    // Link para o usuário criar uma senha nova (vale 24 horas e uma única vez)
    if (metodo === 'POST' && id && extra === 'link-senha') {
      const alvo = await db.prepare('SELECT id FROM usuarios WHERE id = ?').bind(Number(id)).first();
      if (!alvo) return erro('Usuário não encontrado', 404);
      const token = paraHex(crypto.getRandomValues(new Uint8Array(32)));
      await db.batch([
        db.prepare("DELETE FROM redefinicoes WHERE usuario_id = ? OR expira_em < datetime('now')").bind(alvo.id),
        db.prepare(`INSERT INTO redefinicoes (token_hash, usuario_id, expira_em) VALUES (?, ?, datetime('now', '+${HORAS_LINK_REDEFINICAO} hours'))`)
          .bind(await sha256(token), alvo.id)
      ]);
      return json({ link: `${url.origin}/#redefinir=${token}`, horas: HORAS_LINK_REDEFINICAO });
    }
    if (metodo === 'DELETE' && id) {
      if (Number(id) === uid) return erro('Você não pode excluir a própria conta', 400);
      const alvo = Number(id);
      const [, , , , , , apagado] = await db.batch([
        db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(alvo),
        db.prepare('DELETE FROM redefinicoes WHERE usuario_id = ?').bind(alvo),
        db.prepare('DELETE FROM vacinas WHERE usuario_id = ?').bind(alvo),
        db.prepare('DELETE FROM nascimentos WHERE usuario_id = ?').bind(alvo),
        db.prepare('DELETE FROM aves WHERE usuario_id = ?').bind(alvo),
        db.prepare('DELETE FROM backups WHERE usuario_id = ?').bind(alvo),
        db.prepare('DELETE FROM usuarios WHERE id = ?').bind(alvo)
      ]);
      return apagado.meta.changes ? json({ message: 'Usuário e seus dados excluídos!' }) : erro('Usuário não encontrado', 404);
    }
  }

  // ==================== AVES ====================
  if (recurso === 'aves') {
    if (metodo === 'GET' && !id) {
      let sql = 'SELECT * FROM aves WHERE usuario_id = ?';
      const valores = [uid];
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
      const ave = await db.prepare('SELECT * FROM aves WHERE id = ? AND usuario_id = ?').bind(id, uid).first();
      return ave ? json(ave) : erro('Ave não encontrada', 404);
    }
    if (metodo === 'POST') {
      if (!validarAve(corpo)) return erro('Preencha todos os campos obrigatórios', 400);
      const r = await db.prepare('INSERT INTO aves (usuario_id, nome, especie, cor, sexo, anilha, registro, idade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(uid, corpo.nome, corpo.especie, corpo.cor, corpo.sexo, corpo.anilha || '', corpo.registro || '', Number(corpo.idade)).run();
      return json({ id: r.meta.last_row_id, message: 'Ave cadastrada com sucesso!' });
    }
    if (metodo === 'PUT') {
      if (!validarAve(corpo)) return erro('Preencha todos os campos obrigatórios', 400);
      const r = await db.prepare(`UPDATE aves SET nome=?, especie=?, cor=?, sexo=?, anilha=?, registro=?, idade=?, atualizado_em=CURRENT_TIMESTAMP
                                  WHERE id=? AND usuario_id=?`)
        .bind(corpo.nome, corpo.especie, corpo.cor, corpo.sexo, corpo.anilha || '', corpo.registro || '', Number(corpo.idade), id, uid).run();
      return r.meta.changes ? json({ message: 'Ave atualizada com sucesso!' }) : erro('Ave não encontrada', 404);
    }
    if (metodo === 'DELETE') {
      const r = await db.prepare('DELETE FROM aves WHERE id = ? AND usuario_id = ?').bind(id, uid).run();
      return r.meta.changes ? json({ message: 'Ave excluída com sucesso!' }) : erro('Ave não encontrada', 404);
    }
  }

  if (recurso === 'estatisticas' && metodo === 'GET') {
    const [especies, cores, totais] = await db.batch([
      db.prepare('SELECT especie, COUNT(*) as total FROM aves WHERE usuario_id = ? GROUP BY especie ORDER BY total DESC').bind(uid),
      db.prepare('SELECT especie, cor, COUNT(*) as total FROM aves WHERE usuario_id = ? GROUP BY especie, cor ORDER BY especie, total DESC').bind(uid),
      db.prepare(`SELECT COUNT(*) as total,
                         SUM(CASE WHEN sexo = 'Macho' THEN 1 ELSE 0 END) as machos,
                         SUM(CASE WHEN sexo = 'Fêmea' THEN 1 ELSE 0 END) as femeas
                  FROM aves WHERE usuario_id = ?`).bind(uid)
    ]);
    const t = totais.results[0];
    return json({ total: t.total, machos: t.machos || 0, femeas: t.femeas || 0, especies: especies.results, cores: cores.results });
  }

  // ==================== VACINAS ====================
  if (recurso === 'vacinas') {
    if (metodo === 'GET') {
      const { results } = await db.prepare(`SELECT v.*, a.nome as ave_nome, a.especie, a.cor
                                            FROM vacinas v LEFT JOIN aves a ON v.ave_id = a.id AND a.usuario_id = v.usuario_id
                                            WHERE v.usuario_id = ?
                                            ORDER BY v.data_aplicacao DESC`).bind(uid).all();
      return json(results);
    }
    if (metodo === 'POST') {
      if (vazio(corpo.ave_id) || vazio(corpo.nome_vacina) || vazio(corpo.data_aplicacao)) {
        return erro('Preencha ave, vacina e data de aplicação', 400);
      }
      if (!(await aveDoUsuario(db, corpo.ave_id, uid))) return erro('Ave não encontrada', 404);
      const r = await db.prepare('INSERT INTO vacinas (usuario_id, ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(uid, Number(corpo.ave_id), corpo.nome_vacina, corpo.data_aplicacao, corpo.proxima_dose || '', corpo.observacoes || '').run();
      return json({ id: r.meta.last_row_id, message: 'Vacina registrada!' });
    }
    if (metodo === 'DELETE') {
      const r = await db.prepare('DELETE FROM vacinas WHERE id = ? AND usuario_id = ?').bind(id, uid).run();
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
                                            LEFT JOIN aves m ON n.mae_id = m.id AND m.usuario_id = n.usuario_id
                                            LEFT JOIN aves p ON n.pai_id = p.id AND p.usuario_id = n.usuario_id
                                            WHERE n.usuario_id = ?
                                            ORDER BY n.data_nascimento DESC`).bind(uid).all();
      return json(results);
    }
    if (metodo === 'POST') {
      if (vazio(corpo.data_nascimento)) return erro('Informe a data do nascimento', 400);
      if (!(await aveDoUsuario(db, corpo.mae_id, uid)) || !(await aveDoUsuario(db, corpo.pai_id, uid))) {
        return erro('Ave não encontrada', 404);
      }
      const r = await db.prepare('INSERT INTO nascimentos (usuario_id, mae_id, pai_id, data_nascimento, quantidade, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(uid, vazio(corpo.mae_id) ? null : Number(corpo.mae_id), vazio(corpo.pai_id) ? null : Number(corpo.pai_id),
              corpo.data_nascimento, Number(corpo.quantidade) || 1, corpo.observacoes || '').run();
      return json({ id: r.meta.last_row_id, message: 'Nascimento registrado!' });
    }
    if (metodo === 'DELETE') {
      const r = await db.prepare('DELETE FROM nascimentos WHERE id = ? AND usuario_id = ?').bind(id, uid).run();
      return r.meta.changes ? json({ message: 'Nascimento excluído!' }) : erro('Nascimento não encontrado', 404);
    }
  }

  // ==================== BACKUP ====================
  if (recurso === 'backup' && metodo === 'GET') {
    const dados = await exportarTudo(db, uid);
    const r = await db.prepare("INSERT INTO backups (usuario_id, dia, dados) VALUES (?, date('now'), ?)").bind(uid, JSON.stringify(dados)).run();
    return json({ message: 'Backup criado com sucesso!', arquivo: `backup nº ${r.meta.last_row_id} (guardado no banco)` });
  }

  if (recurso === 'exportar' && metodo === 'GET') {
    return json({ ...(await exportarTudo(db, uid)), exportado_em: new Date().toISOString() });
  }

  if (recurso === 'importar' && metodo === 'POST') {
    const { aves, vacinas, nascimentos } = corpo;
    if (!Array.isArray(aves)) return erro('Dados inválidos', 400);

    // As aves recebem ids novos (os ids são do banco inteiro, compartilhado entre usuários);
    // vacinas e nascimentos são religados às aves pelos ids novos.
    const { proximo } = await db.prepare("SELECT COALESCE(MAX(id), 0) + 1 as proximo FROM aves").first();
    const novoId = new Map(aves.map((a, i) => [a.id, proximo + i]));
    const mapear = (antigo) => (vazio(antigo) ? null : novoId.get(antigo) ?? null);

    const comandos = [
      db.prepare('DELETE FROM vacinas WHERE usuario_id = ?').bind(uid),
      db.prepare('DELETE FROM nascimentos WHERE usuario_id = ?').bind(uid),
      db.prepare('DELETE FROM aves WHERE usuario_id = ?').bind(uid),
      ...aves.map((a, i) => db.prepare('INSERT INTO aves (id, usuario_id, nome, especie, cor, sexo, anilha, registro, idade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(proximo + i, uid, a.nome, a.especie, a.cor || '', a.sexo, a.anilha || '', a.registro || '', Number(a.idade) || 0)),
      ...(Array.isArray(vacinas) ? vacinas : []).map(v => db.prepare('INSERT INTO vacinas (usuario_id, ave_id, nome_vacina, data_aplicacao, proxima_dose, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(uid, mapear(v.ave_id), v.nome_vacina, v.data_aplicacao, v.proxima_dose || '', v.observacoes || '')),
      ...(Array.isArray(nascimentos) ? nascimentos : []).map(n => db.prepare('INSERT INTO nascimentos (usuario_id, mae_id, pai_id, data_nascimento, quantidade, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(uid, mapear(n.mae_id), mapear(n.pai_id), n.data_nascimento, n.quantidade || 1, n.observacoes || ''))
    ];
    await db.batch(comandos); // batch roda tudo numa transação: se algo falhar, nada é apagado
    return json({ message: 'Dados importados com sucesso!' });
  }

  return erro('Rota não encontrada', 404);
}
