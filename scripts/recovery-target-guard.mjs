import { fileURLToPath } from 'node:url'

/** Guard only. This module does not connect to, create or restore any database. */
export function validateSandboxTarget(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Falta RESTORE_TARGET_URL.')
  let target
  try { target = new URL(raw) } catch { throw new Error('La URL de restauración no es válida.') }
  if (!['postgres:', 'postgresql:'].includes(target.protocol))
    throw new Error('El destino de restauración debe utilizar PostgreSQL.')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
    throw new Error('Se prohíbe restaurar en servidores remotos o de producción.')
  const database = decodeURIComponent(target.pathname.replace(/^\//, ''))
  if (!/^aula_ei_restore_[a-z0-9_]{3,50}$/.test(database))
    throw new Error('La base de prueba debe llamarse aula_ei_restore_<identificador>.')
  if (target.searchParams.has('host') || target.searchParams.has('hostaddr') || target.searchParams.has('service'))
    throw new Error('No se permiten parámetros que redirijan la conexión.')
  return { host: target.hostname, database }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const target = validateSandboxTarget(process.env.RESTORE_TARGET_URL)
    console.log('Destino local aislado validado: ' + target.database)
    console.log('Este control NO ejecuta una restauración, solo valida el destino.')
  } catch (error) {
    console.error('Destino de recuperación rechazado: ' + error.message)
    process.exitCode = 1
  }
}
