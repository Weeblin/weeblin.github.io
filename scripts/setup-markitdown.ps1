param(
    [switch]$Update,
    [switch]$Full
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $repoRoot ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"
$markitdownPath = Join-Path $repoRoot "markitdown"
$markitdownRemote = "https://github.com/microsoft/markitdown.git"

function Find-Git {
    $gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($gitCommand) {
        return $gitCommand.Source
    }

    $knownPath = "C:\Program Files\Git\cmd\git.exe"
    if (Test-Path $knownPath) {
        return $knownPath
    }

    throw "Git was not found. Install Git for Windows or add git.exe to PATH."
}

function New-ProjectVenv {
    $pyLauncher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        & $pyLauncher.Source -3 -m venv $venvPath
        return
    }

    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) {
        & $python.Source -m venv $venvPath
        return
    }

    throw "Python 3.10 or newer was not found. Install Python, then rerun this script."
}

Set-Location $repoRoot
$git = Find-Git

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating project virtual environment at .venv..."
    New-ProjectVenv
}

if (-not (Test-Path $venvPython)) {
    throw "The virtual environment was not created successfully at $venvPath."
}

if (-not (Test-Path $markitdownPath)) {
    Write-Host "Cloning Microsoft MarkItDown into the ignored markitdown directory..."
    & $git clone $markitdownRemote $markitdownPath
} elseif (-not (Test-Path (Join-Path $markitdownPath ".git"))) {
    throw "$markitdownPath exists but is not a Git checkout. Move it aside and rerun this script."
} else {
    Write-Host "Using the existing local MarkItDown checkout."
}

if ($Update) {
    Write-Host "Updating the local MarkItDown checkout..."
    & $git -C $markitdownPath pull --ff-only
}

$corePackage = Join-Path $markitdownPath "packages\markitdown"
$mcpPackage = Join-Path $markitdownPath "packages\markitdown-mcp"

if (-not (Test-Path (Join-Path $corePackage "pyproject.toml")) -or -not (Test-Path (Join-Path $mcpPackage "pyproject.toml"))) {
    throw "The MarkItDown checkout does not contain the expected local packages."
}

Write-Host "Installing MarkItDown and MarkItDown MCP into .venv..."
if ($Full) {
    & $venvPython -m pip install --editable "$corePackage[all]" --editable $mcpPackage
} else {
    # The MCP package declares markitdown[all]. Install its runtime separately
    # so Windows ARM64 does not require native build tools for optional formats.
    & $venvPython -m pip install --editable $corePackage "mcp~=1.8.0"
    if ($LASTEXITCODE -ne 0) {
        throw "MarkItDown base dependency installation failed."
    }

    & $venvPython -m pip install --no-deps --editable $mcpPackage
}

if ($LASTEXITCODE -ne 0) {
    if ($Full) {
        throw "Full MarkItDown installation failed. Retry without -Full for the portable base installation."
    }
    throw "MarkItDown MCP installation failed."
}

& $venvPython -c "import markitdown, markitdown_mcp"
if ($LASTEXITCODE -ne 0) {
    throw "MarkItDown MCP installation verification failed."
}

Write-Host "MarkItDown MCP is installed in .venv."
Write-Host "Codex will launch .venv\Scripts\markitdown-mcp.exe directly."
if (-not $Full) {
    Write-Host "Base converters are installed. Rerun with -Full to request all optional format dependencies."
}
