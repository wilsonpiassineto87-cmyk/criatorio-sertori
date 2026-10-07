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
  'Forpus': {
    'Verde (ancestral)': '#4fae4c', 'Azul': '#5a9fd6', 'Turquesa': '#35b3a3', 'Amarelo (Lutino)': '#f4dc4a',
    'Branco (Albino)': '#f6f6f1', 'Cinza': '#8e959b', 'Fallow': '#b9c27a', 'Pastel': '#a9d38c'
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

const formatoReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dinheiro = (v) => formatoReal.format(Number(v) || 0);

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
  if (nome === 'painel' && usuarioAtual) carregarPainel().catch(e => aviso(e.message, true));
}

document.querySelectorAll('.aba').forEach(botao => {
  botao.addEventListener('click', () => abrirPainel(botao.dataset.aba));
});

// ==================== AVES ====================
let aves = [];      // aves do plantel
let avesTodas = []; // plantel + vendidas (para mãe, pai e família)

// Idade calculada pela data de nascimento (ex.: "1 ano e 3 meses"); sem data, usa a idade antiga
function idadeTexto(a) {
  if (!a.data_nascimento) return a.idade != null ? `${a.idade} ${a.idade == 1 ? 'ano' : 'anos'}` : '-';
  const [ano, mes, dia] = a.data_nascimento.split('-').map(Number);
  const hoje = new Date();
  let meses = (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes);
  if (hoje.getDate() < dia) meses--;
  if (meses < 1) {
    const dias = Math.max(0, Math.floor((hoje - new Date(ano, mes - 1, dia)) / 86400000));
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  const anos = Math.floor(meses / 12), resto = meses % 12;
  const txtMeses = `${resto} ${resto === 1 ? 'mês' : 'meses'}`;
  if (!anos) return txtMeses;
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}${resto ? ' e ' + txtMeses : ''}`;
}

const aveTodas = (id) => avesTodas.find(a => a.id === id);

// Mudanças do usuário na lista de espécies (guardadas no banco): padrão excluídas e espécies novas
let especiesConfig = { ocultas: [], extras: [] };

function listaEspecies() {
  return [...Object.keys(ESPECIES).filter(e => !especiesConfig.ocultas.includes(e)), ...especiesConfig.extras];
}

function preencherEspecies() {
  const opcoes = listaEspecies().map(e => `<option>${escapar(e)}</option>`).join('');
  for (const [campo, primeira] of [['ave-especie', 'Selecione'], ['filtro-especie', 'Todas as espécies']]) {
    const atual = $(campo).value;
    $(campo).innerHTML = `<option value="">${primeira}</option>${opcoes}`;
    garantirEspecie(campo, atual);
  }
}

// Mantém selecionada uma espécie que saiu da lista (ex.: ao editar uma ave antiga)
function garantirEspecie(campo, especie) {
  if (!especie) return;
  if (![...$(campo).options].some(o => o.value === especie)) $(campo).add(new Option(especie, especie));
  $(campo).value = especie;
}

async function carregarEspecies() {
  especiesConfig = await api('/api/especies');
  preencherEspecies();
  $('lista-especies').innerHTML = listaEspecies().map(e => `
    <span class="especie-chip">${escapar(e)}${ESPECIES[e] ? '' : ' <small>(nova)</small>'}
      <button type="button" data-acao="excluirEspecie" data-valor="${escapar(e)}" title="Excluir ${escapar(e)}" aria-label="Excluir ${escapar(e)}">×</button>
    </span>`).join('') || '<p class="vazio">Nenhuma espécie na lista</p>';
  $('especies-excluidas').innerHTML = especiesConfig.ocultas.length ? `
    <p class="dica">Espécies excluídas: ${especiesConfig.ocultas.map(e =>
      `${escapar(e)} <button type="button" class="link" data-acao="restaurarEspecie" data-valor="${escapar(e)}">restaurar</button>`).join(' · ')}</p>` : '';
}

const excluirEspecie = async (_, nome) => {
  if (!confirm(`Excluir a espécie ${nome} da lista?`)) return;
  try {
    const r = await api('/api/especies?' + new URLSearchParams({ nome }), { method: 'DELETE' });
    aviso(r.message);
    await carregarEspecies();
    carregarAves();
  } catch (e) { aviso(e.message, true); }
};

const restaurarEspecie = async (_, nome) => {
  try {
    const r = await api('/api/especies', { method: 'POST', body: { nome } });
    aviso(r.message);
    await carregarEspecies();
  } catch (e) { aviso(e.message, true); }
};

$('form-especie').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const nome = $('especie-nome').value.trim().replace(/\s+/g, ' ');
  const existente = listaEspecies().find(e => e.toLowerCase() === nome.toLowerCase());
  if (existente) return aviso(`${existente} já está na lista`, true);
  try {
    const r = await api('/api/especies', { method: 'POST', body: { nome } });
    aviso(r.message);
    $('form-especie').reset();
    await carregarEspecies();
  } catch (e) { aviso(e.message, true); }
});

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

const TITULOS_LISTA_AVES = { plantel: 'Plantel', vendida: 'Aves vendidas', todas: 'Todas as aves' };

async function carregarAves() {
  const situacao = $('filtro-situacao').value;
  const params = new URLSearchParams({ status: situacao });
  $('titulo-lista-aves').textContent = TITULOS_LISTA_AVES[situacao];
  if ($('filtro-especie').value) params.set('especie', $('filtro-especie').value);
  if ($('filtro-sexo').value) params.set('sexo', $('filtro-sexo').value);
  const lista = await api('/api/aves?' + params);

  $('tabela-aves').innerHTML = lista.length ? lista.map(a => `
    <tr>
      <td>${escapar(a.nome)}${a.status === 'vendida' ? ' <span class="situacao vendida">Vendida</span>' : ''}</td>
      <td>${escapar(a.especie)}</td>
      <td>${chipCor(a.especie, a.cor)}</td>
      <td>${escapar(a.sexo)}</td>
      <td>${escapar(a.anilha) || '-'}</td>
      <td>${escapar(a.registro) || '-'}</td>
      <td>${idadeTexto(a)}</td>
      <td>${a.preco != null ? dinheiro(a.preco) : '-'}</td>
      <td class="botoes">
        ${a.status === 'vendida' ? '' : `<button class="btn pequeno" data-acao="venderAve" data-id="${a.id}">Vender</button>`}
        <button class="btn pequeno" data-acao="verFamilia" data-id="${a.id}">Família</button>
        <button class="btn pequeno" data-acao="editarAve" data-id="${a.id}">Editar</button>
        <button class="btn pequeno perigo" data-acao="excluirAve" data-id="${a.id}" data-valor="${escapar(a.status)}">Excluir</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="9" class="vazio">${situacao === 'vendida' ? 'Nenhuma ave vendida' : situacao === 'todas' ? 'Nenhuma ave cadastrada' : 'Nenhuma ave no plantel'}</td></tr>`;
}

async function carregarTodasAves() {
  avesTodas = await api('/api/aves?status=todas');
  aves = avesTodas.filter(a => a.status === 'plantel');
  const rotulo = a => `${escapar(a.nome)} — ${escapar(a.especie)} ${escapar(a.cor)}${a.anilha ? ' (' + escapar(a.anilha) + ')' : ''}`;
  // Mãe e pai podem ser aves já vendidas
  const opcoesPais = (sexo) => '<option value="">—</option>' + avesTodas.filter(a => a.sexo === sexo)
    .map(a => `<option value="${a.id}">${rotulo(a)}${a.status === 'vendida' ? ' · vendida' : ''}</option>`).join('');
  for (const [campo, sexo] of [['ave-mae', 'Fêmea'], ['ave-pai', 'Macho']]) {
    const atual = $(campo).value;
    $(campo).innerHTML = opcoesPais(sexo);
    $(campo).value = atual;
  }
  $('nasc-mae').innerHTML = '<option value="">—</option>' +
    aves.filter(a => a.sexo === 'Fêmea').map(a => `<option value="${a.id}">${rotulo(a)}</option>`).join('');
  $('nasc-pai').innerHTML = '<option value="">—</option>' +
    aves.filter(a => a.sexo === 'Macho').map(a => `<option value="${a.id}">${rotulo(a)}</option>`).join('');
  const escolhida = $('venda-ave').value;
  $('venda-ave').innerHTML = '<option value="">Selecione</option>' +
    aves.map(a => `<option value="${a.id}">${rotulo(a)}${a.preco != null ? ' · ' + dinheiro(a.preco) : ''}</option>`).join('');
  if (aves.some(a => String(a.id) === escolhida)) $('venda-ave').value = escolhida;
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
  $('ave-ninhada').value = '';
  $('titulo-form-ave').textContent = 'Cadastrar ave';
  $('cancelar-edicao').hidden = true;
  atualizarListaCores();
}

const editarAve = async (id) => {
  const a = await api('/api/aves/' + id);
  $('ave-id').value = a.id;
  $('ave-nome').value = a.nome;
  garantirEspecie('ave-especie', a.especie);
  atualizarListaCores();
  $('ave-cor').value = a.cor;
  $('ave-sexo').value = a.sexo;
  $('ave-anilha').value = a.anilha;
  $('ave-registro').value = a.registro;
  $('ave-nascimento').value = a.data_nascimento || '';
  $('ave-mae').value = a.mae_id ?? '';
  $('ave-pai').value = a.pai_id ?? '';
  $('ave-ninhada').value = a.nascimento_id ?? '';
  $('ave-preco').value = a.preco ?? '';
  $('titulo-form-ave').textContent = 'Editar ave';
  $('cancelar-edicao').hidden = false;
  $('form-ave').scrollIntoView({ behavior: 'smooth' });
};

const excluirAve = async (id, status) => {
  const pergunta = status === 'vendida'
    ? 'Excluir esta ave vendida? O registro da venda continua no histórico de vendas.'
    : 'Excluir esta ave?';
  if (!confirm(pergunta)) return;
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
    data_nascimento: $('ave-nascimento').value,
    mae_id: $('ave-mae').value,
    pai_id: $('ave-pai').value,
    nascimento_id: $('ave-ninhada').value,
    preco: $('ave-preco').value
  };
  if (!id && body.mae_id && body.pai_id && !conferirParentesco(Number(body.mae_id), Number(body.pai_id))) return;
  try {
    const r = await api(id ? '/api/aves/' + id : '/api/aves', { method: id ? 'PUT' : 'POST', body });
    aviso(r.message);
    limparFormAve();
    await atualizarTudo();
    // Filhote de uma ninhada: já prepara o formulário para o próximo, se faltar algum
    const ninhada = !id && nascimentos.find(n => String(n.id) === body.nascimento_id);
    if (ninhada && ninhada.cadastrados < ninhada.quantidade) cadastrarFilhote(ninhada.id);
  } catch (e) { aviso(e.message, true); }
});

// ==================== FAMÍLIA ====================
// Grau de parentesco entre duas aves, pelo que está cadastrado (ou null se não houver)
function parentesco(idA, idB) {
  const a = aveTodas(idA), b = aveTodas(idB);
  if (!a || !b) return null;
  const pais = (x) => [x.mae_id, x.pai_id].filter(Boolean);
  if (pais(a).includes(b.id) || pais(b).includes(a.id)) return 'mãe/pai e filho(a)';
  const comuns = pais(a).filter(p => pais(b).includes(p));
  if (comuns.length === 2) return 'irmãos';
  if (comuns.length === 1) return 'meio-irmãos';
  const avos = (x) => pais(x).flatMap(p => (aveTodas(p) ? pais(aveTodas(p)) : []));
  if (avos(a).includes(b.id) || avos(b).includes(a.id)) return 'avô/avó e neto(a)';
  if (avos(a).some(p => avos(b).includes(p))) return 'primos';
  return null;
}

// Avisa antes de juntar parentes como casal. Devolve true para continuar.
function conferirParentesco(maeId, paiId) {
  const grau = parentesco(maeId, paiId);
  if (!grau) return true;
  return confirm(`Atenção: ${aveTodas(maeId).nome} e ${aveTodas(paiId).nome} são ${grau}. ` +
    'Cruzar parentes aumenta o risco de problemas de saúde nos filhotes. Continuar mesmo assim?');
}

function mostrarInfo(titulo, html) {
  $('info-titulo').textContent = titulo;
  $('info-conteudo').innerHTML = html;
  $('caixa-info').hidden = false;
  $('btn-fechar-info').focus();
}
$('btn-fechar-info').addEventListener('click', () => ($('caixa-info').hidden = true));
$('caixa-info').addEventListener('click', (ev) => { if (ev.target === $('caixa-info')) $('caixa-info').hidden = true; });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') $('caixa-info').hidden = true; });

const verFamilia = (id) => {
  const a = aveTodas(id);
  if (!a) return;
  const nomeAve = (x) => x ? `${escapar(x.nome)} <small>(${escapar(x.cor)}${x.status === 'vendida' ? ', vendida' : ''})</small>` : '<small>não informado</small>';
  const lista = (itens) => itens.length ? `<ul>${itens.map(x => `<li>${nomeAve(x)}</li>`).join('')}</ul>` : '<p class="dica">Nenhum cadastrado</p>';
  const mae = aveTodas(a.mae_id), pai = aveTodas(a.pai_id);
  const avos = [mae, pai].filter(Boolean).flatMap(p => [aveTodas(p.mae_id), aveTodas(p.pai_id)]).filter(Boolean);
  const irmaos = avesTodas.filter(x => x.id !== a.id &&
    ((a.mae_id && x.mae_id === a.mae_id) || (a.pai_id && x.pai_id === a.pai_id)));
  const filhos = avesTodas.filter(x => x.mae_id === a.id || x.pai_id === a.id);
  mostrarInfo(`Família de ${a.nome}`, `
    <div class="familia">
      <div><h3>Mãe</h3>${nomeAve(mae)}</div>
      <div><h3>Pai</h3>${nomeAve(pai)}</div>
      <div><h3>Avós</h3>${lista(avos)}</div>
      <div><h3>Irmãos</h3>${lista(irmaos)}</div>
      <div><h3>Filhotes</h3>${lista(filhos)}</div>
    </div>`);
};

$('filtro-especie').addEventListener('change', carregarAves);
$('filtro-situacao').addEventListener('change', carregarAves);
$('filtro-sexo').addEventListener('change', carregarAves);

// ==================== NASCIMENTOS ====================
let nascimentos = [];

async function carregarNascimentos() {
  const lista = nascimentos = await api('/api/nascimentos');
  const ave = (nome, especie, cor) => nome ? `${escapar(nome)} <small>(${escapar(especie)} ${escapar(cor)})</small>` : '-';
  $('tabela-nascimentos').innerHTML = lista.length ? lista.map(n => `
    <tr>
      <td>${formatarData(n.data_nascimento)}</td>
      <td>${ave(n.mae_nome, n.mae_especie, n.mae_cor)}</td>
      <td>${ave(n.pai_nome, n.pai_especie, n.pai_cor)}</td>
      <td>${n.quantidade}<span class="filhotes-contagem">${n.cadastrados} de ${n.quantidade} no plantel</span></td>
      <td>${escapar(n.observacoes) || '-'}</td>
      <td class="botoes">
        ${n.cadastrados < n.quantidade ? `<button class="btn pequeno" data-acao="cadastrarFilhote" data-id="${n.id}">Cadastrar filhote</button>` : ''}
        <button class="btn pequeno perigo" data-acao="excluirNascimento" data-id="${n.id}">Excluir</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="6" class="vazio">Nenhum nascimento registrado</td></tr>';
}

// Abre o cadastro de ave já preenchido com os dados da ninhada
const cadastrarFilhote = (id) => {
  const n = nascimentos.find(x => x.id === id);
  if (!n) return;
  abrirPainel('aves');
  limparFormAve();
  $('ave-ninhada').value = n.id;
  $('ave-nascimento').value = n.data_nascimento;
  $('ave-mae').value = n.mae_id ?? '';
  $('ave-pai').value = n.pai_id ?? '';
  const especie = n.mae_especie || n.pai_especie;
  if (especie) {
    garantirEspecie('ave-especie', especie);
    atualizarListaCores();
  }
  $('titulo-form-ave').textContent = `Cadastrar filhote ${n.cadastrados + 1} de ${n.quantidade} (nascido em ${formatarData(n.data_nascimento)})`;
  $('cancelar-edicao').hidden = false;
  $('form-ave').scrollIntoView({ behavior: 'smooth' });
  $('ave-nome').focus({ preventScroll: true });
};

const excluirNascimento = async (id) => {
  if (!confirm('Excluir este registro de nascimento?')) return;
  try {
    const r = await api('/api/nascimentos/' + id, { method: 'DELETE' });
    aviso(r.message);
    carregarNascimentos();
  } catch (e) { aviso(e.message, true); }
};

$('form-nascimento').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const maeId = Number($('nasc-mae').value), paiId = Number($('nasc-pai').value);
  if (maeId && paiId && !conferirParentesco(maeId, paiId)) return;
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
    await carregarNascimentos();
    if (confirm('Nascimento registrado! Quer cadastrar os filhotes no plantel agora?')) cadastrarFilhote(r.id);
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
    link.download = `criadouro-sertori_${new Date().toISOString().split('T')[0]}.json`;
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

// ==================== PAINEL ====================
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function situacaoVenda(status) {
  const mapa = {
    pago: ['ok', '✓', 'Pago'],
    pendente: ['espera', '◷', 'Aguardando'],
    cancelada: ['cancelada', '✕', 'Cancelada']
  };
  const [classe, icone, texto] = mapa[status] || mapa.pendente;
  return `<span class="situacao ${classe}"><span aria-hidden="true">${icone}</span> ${texto}</span>`;
}

// Barras horizontais de uma série só (mesma cor): rótulo, barra proporcional e valor
function barras(itens, vazio) {
  if (!itens.length) return `<p class="vazio">${vazio}</p>`;
  const max = Math.max(...itens.map(i => i.valor), 1);
  return `<ul class="barras">${itens.map(i => `
    <li title="${escapar(i.rotulo)}: ${escapar(i.texto)}${i.detalhe ? ' (' + escapar(i.detalhe) + ')' : ''}">
      <span class="barra-rotulo">${escapar(i.rotulo)}</span>
      <span class="barra-trilho"><span class="barra" style="width:${Math.max(2, (i.valor / max) * 100)}%"></span></span>
      <span class="barra-valor">${escapar(i.texto)}${i.detalhe ? `<small>${escapar(i.detalhe)}</small>` : ''}</span>
    </li>`).join('')}</ul>`;
}

// Linha de total embaixo das barras: soma dos valores e da quantidade de vendas
function linhaTotal(itens, umItem, varios) {
  if (!itens.length) return '';
  const valor = itens.reduce((soma, i) => soma + (Number(i.valor) || 0), 0);
  const qtd = itens.reduce((soma, i) => soma + (Number(i.vendas) || 0), 0);
  return `<div class="linha-total"><span>Total</span>
    <span class="barra-valor">${dinheiro(valor)}<small>${qtd} ${qtd === 1 ? umItem : varios}</small></span></div>`;
}

// Colunas por mês (12 meses, incluindo os sem venda)
function colunasMeses(dados, hoje) {
  const [ano, mes] = hoje.split('-').map(Number);
  const porMes = new Map(dados.map(d => [d.mes, d]));
  const meses = Array.from({ length: 12 }, (_, i) => {
    const data = new Date(ano, mes - 12 + i, 1);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const d = porMes.get(chave);
    return { chave, rotulo: MESES[data.getMonth()], ano: data.getFullYear(), valor: d ? d.valor : 0, vendas: d ? d.vendas : 0 };
  });
  if (!meses.some(m => m.valor)) return '<p class="vazio">Nenhuma venda nos últimos 12 meses</p>';
  const max = Math.max(...meses.map(m => m.valor));
  const maior = meses.findIndex(m => m.valor === max);
  return `<div class="colunas" role="img" aria-label="Faturamento por mês">${meses.map((m, i) => `
    <div class="coluna${i === 11 ? ' atual' : ''}" tabindex="0"
         data-dica="${m.rotulo}/${m.ano}: ${dinheiro(m.valor)} · ${m.vendas} ${m.vendas === 1 ? 'venda' : 'vendas'}">
      <span class="coluna-valor">${(i === maior || i === 11) && m.valor ? dinheiro(m.valor).replace(',00', '') : ''}</span>
      <span class="coluna-barra" style="height:${m.valor ? Math.max(3, (m.valor / max) * 100) : 0}%"></span>
      <span class="coluna-mes">${m.rotulo}</span>
    </div>`).join('')}</div>`;
}

async function carregarPainel() {
  const d = await api('/api/painel');
  const p = d.plantel, v = d.vendas, n = d.nascimentos;
  const kpis = [
    { numero: p.total, rotulo: 'Aves no plantel', detalhe: `${p.machos || 0} machos · ${p.femeas || 0} fêmeas` },
    { numero: n.filhotes, rotulo: `Filhotes em ${d.hoje.slice(0, 4)}`, detalhe: `${n.ninhadas} ${n.ninhadas === 1 ? 'ninhada' : 'ninhadas'}` },
    { numero: dinheiro(v.faturamento_mes), rotulo: 'Vendido este mês', detalhe: `${v.vendas_mes || 0} ${v.vendas_mes === 1 ? 'venda' : 'vendas'}` },
    { numero: dinheiro(v.a_receber), rotulo: 'A receber', detalhe: `${v.pendentes || 0} ${v.pendentes === 1 ? 'venda pendente' : 'vendas pendentes'}`, alerta: v.pendentes > 0 },
    { numero: dinheiro(v.faturamento_ano), rotulo: `Vendido em ${d.hoje.slice(0, 4)}`, detalhe: `ticket médio ${dinheiro(v.ticket_medio)}` },
    { numero: dinheiro(p.valor_estoque), rotulo: 'Plantel à venda', detalhe: `${p.com_preco || 0} ${p.com_preco === 1 ? 'ave com preço' : 'aves com preço'}` }
  ];
  $('painel-kpis').innerHTML = kpis.map(k => `
    <div class="item${k.alerta ? ' alerta' : ''}">
      <div class="numero">${k.numero}</div>
      <div class="rotulo">${escapar(k.rotulo)}</div>
      <div class="detalhe">${escapar(k.detalhe)}</div>
    </div>`).join('');

  $('painel-especies').innerHTML = barras(
    d.especies.map(e => ({ rotulo: e.especie, valor: e.total, texto: String(e.total), detalhe: `${e.machos}♂ ${e.femeas}♀` })),
    'Nenhuma ave no plantel');

  $('painel-meses').innerHTML = colunasMeses(d.vendas_por_mes, d.hoje);
  $('painel-formas').innerHTML = barras(
    d.formas_pagamento.map(f => ({ rotulo: f.forma_pagamento, valor: f.valor, texto: dinheiro(f.valor), detalhe: `${f.vendas} ${f.vendas === 1 ? 'venda' : 'vendas'}` })),
    'Nenhuma venda ainda') + linhaTotal(d.formas_pagamento, 'venda', 'vendas');
  $('painel-especies-vendidas').innerHTML = barras(
    d.especies_vendidas.map(e => ({ rotulo: e.especie, valor: e.valor, texto: dinheiro(e.valor), detalhe: `${e.vendas} ${e.vendas === 1 ? 'ave' : 'aves'}` })),
    'Nenhuma venda ainda') + linhaTotal(d.especies_vendidas, 'ave', 'aves');
  $('painel-ultimas').innerHTML = d.ultimas_vendas.length ? d.ultimas_vendas.map(x => `
    <tr>
      <td>${formatarData(x.data_venda)}</td>
      <td>${escapar(x.ave_nome)} <small>${escapar(x.ave_especie)} ${escapar(x.ave_cor)}</small></td>
      <td>${escapar(x.comprador_nome) || '-'}</td>
      <td>${dinheiro(x.valor)}</td>
      <td>${escapar(x.forma_pagamento)}</td>
      <td>${situacaoVenda(x.status_pagamento)}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="vazio">Nenhuma venda ainda</td></tr>';
}

// ==================== VENDAS ====================
let vendas = [];
let configPix = {};

function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function carregarVendas() {
  vendas = await api('/api/vendas');
  const filtro = $('filtro-vendas').value;
  const lista = filtro ? vendas.filter(v => v.status_pagamento === filtro) : vendas;
  $('tabela-vendas').innerHTML = lista.length ? lista.map(v => {
    const botoes = [];
    if (v.status_pagamento === 'pendente') {
      if (v.forma_pagamento === 'Pix') botoes.push(`<button class="btn pequeno" data-acao="abrirPix" data-id="${v.id}">QR Pix</button>`);
      botoes.push(`<button class="btn pequeno" data-acao="marcarPagamento" data-id="${v.id}" data-valor="pago">Recebi</button>`);
    }
    if (v.status_pagamento === 'pago') botoes.push(`<button class="btn pequeno" data-acao="marcarPagamento" data-id="${v.id}" data-valor="pendente">Desfazer pago</button>`);
    if (v.status_pagamento !== 'cancelada') botoes.push(`<button class="btn pequeno perigo" data-acao="cancelarVenda" data-id="${v.id}">Cancelar</button>`);
    botoes.push(`<button class="btn pequeno perigo" data-acao="excluirVenda" data-id="${v.id}">Excluir</button>`);
    return `
    <tr>
      <td>${formatarData(v.data_venda)}</td>
      <td>${escapar(v.ave_nome)} <small>${escapar(v.ave_especie)} ${escapar(v.ave_cor)}</small></td>
      <td>${escapar(v.comprador_nome) || '-'}${v.comprador_telefone ? `<br><small>${escapar(v.comprador_telefone)}</small>` : ''}</td>
      <td>${dinheiro(v.valor)}</td>
      <td>${escapar(v.forma_pagamento)}</td>
      <td>${situacaoVenda(v.status_pagamento)}${v.data_pagamento ? `<br><small>em ${formatarData(v.data_pagamento)}</small>` : ''}</td>
      <td class="botoes">${botoes.join('')}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="vazio">${filtro ? 'Nenhuma venda com essa situação' : 'Nenhuma venda registrada'}</td></tr>`;
}

async function depoisDeVenda() {
  await Promise.all([carregarVendas(), carregarAves(), carregarTodasAves(), carregarResumo(), carregarPainel()]);
}

const venderAve = (id) => {
  abrirPainel('vendas');
  $('venda-ave').value = String(id);
  $('venda-ave').dispatchEvent(new Event('change'));
  $('form-venda').scrollIntoView({ behavior: 'smooth' });
  $('venda-valor').focus();
};

$('venda-ave').addEventListener('change', () => {
  const ave = aves.find(a => String(a.id) === $('venda-ave').value);
  if (ave && ave.preco != null) $('venda-valor').value = ave.preco;
});

$('filtro-vendas').addEventListener('change', carregarVendas);

$('form-venda').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const forma = $('venda-forma').value;
  const status = $('venda-status').value;
  try {
    const r = await api('/api/vendas', {
      method: 'POST',
      body: {
        ave_id: $('venda-ave').value,
        valor: $('venda-valor').value,
        forma_pagamento: forma,
        status_pagamento: status,
        comprador_nome: $('venda-comprador').value.trim(),
        comprador_telefone: $('venda-telefone').value.trim(),
        data_venda: $('venda-data').value || hojeLocal(),
        observacoes: $('venda-obs').value.trim()
      }
    });
    aviso(r.message);
    $('form-venda').reset();
    $('venda-data').value = hojeLocal();
    await depoisDeVenda();
    if (forma === 'Pix' && status === 'pendente') abrirPix(r.id);
  } catch (e) { aviso(e.message, true); }
});

const marcarPagamento = async (id, status) => {
  try {
    const r = await api(`/api/vendas/${id}/pagamento`, { method: 'PUT', body: { status_pagamento: status } });
    aviso(r.message);
    await depoisDeVenda();
  } catch (e) { aviso(e.message, true); }
};

const cancelarVenda = async (id) => {
  const v = vendas.find(x => x.id === id);
  const aveExiste = v && aveTodas(v.ave_id);
  if (!confirm('Cancelar esta venda?' + (aveExiste ? ' A ave volta para o plantel.' : ' A ave foi excluída do cadastro e não volta para o plantel.'))) return;
  try {
    const r = await api(`/api/vendas/${id}/cancelar`, { method: 'POST' });
    aviso(r.message);
    await depoisDeVenda();
  } catch (e) { aviso(e.message, true); }
};

// Janela com botões de escolha. Devolve o valor da opção clicada, ou null se a pessoa desistir.
function escolher(titulo, texto, opcoes) {
  const caixa = $('caixa-escolha');
  $('escolha-titulo').textContent = titulo;
  $('escolha-texto').textContent = texto;
  $('escolha-botoes').innerHTML = opcoes.map((o, i) =>
    `<button type="button" class="btn ${o.classe || ''}" data-escolha="${i}">${escapar(o.texto)}</button>`).join('') +
    '<button type="button" class="link" data-escolha="-1">Voltar</button>';
  caixa.hidden = false;
  $('escolha-botoes').querySelector('button').focus();
  return new Promise(resolve => {
    const fechar = (valor) => {
      caixa.hidden = true;
      caixa.removeEventListener('click', clique);
      document.removeEventListener('keydown', tecla);
      resolve(valor);
    };
    const clique = (ev) => {
      const botao = ev.target.closest('[data-escolha]');
      const i = botao ? Number(botao.dataset.escolha) : -1;
      if (botao || ev.target === caixa) fechar(i >= 0 ? opcoes[i].valor : null);
    };
    const tecla = (ev) => { if (ev.key === 'Escape') fechar(null); };
    caixa.addEventListener('click', clique);
    document.addEventListener('keydown', tecla);
  });
}

const excluirVenda = async (id) => {
  const v = vendas.find(x => x.id === id);
  if (!v) return;
  let destinoAve = '';
  if (v.status_pagamento === 'cancelada') {
    if (!confirm('Excluir este registro de venda cancelada?')) return;
  } else {
    destinoAve = await escolher('Excluir venda',
      `Venda de ${v.ave_nome} (${v.ave_especie}) por ${dinheiro(v.valor)}. O que fazer com a ave?`, [
        { texto: 'Excluir só a venda e devolver a ave ao plantel', valor: 'plantel' },
        { texto: 'Excluir a venda e a ave', valor: 'excluir', classe: 'perigo' }
      ]);
    if (!destinoAve) return;
  }
  try {
    const r = await api('/api/vendas/' + id + (destinoAve === 'excluir' ? '?ave=excluir' : ''), { method: 'DELETE' });
    aviso(r.message);
    await depoisDeVenda();
  } catch (e) { aviso(e.message, true); }
};

$('btn-excluir-canceladas').addEventListener('click', async () => {
  const total = vendas.filter(v => v.status_pagamento === 'cancelada').length;
  if (!total) return aviso('Nenhuma venda cancelada para excluir');
  if (!confirm(`Excluir ${total === 1 ? 'a venda cancelada' : `as ${total} vendas canceladas`} do histórico?`)) return;
  try {
    const r = await api('/api/vendas?status=cancelada', { method: 'DELETE' });
    aviso(r.message);
    await depoisDeVenda();
  } catch (e) { aviso(e.message, true); }
});

// ==================== PIX ====================
async function carregarPix() {
  configPix = await api('/api/pix');
  $('pix-tipo').value = configPix.tipo || '';
  $('pix-chave').value = configPix.chave || '';
  $('pix-nome').value = configPix.nome || '';
  $('pix-cidade').value = configPix.cidade || '';
}

$('form-pix').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const dados = {
    tipo: $('pix-tipo').value,
    chave: $('pix-chave').value.trim(),
    nome: $('pix-nome').value.trim(),
    cidade: $('pix-cidade').value.trim()
  };
  if (!Pix.validarChave(dados.chave, dados.tipo)) {
    const exemplos = { cpf: '11 números', cnpj: '14 números', celular: 'DDD + número, ex.: (17) 99123-4567', email: 'nome@email.com', aleatoria: 'formato 1234abcd-12ab-34cd-56ef-1234567890ab' };
    return aviso(`A chave não parece um ${$('pix-tipo').selectedOptions[0].text} válido (${exemplos[dados.tipo] || ''})`, true);
  }
  try {
    const r = await api('/api/pix', { method: 'PUT', body: dados });
    configPix = dados;
    aviso(r.message);
  } catch (e) { aviso(e.message, true); }
});

let vendaPix = null;

const abrirPix = (id) => {
  const v = vendas.find(x => x.id === id);
  if (!v) return;
  if (!configPix.chave) {
    aviso('Cadastre sua chave Pix em "Meu Pix" para gerar o QR Code', true);
    $('form-pix').scrollIntoView({ behavior: 'smooth' });
    return $('pix-tipo').focus();
  }
  vendaPix = v;
  const codigo = Pix.gerarPix({ ...configPix, valor: v.valor, txid: 'VENDA' + v.id });
  const qr = qrcode(0, 'M');
  qr.addData(codigo);
  qr.make();
  $('pix-qr').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 4, alt: 'QR Code do Pix', scalable: true });
  $('pix-valor').textContent = dinheiro(v.valor);
  $('pix-descricao').textContent = `${v.ave_nome} (${v.ave_especie} ${v.ave_cor || ''})${v.comprador_nome ? ' para ' + v.comprador_nome : ''}. ` +
    `Recebedor: ${configPix.nome}. Peça para o comprador ler o QR Code ou colar o código no app do banco.`;
  $('pix-codigo').value = codigo;
  $('btn-copiar-pix').textContent = 'Copiar código';
  $('caixa-pix').hidden = false;
};

$('btn-copiar-pix').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('pix-codigo').value);
    $('btn-copiar-pix').textContent = 'Copiado!';
  } catch {
    $('pix-codigo').select();
    aviso('Selecionei o código: use Ctrl+C (ou segure e copie no celular)', true);
  }
});

$('btn-whats-pix').addEventListener('click', () => {
  const v = vendaPix;
  let numero = String(v.comprador_telefone || '').replace(/\D/g, '');
  if (numero && numero.length <= 11) numero = '55' + numero;
  const texto = `Olá${v.comprador_nome ? ', ' + v.comprador_nome : ''}! Segue o Pix de ${dinheiro(v.valor)} referente a ${v.ave_nome} (${v.ave_especie}).\n\nPix copia e cola:\n${$('pix-codigo').value}`;
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});

$('btn-pix-pago').addEventListener('click', async () => {
  if (!confirm('Confirmou no app do seu banco que o Pix caiu?')) return;
  $('caixa-pix').hidden = true;
  await marcarPagamento(vendaPix.id, 'pago');
});

$('btn-fechar-pix').addEventListener('click', () => ($('caixa-pix').hidden = true));

// ==================== CAIXA DO CÓDIGO / LINK ====================
let fecharSegredo = null;

// Mostra um código de recuperação ou link e espera o usuário confirmar que anotou
function mostrarSegredo({ titulo, texto, valor, alerta = '', pequeno = false }) {
  $('segredo-titulo').textContent = titulo;
  $('segredo-texto').textContent = texto;
  $('segredo-valor').textContent = valor;
  $('segredo-valor').classList.toggle('pequeno', pequeno);
  $('segredo-alerta').textContent = alerta;
  $('btn-copiar-segredo').textContent = 'Copiar';
  $('caixa-segredo').hidden = false;
  $('btn-fechar-segredo').focus();
  return new Promise(resolve => (fecharSegredo = resolve));
}

const mostrarCodigo = (titulo, texto) => (codigo) => mostrarSegredo({
  titulo,
  texto,
  valor: codigo,
  alerta: 'Anote em papel ou tire um print agora. Ele não aparece de novo.'
});

$('btn-copiar-segredo').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('segredo-valor').textContent);
    $('btn-copiar-segredo').textContent = 'Copiado!';
  } catch {
    aviso('Não deu para copiar. Selecione o texto e copie manualmente.', true);
  }
});

$('btn-fechar-segredo').addEventListener('click', () => {
  $('caixa-segredo').hidden = true;
  if (fecharSegredo) fecharSegredo();
  fecharSegredo = null;
});

// ==================== USUÁRIOS (administrador) ====================
let usuarioAtual = null;
let usuariosLista = [];

async function carregarUsuarios() {
  try {
    const lista = await api('/api/usuarios');
    usuariosLista = lista;
    $('tabela-usuarios').innerHTML = lista.map(u => `
      <tr>
        <td>${escapar(u.nome)}${u.id === usuarioAtual.id ? ' <small>(você)</small>' : ''}</td>
        <td>${escapar(u.email)}</td>
        <td>${u.admin ? 'Administrador' : 'Usuário'}</td>
        <td>${u.total_aves}</td>
        <td>${formatarData(String(u.criado_em).split(' ')[0])}</td>
        <td class="botoes">
          ${u.id === usuarioAtual.id ? '' : `
            <button class="btn pequeno" data-acao="linkNovaSenha" data-id="${u.id}">Link de nova senha</button>
            <button class="btn pequeno perigo" data-acao="excluirUsuario" data-id="${u.id}">Excluir</button>`}
        </td>
      </tr>`).join('');
  } catch (e) { aviso(e.message, true); }
}

// Para quem esqueceu a senha E perdeu o código: o administrador gera um link e manda (ex.: WhatsApp)
const linkNovaSenha = async (id) => {
  const nome = (usuariosLista.find(u => u.id === id) || {}).nome || 'o usuário';
  try {
    const r = await api(`/api/usuarios/${id}/link-senha`, { method: 'POST' });
    await mostrarSegredo({
      titulo: 'Link de nova senha',
      texto: `Envie este link para ${nome}. Ao abrir, a pessoa cria uma senha nova e continua com todas as aves e dados.`,
      valor: r.link,
      alerta: `Vale por ${r.horas} horas e só pode ser usado uma vez. Gerar outro cancela este.`,
      pequeno: true
    });
  } catch (e) { aviso(e.message, true); }
};

const excluirUsuario = async (id) => {
  if (!confirm('Excluir este usuário e TODAS as aves, nascimentos e vendas dele? Não dá para desfazer.')) return;
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
    const nome = $('usuario-novo-nome').value.trim();
    $('form-usuario').reset();
    carregarUsuarios();
    await mostrarSegredo({
      titulo: 'Usuário cadastrado!',
      texto: `Entregue a ${nome} o e-mail, a senha inicial e este código de recuperação. Com o código, a pessoa cria uma senha nova sozinha se esquecer.`,
      valor: r.codigo
    });
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

$('btn-ir-codigo').addEventListener('click', () => {
  abrirPainel('conta');
  $('form-codigo').scrollIntoView({ behavior: 'smooth' });
  $('codigo-senha').focus();
});

$('form-codigo').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await api('/api/auth/novo-codigo', { method: 'POST', body: { senha_atual: $('codigo-senha').value } });
    $('form-codigo').reset();
    usuarioAtual.tem_codigo = 1;
    $('aviso-codigo').hidden = true;
    await mostrarCodigo('Seu código de recuperação', 'Se esquecer a senha, clique em "Esqueci a senha" na tela de entrar e use este código. O código anterior não vale mais.')(r.codigo);
  } catch (e) { aviso(e.message, true); }
});

$('btn-sair').addEventListener('click', async () => {
  await api('/api/auth/sair', { method: 'POST' }).catch(() => {});
  mostrarLogin(false);
});

// ==================== LOGIN ====================
const tokenRedefinicao = () => (location.hash.match(/^#redefinir=([0-9a-f]{64})$/) || [])[1];

function limparLinkRedefinicao() {
  history.replaceState(null, '', location.pathname + location.search);
}

function mostrarFormLogin(qual) {
  for (const f of ['entrar', 'recuperar', 'redefinir', 'primeiro-admin']) $('form-' + f).hidden = f !== qual;
}

function mostrarLogin(precisaAdmin) {
  usuarioAtual = null;
  $('tela-login').hidden = false;
  mostrarFormLogin(tokenRedefinicao() ? 'redefinir' : precisaAdmin ? 'primeiro-admin' : 'entrar');
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
  $('aviso-codigo').hidden = !!usuario.tem_codigo;
  limparFormAve();
  $('venda-data').value = hojeLocal();
  abrirPainel('painel');
  atualizarTudo();
}

async function iniciarSessao() {
  try {
    const estado = await api('/api/auth/estado');
    // Link de redefinição aberto: mostra o formulário mesmo se alguém estiver logado neste aparelho
    if (estado.usuario && !tokenRedefinicao()) mostrarSistema(estado.usuario);
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
    const r = await api('/api/auth/primeiro-admin', {
      method: 'POST',
      body: { nome: $('admin-nome').value.trim(), email: $('admin-email').value.trim(), senha: $('admin-senha').value }
    });
    $('form-primeiro-admin').reset();
    await mostrarCodigo('Seu código de recuperação', 'Se um dia esquecer a senha, use este código em "Esqueci a senha" para criar outra sem perder nada.')(r.codigo);
    iniciarSessao();
  } catch (e) {
    aviso(e.message, true);
    iniciarSessao(); // se outra pessoa já criou o administrador, mostra a tela de entrar
  }
});

$('link-esqueci').addEventListener('click', () => {
  $('recuperar-email').value = $('entrar-email').value;
  mostrarFormLogin('recuperar');
  $(($('recuperar-email').value ? 'recuperar-codigo' : 'recuperar-email')).focus();
});

$('link-voltar-entrar').addEventListener('click', () => mostrarFormLogin('entrar'));

$('form-recuperar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await api('/api/auth/recuperar', {
      method: 'POST',
      body: {
        email: $('recuperar-email').value.trim(),
        codigo: $('recuperar-codigo').value,
        nova_senha: $('recuperar-senha').value
      }
    });
    $('form-recuperar').reset();
    await mostrarCodigo('Senha alterada!', 'O código que você usou não vale mais. Este é o seu novo código de recuperação:')(r.codigo);
    iniciarSessao();
  } catch (e) { aviso(e.message, true); }
});

$('form-redefinir').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if ($('redefinir-senha').value !== $('redefinir-senha2').value) return aviso('As duas senhas não são iguais', true);
  try {
    const r = await api('/api/auth/redefinir', {
      method: 'POST',
      body: { token: tokenRedefinicao(), nova_senha: $('redefinir-senha').value }
    });
    $('form-redefinir').reset();
    limparLinkRedefinicao();
    await mostrarCodigo('Senha criada!', 'Guarde também este código de recuperação. Com ele, você cria uma senha nova sozinho se esquecer de novo.')(r.codigo);
    iniciarSessao();
  } catch (e) {
    aviso(e.message, true);
    if (/inválido|expirou/.test(e.message)) {
      limparLinkRedefinicao();
      iniciarSessao();
    }
  }
});

// ==================== INÍCIO ====================
function atualizarTudo() {
  return Promise.all([carregarEspecies(), carregarAves(), carregarTodasAves(), carregarResumo(), carregarNascimentos(),
                      carregarPainel(), carregarVendas(), carregarPix()])
    .catch(e => aviso(e.message, true));
}

// Botões das tabelas: um só controlador, sem JavaScript dentro do HTML
const ACOES = { editarAve, verFamilia, cadastrarFilhote, excluirAve, excluirEspecie, restaurarEspecie, excluirNascimento, venderAve, marcarPagamento, cancelarVenda, excluirVenda, abrirPix, linkNovaSenha, excluirUsuario };
document.addEventListener('click', (ev) => {
  const botao = ev.target.closest('[data-acao]');
  if (!botao || !ACOES[botao.dataset.acao]) return;
  ACOES[botao.dataset.acao](Number(botao.dataset.id), botao.dataset.valor);
});

// Logo: volta para a página inicial (Painel) sem recarregar o site
$('link-logo').addEventListener('click', (ev) => {
  if (!usuarioAtual) return; // fora do sistema, o link leva para a tela inicial normal
  ev.preventDefault();
  abrirPainel('painel');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Link de redefinição colado com o site já aberto
window.addEventListener('hashchange', () => {
  if (tokenRedefinicao()) iniciarSessao();
});

preencherEspecies();
iniciarSessao();
