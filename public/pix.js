// Gera o código "Pix copia e cola" (BR Code, padrão EMV do Banco Central).
// O mesmo texto vira o QR Code que o comprador lê no app do banco.

(function (global) {
  // Campo EMV: id + tamanho com 2 dígitos + valor
  function campo(id, valor) {
    return id + String(valor.length).padStart(2, '0') + valor;
  }

  // Remove acentos e caracteres que alguns bancos não aceitam
  function limpar(texto, max) {
    return String(texto || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9 .\-@]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  // CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no fim do código
  function crc16(texto) {
    let crc = 0xffff;
    for (let i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Formata a chave conforme o tipo: celular com +55, CPF/CNPJ só números, e-mail em minúsculas
  function normalizarChave(chave, tipo) {
    const c = String(chave || '').trim();
    const numeros = c.replace(/\D/g, '');
    if (tipo === 'celular') return '+' + (numeros.startsWith('55') && numeros.length >= 12 ? numeros : '55' + numeros);
    if (tipo === 'cpf' || tipo === 'cnpj') return numeros;
    if (tipo === 'email') return c.toLowerCase();
    return c; // chave aleatória
  }

  // Confere se a chave tem o formato esperado para o tipo escolhido
  function validarChave(chave, tipo) {
    const c = normalizarChave(chave, tipo);
    if (tipo === 'celular') return /^\+55\d{10,11}$/.test(c);
    if (tipo === 'cpf') return /^\d{11}$/.test(c);
    if (tipo === 'cnpj') return /^\d{14}$/.test(c);
    if (tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);
  }

  function gerarPix({ chave, tipo, nome, cidade, valor, txid, descricao }) {
    const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChave(chave, tipo)) +
      (descricao ? campo('02', limpar(descricao, 40)) : '');
    const identificador = (String(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25)) || '***';

    let codigo =
      campo('00', '01') +
      campo('26', conta) +
      campo('52', '0000') +
      campo('53', '986') +
      (valor ? campo('54', Number(valor).toFixed(2)) : '') +
      campo('58', 'BR') +
      campo('59', limpar(nome, 25).toUpperCase() || 'RECEBEDOR') +
      campo('60', limpar(cidade, 15).toUpperCase() || 'BRASIL') +
      campo('62', campo('05', identificador)) +
      '6304';
    return codigo + crc16(codigo);
  }

  global.Pix = { gerarPix, crc16, normalizarChave, validarChave };
  if (typeof module !== 'undefined') module.exports = global.Pix;
})(typeof window !== 'undefined' ? window : globalThis);
