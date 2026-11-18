<#
.SYNOPSIS
  Aplica, en orden, todos los scripts de db/migraciones (son idempotentes).
.EXAMPLE
  ./db/aplicar-migraciones.ps1 -Password 1234
#>
param(
    [string]$DbHost = "localhost",
    [int]$Port = 5432,
    [string]$Db = "asistiapp_db",
    [string]$User = "postgres",
    [string]$Password = "1234",
    [string]$Psql = "psql"
)

if (-not (Get-Command $Psql -ErrorAction SilentlyContinue)) {
    $candidato = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $candidato) { throw "No encuentro psql. Pasalo con -Psql 'C:\ruta\psql.exe' o agregalo al PATH." }
    $Psql = $candidato.FullName
}

$env:PGPASSWORD = $Password
$env:PGOPTIONS = "-c client_min_messages=warning"   # sin los avisos "ya existe, omitiendo"
$carpeta = Join-Path $PSScriptRoot "migraciones"
foreach ($f in Get-ChildItem $carpeta -Filter *.sql | Sort-Object Name) {
    Write-Host "-> $($f.Name)"
    & $Psql -h $DbHost -p $Port -U $User -d $Db -v ON_ERROR_STOP=1 -q -f $f.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falló $($f.Name)" }
}
Write-Host "Listo: $((Get-ChildItem $carpeta -Filter *.sql).Count) migraciones aplicadas a $Db."
