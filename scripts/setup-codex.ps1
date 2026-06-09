$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) {
    throw "Git was not found at $git. Update scripts/setup-codex.ps1 with your local Git path."
}

& $git submodule update --init --recursive

$targetPath = Join-Path $repoRoot ".codex\AGENTS.md"
$linkPath = Join-Path $repoRoot "AGENTS.md"

if (-not (Test-Path $targetPath)) {
    throw "Expected private AGENTS file at $targetPath after submodule setup."
}

if (Test-Path $linkPath) {
    $existing = Get-Item $linkPath -Force
    if ($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Remove-Item $linkPath -Force
    } else {
        throw "AGENTS.md already exists and is not a link. Move or delete it, then rerun this script."
    }
}

try {
    New-Item -ItemType SymbolicLink -Path $linkPath -Target ".codex\AGENTS.md" -Force | Out-Null
    Write-Host "Created AGENTS.md symbolic link."
} catch {
    try {
        New-Item -ItemType HardLink -Path $linkPath -Target $targetPath -Force | Out-Null
        Write-Host "Created AGENTS.md hard link."
    } catch {
        throw "Failed to create AGENTS.md link. Enable symlink support or create a file link manually to .codex/AGENTS.md."
    }
}
