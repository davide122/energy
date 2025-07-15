import { parseISO, isValid, format, parse } from 'date-fns';

/**
 * Formatta una data in modo sicuro gestendo tutti i casi edge
 * @param {string|Date|null|undefined} value - Il valore da formattare
 * @param {string} pattern - Il pattern di output (default: 'dd/MM/yyyy')
 * @param {string} inputPattern - Pattern per parsing stringhe custom
 * @returns {string} Data formattata o fallback
 */
export function formatDate(value, pattern = 'dd/MM/yyyy', inputPattern = null) {
  // Nessun log necessario
  
  let d;
  
  // Gestione valori null/undefined
  if (!value) {
    return '—';
  }
  
  try {
    if (inputPattern) {
      // Stringhe con pattern custom, es. "06-07-2025"
      d = parse(value, inputPattern, new Date());
    } else if (typeof value === 'string') {
      // Gestione formati database: '2025-07-05 15:54:22.529' o '2026-07-05 00:00:00'
      // parseISO gestisce automaticamente questi formati ISO
      d = parseISO(value.replace(' ', 'T')); // Converte spazio in T per ISO standard
      
      // Fallback: se parseISO fallisce, prova con new Date()
      if (!isValid(d)) {
        d = new Date(value);
      }
    } else {
      // Oggetto Date
      d = value;
    }
    
    // Validazione finale
    if (isValid(d)) {
      return format(d, pattern);
    } else {
      return '—';
    }
  } catch (error) {
    return '—';
  }
}

/**
 * Versione ultra-sicura con try/catch per produzione
 * @param {string|Date|null|undefined} value - Il valore da formattare
 * @param {string} pattern - Il pattern di output
 * @param {string} inputPattern - Pattern per parsing stringhe custom
 * @returns {string} Data formattata o fallback
 */
export function safeFormatDate(value, pattern = 'dd/MM/yyyy', inputPattern = null) {
  try {
    return formatDate(value, pattern, inputPattern);
  } catch (error) {
    return '—';
  }
}

/**
 * Verifica se una data è valida
 * @param {string|Date|null|undefined} value - Il valore da verificare
 * @returns {boolean} True se la data è valida
 */
export function isValidDate(value) {
  if (!value) return false;
  
  try {
    let d;
    if (typeof value === 'string') {
      d = parseISO(value);
    } else {
      d = value;
    }
    return isValid(d);
  } catch {
    return false;
  }
}