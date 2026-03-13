/**
 * Gerador de PIX BR Code (EMV) — 100% offline, sem API, sem taxas.
 * O pagamento vai direto do app bancário do cliente para a conta do estabelecimento.
 * Baseado na especificação oficial do Banco Central do Brasil (Manual de Pagamentos Instantâneos).
 */

/** CRC-16/CCITT-FALSE — usado para validação do payload PIX */
function crc16(str) {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}

/** Formata campo EMV: ID + tamanho (2 dígitos) + valor */
function f(id, value) {
  const v = String(value)
  return `${id}${String(v.length).padStart(2, '0')}${v}`
}

/** Remove acentos e caracteres especiais (PIX só aceita ASCII) */
function toAscii(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim()
}

/**
 * Gera o payload PIX (BR Code / Copia e Cola).
 * @param {Object} params
 * @param {string} params.pixKey       - Chave PIX do estabelecimento
 * @param {string} params.merchantName - Nome do estabelecimento (máx 25 chars)
 * @param {string} params.merchantCity - Cidade (máx 15 chars)
 * @param {number} [params.amount]     - Valor em reais (opcional — se omitido, cliente digita)
 * @param {string} [params.txid]       - ID da transação (máx 25 chars alfanumérico)
 * @param {string} [params.description] - Descrição do pagamento (máx 60 chars)
 * @returns {string} payload PIX pronto para QR Code
 */
export function generatePixPayload({ pixKey, merchantName, merchantCity, amount, txid, description }) {
  if (!pixKey || !merchantName || !merchantCity) {
    throw new Error('pixKey, merchantName e merchantCity são obrigatórios')
  }

  const name = toAscii(merchantName).slice(0, 25)
  const city = toAscii(merchantCity).slice(0, 15)
  const safeTxid = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***'

  // Merchant Account Information (ID 26)
  const merchantInfo = f('00', 'BR.GOV.BCB.PIX') + f('01', pixKey.trim())
  + (description ? f('02', toAscii(description).slice(0, 60)) : '')

  // Additional Data Field (ID 62)
  const additionalData = f('05', safeTxid)

  let payload =
    f('00', '01') +                              // Payload Format Indicator
    f('01', '12') +                              // Point of Initiation: 11=static, 12=dynamic(one-use)
    f('26', merchantInfo) +                      // Merchant Account Info
    f('52', '0000') +                            // MCC (0000 = não especificado)
    f('53', '986') +                             // Currency: 986 = BRL
    (amount && amount > 0 ? f('54', amount.toFixed(2)) : '') + // Valor
    f('58', 'BR') +                              // Country Code
    f('59', name) +                              // Merchant Name
    f('60', city) +                              // Merchant City
    f('62', additionalData)                      // Additional Data

  // CRC-16 (sempre no final, ID 63, tamanho fixo 04)
  payload += f('63', crc16(payload + '6304'))

  return payload
}

/**
 * Valida uma chave PIX pelo tipo
 * @param {string} key
 * @param {string} type - 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
 * @returns {boolean}
 */
export function validatePixKey(key, type) {
  if (!key) return false
  switch (type) {
    case 'cpf':       return /^\d{11}$/.test(key.replace(/\D/g, ''))
    case 'cnpj':      return /^\d{14}$/.test(key.replace(/\D/g, ''))
    case 'email':     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
    case 'telefone':  return /^\+55\d{10,11}$/.test(key.replace(/\s/g, ''))
    case 'aleatoria': return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key)
    default:          return key.length > 0
  }
}

/** Formata chave PIX para exibição */
export function formatPixKey(key, type) {
  if (!key) return ''
  switch (type) {
    case 'cpf':
      return key.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    case 'cnpj':
      return key.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    case 'telefone':
      return key
    default:
      return key
  }
}
