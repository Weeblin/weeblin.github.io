param(
    [switch]$SkipSubmoduleUpdate,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Host $Message
    }
}

function Write-WarnLine {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Warning $Message
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"
$targetRelative = ".codex\root\AGENTS.md"
$targetPath = Join-Path $repoRoot $targetRelative
$linkPath = Join-Path $repoRoot "AGENTS.md"

if (-not (Test-Path $git)) {
    throw "Git was not found at $git. Update scripts/ensure-agents-link.ps1 with your local Git path."
}

Set-Location $repoRoot

if (-not $SkipSubmoduleUpdate) {
    & $git submodule update --init --recursive
}

if (-not (Test-Path $targetPath)) {
    throw "Expected private AGENTS file at $targetPath. Clone the private .codex repo or initialize submodules first."
}

$resolvedTarget = (Resolve-Path $targetPath).Path

if (Test-Path $linkPath) {
    $existing = Get-Item $linkPath -Force
    $isReparse = [bool]($existing.Attributes -band [IO.FileAttributes]::ReparsePoint)
    $existingTargets = @()

    if ($isReparse -and $null -ne $existing.Target) {
        $existingTargets = @($existing.Target)
    } elseif ($existing.LinkType -eq "HardLink") {
        $existingTargets = @($existing.Target)
    }

    $hasCanonicalTarget = $existingTargets -contains $targetRelative -or $existingTargets -contains ".codex/root/AGENTS.md"
    $hasResolvedTarget = $existingTargets -contains $resolvedTarget

    if ($hasCanonicalTarget -or $hasResolvedTarget) {
        if ($existing.LinkType -eq "SymbolicLink") {
            if ($hasCanonicalTarget) {
                & $git update-index --no-skip-worktree AGENTS.md 2>$null
                Write-Info "AGENTS.md is already a relative symbolic link to $targetRelative."
            } else {
                & $git update-index --skip-worktree AGENTS.md
                Write-WarnLine "AGENTS.md points to the correct file using an absolute symlink."
                Write-WarnLine "Git tracks a portable relative symlink; use .codex/root/SETUP_NOTES.md to recreate it when convenient."
            }
        } elseif ($existing.LinkType -eq "HardLink") {
            & $git update-index --skip-worktree AGENTS.md
            Write-WarnLine "AGENTS.md is a hard link, not a symbolic link. It works locally, but a real symlink is still recommended."
        } else {
            Write-Info "AGENTS.md already points to $targetRelative."
        }
        exit 0
    }

    Remove-Item $linkPath -Force
}

try {
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $targetRelative -Force | Out-Null
    & $git update-index --no-skip-worktree AGENTS.md 2>$null
    Write-Info "Created AGENTS.md symbolic link."
    exit 0
} catch {
    try {
        New-Item -ItemType HardLink -Path $linkPath -Target $targetPath -Force | Out-Null
        & $git update-index --skip-worktree AGENTS.md
        Write-WarnLine "Created AGENTS.md hard link because symbolic links are not available in this shell."
        Write-WarnLine "To upgrade it later, rerun the commands in .codex/root/SETUP_NOTES.md from an elevated terminal or with Developer Mode enabled."
        exit 0
    } catch {
        $manual = @(
            "Manual fix required.",
            "1. Open an Administrator PowerShell in $repoRoot",
            "2. Run: Remove-Item AGENTS.md -Force",
            "3. Run: New-Item -ItemType SymbolicLink -Path AGENTS.md -Target .codex\root\AGENTS.md",
            "4. Optional: & `"$git`" config --global core.symlinks true"
        ) -join [Environment]::NewLine
        throw "Failed to create AGENTS.md link.`n$manual"
    }
}
