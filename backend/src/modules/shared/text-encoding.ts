import { ValidationError } from './errors.js';

/** Reject text that has already lost characters before reaching the API. */
export function validateTextEncoding(fields: Record<string, unknown>): void {
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.includes('\uFFFD')) {
      throw new ValidationError(
        `O campo ${field} contém caracteres corrompidos (�). Envie o texto em UTF-8 para preservar acentos e símbolos.`
      );
    }
  }
}
