param(
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$activatePath = Join-Path $repoRoot ".venv\Scripts\Activate.ps1"
$marker = "# Codex AGENTS link check"

if (-not (Test-Path $activatePath)) {
    if (-not $Quiet) {
        Write-Warning "No PowerShell venv activation script found at $activatePath. Create .venv, then rerun this script."
    }
    exit 0
}

$content = Get-Content $activatePath -Raw
if ($content.Contains($marker) -or $content.Contains("scripts\ensure-agents-link.ps1")) {
    if (-not $Quiet) {
        Write-Host "The PowerShell venv activation hook is already installed."
    }
    exit 0
}

$signatureMarker = "# SIG # Begin signature block"
$hook = @"

$marker
`$repoRootCandidate = Split-Path -Parent `$VenvDir
`$agentsEnsureScript = Join-Path `$repoRootCandidate 'scripts\ensure-agents-link.ps1'
if (Test-Path `$agentsEnsureScript) {
    try {
        & `$agentsEnsureScript -SkipSubmoduleUpdate -Quiet
    }
    catch {
        Write-Warning "AGENTS.md link check failed during venv activation: `$(`$_.Exception.Message)"
    }
}

"@

if ($content.Contains($signatureMarker)) {
    $content = $content.Replace($signatureMarker, "$hook$signatureMarker")
} else {
    $content = "$content$hook"
}

Set-Content -Path $activatePath -Value $content -Encoding UTF8

if (-not $Quiet) {
    Write-Host "Installed the AGENTS link check in .venv\Scripts\Activate.ps1."
}
