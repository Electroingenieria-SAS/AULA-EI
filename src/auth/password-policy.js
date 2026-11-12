/**
 * The mandatory change and OTP recovery forms must apply the same checks
 * as complete-password-change/index.ts. No password is logged, stored or sent
 * to a third party from this validator.
 */
export function getPasswordPolicyChecks(password, email = '') {
  const value = String(password ?? '')
  const username = String(email || '').trim().toLowerCase().split('@')[0] || ''
  const rules = [
    {
      id: 'length',
      label: 'Entre 12 y 128 caracteres',
      valid: value.length >= 12 && value.length <= 128,
      error: value.length < 12
        ? 'Tu contraseña necesita al menos 12 caracteres.'
        : 'La contraseña no puede superar 128 caracteres.',
    },
    {
      id: 'lowercase',
      label: 'Una minúscula (a-z)',
      valid: /[a-z]/.test(value),
      error: 'Incluye al menos una letra minúscula de la a a la z.',
    },
    {
      id: 'uppercase',
      label: 'Una mayúscula (A-Z)',
      valid: /[A-Z]/.test(value),
      error: 'Incluye al menos una letra mayúscula de la A a la Z. Las letras acentuadas no sustituyen este requisito.',
    },
    {
      id: 'number',
      label: 'Un número (0-9)',
      valid: /[0-9]/.test(value),
      error: 'Incluye al menos un número del 0 al 9.',
    },
    {
      id: 'symbol',
      label: 'Un símbolo, por ejemplo ! o @',
      valid: /[^A-Za-z0-9]/.test(value),
      error: 'Incluye al menos un símbolo, por ejemplo !, @, # o %.',
    },
    {
      id: 'whitespace',
      label: 'Sin espacios ni saltos de línea',
      valid: !/\s/.test(value),
      error: 'Elimina los espacios o saltos de línea, incluidos los que se agregan al copiar y pegar.',
    },
  ]
  if (username.length >= 4) {
    rules.push({
      id: 'username',
      label: 'Sin el usuario del correo',
      valid: !value.toLowerCase().includes(username),
      error: 'La contraseña no debe contener tu usuario de correo electrónico.',
    })
  }
  return rules
}

export function validatePasswordPolicy(password, email = '') {
  return getPasswordPolicyChecks(password, email).find((rule) => !rule.valid)?.error || ''
}
