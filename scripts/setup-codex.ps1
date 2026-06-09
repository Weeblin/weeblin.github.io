$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$ensureScript = Join-Path $PSScriptRoot "ensure-agents-link.ps1"
$venvHookScript = Join-Path $PSScriptRoot "install-venv-agents-hook.ps1"

if (-not (Test-Path $ensureScript)) {
    throw "Expected helper script at $ensureScript."
}

Set-Location $repoRoot
& $ensureScript

if (Test-Path $venvHookScript) {
    & $venvHookScript
}
