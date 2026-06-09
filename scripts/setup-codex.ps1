$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) {
    throw "Git was not found at $git. Update scripts/setup-codex.ps1 with your local Git path."
}

& $git submodule update --init --recursive

$targetPath = Join-Path $repoRoot ".codex\root\AGENTS.md"
$linkPath = Join-Path $repoRoot "AGENTS.md"

if (-not (Test-Path $targetPath)) {
    throw "Expected private AGENTS file at $targetPath after submodule setup."
}

if (Test-Path $linkPath) {
    $existing = Get-Item $linkPath -Force
    if (($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) -and ($existing.Target -contains $targetPath -or $existing.Target -contains ".codex\root\AGENTS.md")) {
        Write-Host "AGENTS.md already points to .codex\\root\\AGENTS.md."
        exit 0
    }
    Remove-Item $linkPath -Force
}

try {
    New-Item -ItemType SymbolicLink -Path $linkPath -Target ".codex\root\AGENTS.md" -Force | Out-Null
    & $git update-index --no-skip-worktree AGENTS.md 2>$null
    Write-Host "Created AGENTS.md symbolic link."
} catch {
    try {
        New-Item -ItemType HardLink -Path $linkPath -Target $targetPath -Force | Out-Null
        & $git update-index --skip-worktree AGENTS.md
        Write-Host "Created AGENTS.md hard link and marked it skip-worktree locally."
    } catch {
        throw "Failed to create AGENTS.md link. Enable symlink support or create a file link manually to .codex/root/AGENTS.md."
    }
}
