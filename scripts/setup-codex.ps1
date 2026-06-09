param(
    [switch]$InstallMarkItDown,
    [switch]$UpdateMarkItDown,
    [switch]$FullMarkItDown
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$ensureScript = Join-Path $PSScriptRoot "ensure-agents-link.ps1"
$venvHookScript = Join-Path $PSScriptRoot "install-venv-agents-hook.ps1"
$markitdownSetupScript = Join-Path $PSScriptRoot "setup-markitdown.ps1"

if (-not (Test-Path $ensureScript)) {
    throw "Expected helper script at $ensureScript."
}

Set-Location $repoRoot
& $ensureScript

if (Test-Path $venvHookScript) {
    & $venvHookScript
}

if ($InstallMarkItDown -or $UpdateMarkItDown) {
    if (-not (Test-Path $markitdownSetupScript)) {
        throw "Expected MarkItDown setup script at $markitdownSetupScript."
    }

    & $markitdownSetupScript -Update:$UpdateMarkItDown -Full:$FullMarkItDown
}
