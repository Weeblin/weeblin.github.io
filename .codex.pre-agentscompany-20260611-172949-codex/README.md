# Codex Setup Notes

These steps are the manual fallback for a fresh machine after cloning the public repo and the private `.codex` repo into the correct place.

## 1. Clone the public repo

Clone the website repo to the directory you want to work in.

```powershell
git clone git@github.com:Weeblin/weeblin.github.io.git
cd weeblin.github.io
```

## 2. Fetch the private `.codex` repo

If the public repo already contains the submodule metadata, initialize it:

```powershell
git submodule update --init --recursive
```

If you need to repair it manually, make sure the private repo exists at `.codex`.

## 3. Run the automated link check

From the repo root:

```powershell
.\scripts\ensure-agents-link.ps1
```

This script will:

- initialize the `.codex` submodule if needed
- check whether `AGENTS.md` points to `.codex/root/AGENTS.md`
- create a symbolic link if Windows allows it
- fall back to a hard link if symlink creation is blocked

## 4. If Windows blocks symlink creation

Open an **Administrator PowerShell** in the repo root and run:

```powershell
Remove-Item AGENTS.md -Force
New-Item -ItemType SymbolicLink -Path AGENTS.md -Target .codex\root\AGENTS.md
Get-Item AGENTS.md | Format-List Name,Attributes,LinkType,Target
```

You want the final command to show:

```text
LinkType : SymbolicLink
```

## 5. Optional Git setting for better Windows behavior

Still in an elevated PowerShell:

```powershell
& "C:\Program Files\Git\cmd\git.exe" config --global core.symlinks true
```

Then refresh the tracked root file:

```powershell
& "C:\Program Files\Git\cmd\git.exe" update-index --no-skip-worktree AGENTS.md
Remove-Item AGENTS.md -Force
& "C:\Program Files\Git\cmd\git.exe" checkout -- AGENTS.md
```

## 6. Optional non-admin route

On newer Windows versions, enabling **Developer Mode** may allow symbolic link creation without running PowerShell as Administrator.

## 7. Venv convenience

The `.venv` directory is local and ignored by Git, so install the activation hook after creating or recreating the virtual environment:

```powershell
.\scripts\install-venv-agents-hook.ps1
```

After that, activating `.venv\Scripts\Activate.ps1` runs the AGENTS link checker automatically. The first real symlink upgrade may still require admin rights or Developer Mode.

## 8. Optional MarkItDown MCP

This project can use Microsoft's [MarkItDown](https://github.com/microsoft/markitdown) MCP server to convert supported local files and URLs to Markdown.

The upstream repository is cloned locally into `markitdown/`. That directory is intentionally ignored by the public repo and is not synchronized through either project repository.

To clone MarkItDown when it is missing and install both `markitdown` and `markitdown-mcp` from that checkout into the project `.venv`, run:

```powershell
.\scripts\setup-markitdown.ps1
```

The same optional setup is available through the main bootstrap:

```powershell
.\scripts\setup-codex.ps1 -InstallMarkItDown
```

To fast-forward the local upstream checkout before reinstalling:

```powershell
.\scripts\setup-markitdown.ps1 -Update
```

The default installation includes MarkItDown's portable base converters. To request every optional converter dependency:

```powershell
.\scripts\setup-markitdown.ps1 -Full
```

Some platforms, including Windows ARM64, may require Visual C++ Build Tools or other native dependencies for the full installation. If the full install fails, rerun without `-Full`.

Codex reads the MarkItDown MCP entry from `.codex/config.toml` and launches `.venv/Scripts/markitdown-mcp.exe` directly. Restart Codex after the first installation so the new MCP server is discovered.

The MCP server runs locally over STDIO and inherits the current user's file and network access. Only use it with trusted agents and trusted files.
