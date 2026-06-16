# MarkItDown Demo Playground

This folder is a disposable playground for testing the local MarkItDown CLI
and MarkItDown MCP server.

Run all PowerShell commands from the repository root:

```powershell
cd D:\weeblin.github.io
```

## 1. Check the installation

Confirm that the virtual environment contains both commands:

```powershell
.\.venv\Scripts\markitdown.exe --version
.\.venv\Scripts\markitdown-mcp.exe --help
```

If either command is missing, run:

```powershell
.\scripts\setup-markitdown.ps1
```

The setup script uses the existing ignored `markitdown/` checkout, or clones
`https://github.com/microsoft/markitdown` when that directory is missing.

## 2. Demo the MarkItDown CLI

Convert the sample HTML page into Markdown:

```powershell
.\.venv\Scripts\markitdown.exe .\testTEMP\sample-page.html -o .\testTEMP\sample-page-output.md
```

Inspect the generated Markdown:

```powershell
Get-Content .\testTEMP\sample-page-output.md
```

Expected content includes:

- `MarkItDown Playground`
- a short feature list
- a link to the Microsoft MarkItDown repository
- the three rows from the demo table

The generated `sample-page-output.md` can be deleted and recreated freely.

## 3. Demo the MCP server directly

Run the included MCP client:

```powershell
.\.venv\Scripts\python.exe .\testTEMP\mcp-demo.py
```

The script starts the local STDIO server, performs the MCP handshake, lists its
tools, and calls `convert_to_markdown` on `sample-page.html`.

Expected output starts with:

```text
Available tools: convert_to_markdown
Converted URI: file:///...
```

It then prints the converted Markdown.

## 4. Demo the MCP server through Codex

Check that Codex sees the project MCP configuration:

```powershell
codex mcp list
```

The output should show an enabled server named `markitdown` using:

```text
.venv/Scripts/markitdown-mcp.exe
```

Restart Codex after the first installation or configuration change. In the new
Codex session, ask:

```text
Use the MarkItDown MCP tool to convert testTEMP/sample-page.html to Markdown,
then summarize the converted page.
```

If the agent needs an explicit file URI, generate one:

```powershell
([System.Uri](Resolve-Path .\testTEMP\sample-page.html)).AbsoluteUri
```

Then ask Codex to call `convert_to_markdown` with that URI.

## 5. Try your own files

Place test files inside `testTEMP/` and run:

```powershell
.\.venv\Scripts\markitdown.exe .\testTEMP\YOUR_FILE -o .\testTEMP\YOUR_FILE.md
```

The portable installation covers common text and web formats. Some PDF,
Office, media, and cloud-assisted converters require the optional full
dependency set:

```powershell
.\scripts\setup-markitdown.ps1 -Full
```

On Windows ARM64, the full installation may require Visual C++ Build Tools.
The base CLI and MCP demo in this folder do not require that full installation.

## 6. Cleanup

Remove generated demo output without touching the source samples:

```powershell
Remove-Item .\testTEMP\sample-page-output.md -ErrorAction SilentlyContinue
```

