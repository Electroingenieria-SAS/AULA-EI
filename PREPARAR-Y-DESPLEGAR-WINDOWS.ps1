$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Banner {
    Clear-Host
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ' AULA EI - ASISTENTE DE ENTREGA / DOMINIO / VERCEL' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ''
}

function Require-Command($name, $help) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "FALTA: $name" -ForegroundColor Red
        Write-Host $help -ForegroundColor Yellow
        return $false
    }
    return $true
}

function Verify-Project {
    Banner
    Write-Host '1) Verificando Node.js y estructura...' -ForegroundColor Green
    if (-not (Require-Command 'node' 'Instale Node.js 18 o superior y vuelva a ejecutar este asistente.')) { return }
    node --version
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host '2) Ejecutando npm run verify...' -ForegroundColor Green
        npm run verify
    } else {
        Write-Host 'npm no está disponible; ejecutando verificador directamente...' -ForegroundColor Yellow
        node scripts/verify-static.mjs
    }
    Write-Host ''
    Write-Host 'VERIFICACION TERMINADA.' -ForegroundColor Green
    Write-Host 'Lea docs\ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md antes de modificar infraestructura.'
}

function Serve-Local {
    Banner
    if (-not (Require-Command 'node' 'Instale Node.js 18 o superior.')) { return }
    Write-Host 'Abriendo servidor local. Para detenerlo use Ctrl+C.' -ForegroundColor Green
    node scripts/serve-static.mjs
}

function Deploy-Vercel {
    Banner
    if (-not (Require-Command 'node' 'Instale Node.js 18 o superior.')) { return }
    if (-not (Require-Command 'npx' 'Instale Node.js/npm para utilizar el CLI de Vercel.')) { return }
    Write-Host 'Primero se validará el paquete...' -ForegroundColor Green
    node scripts/verify-static.mjs
    Write-Host ''
    Write-Host 'Se abrirá el flujo oficial de Vercel.' -ForegroundColor Cyan
    Write-Host 'IMPORTANTE: vincule el proyecto correcto de AULA-EI y no cree duplicados sin necesidad.' -ForegroundColor Yellow
    Write-Host 'Después del deploy, agregue el dominio desde Settings > Domains y copie los DNS exactos que Vercel muestre.' -ForegroundColor Yellow
    Write-Host ''
    $go = Read-Host '¿Continuar con npx vercel --prod? (S/N)'
    if ($go -match '^[sS]$') {
        npx vercel@latest --prod
    }
}

function Open-Docs {
    Banner
    $doc = Join-Path $Root 'docs\ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md'
    Write-Host "Documento principal: $doc" -ForegroundColor Green
    Start-Process $doc
}

while ($true) {
    Banner
    Write-Host 'Seleccione una opción:'
    Write-Host '  1. Verificar paquete (recomendado primero)'
    Write-Host '  2. Ejecutar Aula EI localmente'
    Write-Host '  3. Desplegar a Vercel (interactivo)'
    Write-Host '  4. Abrir documentación técnica'
    Write-Host '  5. Salir'
    Write-Host ''
    $choice = Read-Host 'Opción'
    switch ($choice) {
        '1' { Verify-Project; Read-Host 'Enter para volver al menú' | Out-Null }
        '2' { Serve-Local; Read-Host 'Enter para volver al menú' | Out-Null }
        '3' { Deploy-Vercel; Read-Host 'Enter para volver al menú' | Out-Null }
        '4' { Open-Docs; Read-Host 'Enter para volver al menú' | Out-Null }
        '5' { break }
        default { Write-Host 'Opción inválida.' -ForegroundColor Yellow; Start-Sleep -Seconds 1 }
    }
    if ($choice -eq '5') { break }
}
