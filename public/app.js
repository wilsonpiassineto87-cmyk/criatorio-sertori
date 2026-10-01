// ==================== ESPÉCIES E CORES ====================
// Cores/mutações sugeridas para cada espécie (o campo também aceita cores digitadas)
const ESPECIES = {
  'Calopsita': {
    'Cinza (ancestral)': '#8a8d91', 'Lutino': '#f7e27a', 'Albino': '#f5f5f0', 'Cara Branca': '#b9bcc0',
    'Pérola': '#c9b27a', 'Arlequim': '#d8d0b0', 'Canela': '#a67c52', 'Prata': '#c0c4c8',
    'Pastel': '#e6d7a8', 'Cara Branca Lutino': '#fbfbf2'
  },
  'Ring Neck': {
    'Verde (ancestral)': '#4caf50', 'Azul': '#4f9bd9', 'Lutino': '#f6dc3d', 'Albino': '#f7f7f2',
    'Turquesa': '#2bb3a6', 'Violeta': '#7b5fb5', 'Cinza': '#8d9398', 'Canela': '#b5925b',
    'Arlequim': '#b8d86a', 'Cobalto': '#2f5fb3'
  },
  'Agapórnis': {
    'Verde (ancestral)': '#56b04a', 'Lutino': '#f6d94a', 'Azul': '#5aa7d6', 'Turquesa': '#33b3a0',
    'Opalino': '#7fc66e', 'Violeta': '#7e65b8', 'Arlequim': '#c7dd62', 'Euwing': '#6fbb5d',
    'Pastel': '#a8d48a', 'Creme Ino': '#f3ecc8'
  },
  'Rosela': {
    'Normal (vermelha)': '#d63b2f', 'Lutino': '#f4dc4c', 'Canela': '#c47a4f', 'Pastel': '#e7a08a',
    'Opalina': '#e0644f', 'Rubino': '#e9606a', 'Vermelha Rubino': '#cc2f3f', 'Azul Branca': '#8fb6d8'
  },
  'Periquito Australiano': {
    'Verde (ancestral)': '#6cc04a', 'Azul': '#4f9fd8', 'Cinza': '#9097a0', 'Lutino': '#f5e14a',
    'Albino': '#f7f7f2', 'Violeta': '#7a62b6', 'Arlequim': '#c7df6a', 'Opalino': '#7ec7c2',
    'Canela': '#b7926a', 'Cara Amarela': '#9fd0b0'
  },
  'Red Rump': {
    'Verde (ancestral)': '#5bb35a', 'Amarelo': '#efd453', 'Lutino': '#f6e070', 'Azul': '#6aa9cf',
    'Canela': '#b99a6a', 'Pastel': '#b8d79a', 'Opalino': '#86c37b'
  },
  'Bourke': {
    'Normal': '#b58f7c', 'Rosa': '#e7a3b4', 'Rubino': '#e58aa0', 'Opalino Rosa': '#ee9cbf',
    'Lutino': '#f4e2a0', 'Canela': '#c09a7e'
  },
  'Kakariki': {
    'Verde (ancestral)': '#45a547', 'Lutino': '#f3dc5a', 'Canela': '#a9b56b', 'Arlequim': '#b7d264',
    'Pastel': '#b5d99a', 'Cara Amarela': '#c6d84a'
  }
};

function corHex(especie, cor) {
  return (ESPECIES[especie] && ESPECIES[especie][cor]) || '#d8e3df';
}

// ==================== UTILITÁRIOS ====================
const $ = (id) => document.getElementById(id);

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatarData(data) {
  if (!data) return '-';
  const [a, m, d] = data.split('-');
  return d && m && a ? `${d}/${m}/${a}` : data;
}

let toastTimer;
function aviso(msg, erro = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (erro ? ' erro' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3000);
}

async function api(url, opcoes = {}) {
  const resp = await fetch(url, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json' },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
  });
  const dados = await resp.json().catch(() => ({}));
  // Sessão expirou ou foi encerrada: volta para a tela de login
  if (resp.status === 401 && !url.startsWith('/api/auth/')) {
    mostrarLogin(false);
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  if (!resp.ok) throw new Error(dados.error || 'Erro na requisição');
  return dados;
}

// ==================== ABAS ====================
function abrirPainel(nome) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === nome));
  document.querySelectorAll('.painel').forEach(p => p.classList.toggle('ativo', p.id === nome));
  if (nome === 'usuarios') carregarUsuarios();
}

document.querySelectorAll('.aba').forEach(botao => {
  botao.addEventListener('click', () => abrirPainel(botao.dataset.aba));
});

// ==================== AVES ====================
let aves = [];

function preencherEspecies() {
  const opcoes = Object.keys(ESPECIES).map(e => `<option>${e}</option>`).join('');
  $('ave-especie').innerHTML = `<option value="">Selecione</option>${opcoes}`;
  $('filtro-especie').innerHTML = `<option value="">Todas as espécies</option>${opcoes}`;
}

function atualizarListaCores() {
  const cores = Object.keys(ESPECIES[$('ave-especie').value] || {});
  $('lista-cores').innerHTML = cores.map(c => `<option value="${escapar(c)}">`).join('');
}

$('ave-especie').addEventListener('change', () => {
  $('ave-cor').value = '';
  atualizarListaCores();
});

function chipCor(especie, cor) {
  return `<span class="cor-chip"><span class="cor-bolinha" style="background:${corHex(especie, cor)}"></span>${escapar(cor)}</span>`;
}

async function carregarAves() {
  const params = new URLSearchParams();
  if ($('filtro-especie').value) params.set('especie', $('filtro-especie').value);
  if ($('filtro-sexo').value) params.set('sexo', $('filtro-sexo').value);
  const lista = await api('/api/aves?' + params);

  $('tabela-aves').innerHTML = lista.length ? lista.map(a => `
    <tr>
      <td>${escapar(a.nome)}</td>
      <td>${escapar(a.especie)}</td>
      <td>${chipCor(a.especie, a.cor)}</td>
      <td>${escapar(a.sexo)}</td>
      <td>${escapar(a.anilha) || '-'}</td>
      <td>${escapar(a.registro) || '-'}</td>
      <td>${a.idade} ${a.idade == 1 ? 'ano' : 'anos'}</td>
      <td class="botoes">
        <button class="btn pequeno" onclick="editarAve(${a.id})">Editar</button>
        <button class="btn pequeno perigo" onclick="excluirAve(${a.id})">Excluir</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="8" class="vazio">Nenhuma ave cadastrada</td></tr>';
}

async function carregarTodasAves() {
  aves = await api('/api/aves');
  const rotulo = a => `${escapar(a.nome)} — ${escapar(a.especie)} ${escapar(a.cor)}${a.anilha ? ' (' + escapar(a.anilha) + ')' : ''}`;
  $('vacina-ave').innerHTML = '<option value="">Selecione</option>' +
    aves.map(a => `<option value="${a.id}">${rotulo(a)}</option>`).join('');
  $('nasc-mae').innerHTML = '<option value="">—</option>' +
    aves.filter(a => a.sexo === 'Fêmea').map(a => `<option value="${a.id}">${rotulo(a)}</option>`).join('');
  $('nasc-pai').innerHTML = '<option value="">—</option>' +
    aves.filter(a => a.sexo === 'Macho').map(a => `<option value="${a.id}">${rotulo(a)}</option>`).join('');
}

async function carregarResumo() {
  const e = await api('/api/estatisticas');
  const itens = [
    { numero: e.total, rotulo: 'Aves no plantel' },
    { numero: e.machos, rotulo: 'Machos' },
    { numero: e.femeas, rotulo: 'Fêmeas' },
    ...e.especies.map(s => ({ numero: s.total, rotulo: s.especie }))
  ];
  $('resumo').innerHTML = itens.map(i =>
    `<div class="item"><div class="numero">${i.numero}</div><div class="rotulo">${escapar(i.rotulo)}</div></div>`
  ).join('');
}

function limparFormAve() {
  $('form-ave').reset();
  $('ave-id').value = '';
  $('titulo-form-ave').textContent = 'Cadastrar ave';
  $('cancelar-edicao').hidden = true;
  atualizarListaCores();
}

window.editarAve = async (id) => {
  const a = await api('/api/aves/' + id);
  $('ave-id').value = a.id;
  $('ave-nome').value = a.nome;
  $('ave-especie').value = a.especie;
  atualizarListaCores();
  $('ave-cor').value = a.cor;
  $('ave-sexo').value = a.sexo;
  $('ave-anilha').value = a.anilha;
  $('ave-registro').value = a.registro;
  $('ave-idade').value = a.idade;
  $('titulo-form-ave').textContent = 'Editar ave';
  $('cancelar-edicao').hidden = false;
  $('form-ave').scrollIntoView({ behavior: 'smooth' });
};

window.excluirAve = async (id) => {
  if (!confirm('Excluir esta ave?')) return;
  try {
    const r = await api('/api/aves/' + id, { method: 'DELETE' });
    aviso(r.message);
    atualizarTudo();
  } catch (e) { aviso(e.message, true); }
};

$('cancelar-edicao').addEventListener('click', limparFormAve);

$('form-ave').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const id = $('ave-id').value;
  const body = {
    nome: $('ave-nome').value.trim(),
    especie: $('ave-especie').value,
    cor: $('ave-cor').value.trim(),
    sexo: $('ave-sexo').value,
    anilha: $('ave-anilha').value.trim(),
    registro: $('ave-registro').value.trim(),
    idade: $('ave-idade').value
  };
  try {
    const r = await api(id ? '/api/aves/' + id : '/api/aves', { method: id ? 'PUT' : 'POST', body });
    aviso(r.message);
    limparFormAve();
    atualizarTudo();
  } catch (e) { aviso(e.message, true); }
});

$('filtro-especie').addEventListener('change', carregarAves);
$('filtro-sexo').addEventListener('change', carregarAves);

// ==================== VACINAS ====================
async function carregarVacinas() {
  const lista = await api('/api/vacinas');
  $('tabela-vacinas').innerHTML = lista.length ? lista.map(v => `
    <tr>
      <td>${escapar(v.ave_nome) || '(ave removida)'}</td>
      <td>${v.especie ? `${escapar(v.especie)} · ${chipCor(v.especie, v.cor)}` : '-'}</td>
      <td>${escapar(v.nome_vacina)}</td>
      <td>${formatarData(v.data_aplicacao)}</td>
      <td>${formatarData(v.proxima_dose)}</td>
      <td>${escapar(v.observacoes) || '-'}</td>
      <td class="botoes"><button class="btn pequeno perigo" onclick="excluirVacina(${v.id})">Excluir</button></td>
    </tr>`).join('') : '<tr><td colspan="7" class="vazio">Nenhuma vacina registrada</td></tr>';
}

window.excluirVacina = async (id) => {
  if (!confirm('Excluir este registro de vacina?')) return;
  try {
    const r = await api('/api/vacinas/' + id, { method: 'DELETE' });
    aviso(r.message);
    carregarVacinas();
  } catch (e) { aviso(e.message, true); }
};

$('form-vacina').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await api('/api/vacinas', {
      method: 'POST',
      body: {
        ave_id: $('vacina-ave').value,
        nome_vacina: $('vacina-nome').value.trim(),
        data_aplicacao: $('vacina-data').value,
        proxima_dose: $('vacina-proxima').value,
        observacoes: $('vacina-obs').value.trim()
      }
    });
    aviso(r.message);
    $('form-vacina').reset();
    carregarVacinas();
  } catch (e) { aviso(e.message, true); }
});

// ==================== NASCIMENTOS ====================
async function carregarNascimentos() {
  const lista = await api('/api/nascimentos');
  const ave = (nome, especie, cor) => nome ? `${escapar(nome)} <small>(${escapar(especie)} ${escapar(cor)})</small>` : '-';
  $('tabela-nascimentos').innerHTML = lista.length ? lista.map(n => `
    <tr>
      <td>${formatarData(n.data_nascimento)}</td>
      <td>${ave(n.mae_nome, n.mae_especie, n.mae_cor)}</td>
      <td>${ave(n.pai_nome, n.pai_especie, n.pai_cor)}</td>
      <td>${n.quantidade}</td>
      <td>${escapar(n.observacoes) || '-'}</td>
      <td class="botoes"><button class="btn pequeno perigo" onclick="excluirNascimento(${n.id})">Excluir</button></td>
    </tr>`).join('') : '<tr><td colspan="6" class="vazio">Nenhum nascimento registrado</td></tr>';
}

window.excluirNascimento = async (id) => {
  if (!confirm('Excluir este registro de nascimento?')) return;
  try {
    const r = await api('/api/nascimentos/' + id, { method: 'DELETE' });
    aviso(r.message);
    carregarNascimentos();
  } catch (e) { aviso(e.message, true); }
};

$('form-nascimento').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await api('/api/nascimentos', {
      method: 'POST',
      body: {
        mae_id: $('nasc-mae').value,
        pai_id: $('nasc-pai').value,
        data_nascimento: $('nasc-data').value,
        quantidade: $('nasc-qtd').value,
        observacoes: $('nasc-obs').value.trim()
      }
    });
    aviso(r.message);
    $('form-nascimento').reset();
    carregarNascimentos();
  } catch (e) { aviso(e.message, true); }
});

// ==================== BACKUP ====================
$('btn-backup').addEventListener('click', async () => {
  try {
    const r = await api('/api/backup');
    aviso(`${r.message} (${r.arquivo})`);
  } catch (e) { aviso(e.message, true); }
});

$('btn-exportar').addEventListener('click', async () => {
  try {
    const dados = await api('/api/exportar');
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `criatorio-sertori_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (e) { aviso(e.message, true); }
});

$('arquivo-importar').addEventListener('change', async (ev) => {
  const arquivo = ev.target.files[0];
  ev.target.value = '';
  if (!arquivo || !confirm('Importar vai substituir todos os dados atuais. Continuar?')) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    const r = await api('/api/importar', { method: 'POST', body: dados });
    aviso(r.message);
    atualizarTudo();
  } catch (e) { aviso(e.message, true); }
});

// ==================== USUÁRIOS (administrador) ====================
let usuarioAtual = null;

async function carregarUsuarios() {
  try {
    const lista = await api('/api/usuarios');
    $('tabela-usuarios').innerHTML = lista.map(u => `
      <tr>
        <td>${escapar(u.nome)}${u.id === usuarioAtual.id ? ' <small>(você)</small>' : ''}</td>
        <td>${escapar(u.email)}</td>
        <td>${u.admin ? 'Administrador' : 'Usuário'}</td>
        <td>${u.total_aves}</td>
        <td>${formatarData(String(u.criado_em).split(' ')[0])}</td>
        <td class="botoes">
          ${u.id === usuarioAtual.id ? '' : `
            <button class="btn pequeno" onclick="redefinirSenha(${u.id})">Redefinir senha</button>
            <button class="btn pequeno perigo" onclick="excluirUsuario(${u.id})">Excluir</button>`}
        </td>
      </tr>`).join('');
  } catch (e) { aviso(e.message, true); }
}

window.redefinirSenha = async (id) => {
  const senha = prompt('Nova senha para este usuário (mínimo 6 caracteres):');
  if (senha === null) return;
  try {
    const r = await api(`/api/usuarios/${id}/senha`, { method: 'PUT', body: { senha } });
    aviso(r.message);
  } catch (e) { aviso(e.message, true); }
};

window.excluirUsuario = async (id) => {
  if (!confirm('Excluir este usuário e TODAS as aves, vacinas e nascimentos dele? Não dá para desfazer.')) return;
  try {
    const r = await api('/api/usuarios/' + id, { method: 'DELETE' });
    aviso(r.message);
    carregarUsuarios();
  } catch (e) { aviso(e.message, true); }
};

$('form-usuario').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await api('/api/usuarios', {
      method: 'POST',
      body: {
        nome: $('usuario-novo-nome').value.trim(),
        email: $('usuario-novo-email').value.trim(),
        senha: $('usuario-novo-senha').value,
        admin: $('usuario-novo-admin').checked
      }
    });
    aviso(r.message);
    $('form-usuario').reset();
    carregarUsuarios();
  } catch (e) { aviso(e.message, true); }
});

// ==================== CONTA ====================
$('btn-conta').addEventListener('click', () => abrirPainel('conta'));

$('form-senha').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await api('/api/auth/trocar-senha', {
      method: 'POST',
      body: { senha_atual: $('senha-atual').value, nova_senha: $('senha-nova').value }
    });
    aviso(r.message);
    $('form-senha').reset();
  } catch (e) { aviso(e.message, true); }
});

$('btn-sair').addEventListener('click', async () => {
  await api('/api/auth/sair', { method: 'POST' }).catch(() => {});
  mostrarLogin(false);
});

// ==================== LOGIN ====================
function mostrarLogin(precisaAdmin) {
  usuarioAtual = null;
  $('tela-login').hidden = false;
  $('form-entrar').hidden = precisaAdmin;
  $('form-primeiro-admin').hidden = !precisaAdmin;
  $('menu').hidden = true;
  $('app').hidden = true;
  $('usuario-barra').hidden = true;
}

function mostrarSistema(usuario) {
  usuarioAtual = usuario;
  $('tela-login').hidden = true;
  $('menu').hidden = false;
  $('app').hidden = false;
  $('usuario-barra').hidden = false;
  $('usuario-nome').textContent = `Olá, ${usuario.nome}${usuario.admin ? ' (administrador)' : ''}`;
  $('aba-usuarios').hidden = !usuario.admin;
  limparFormAve();
  abrirPainel('aves');
  atualizarTudo();
}

async function iniciarSessao() {
  try {
    const estado = await api('/api/auth/estado');
    if (estado.usuario) mostrarSistema(estado.usuario);
    else mostrarLogin(estado.precisaAdmin);
  } catch (e) {
    aviso(e.message, true);
  }
}

$('form-entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    await api('/api/auth/entrar', {
      method: 'POST',
      body: { email: $('entrar-email').value.trim(), senha: $('entrar-senha').value }
    });
    $('form-entrar').reset();
    iniciarSessao();
  } catch (e) { aviso(e.message, true); }
});

$('form-primeiro-admin').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    await api('/api/auth/primeiro-admin', {
      method: 'POST',
      body: { nome: $('admin-nome').value.trim(), email: $('admin-email').value.trim(), senha: $('admin-senha').value }
    });
    $('form-primeiro-admin').reset();
    iniciarSessao();
  } catch (e) {
    aviso(e.message, true);
    iniciarSessao(); // se outra pessoa já criou o administrador, mostra a tela de entrar
  }
});

// ==================== INÍCIO ====================
function atualizarTudo() {
  return Promise.all([carregarAves(), carregarTodasAves(), carregarResumo(), carregarVacinas(), carregarNascimentos()])
    .catch(e => aviso(e.message, true));
}

preencherEspecies();
iniciarSessao();
