import asyncio
import os
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main() -> None:
    playground = Path(__file__).resolve().parent
    repo_root = playground.parent
    server = repo_root / ".venv" / "Scripts" / "markitdown-mcp.exe"
    sample = playground / "sample-page.html"

    if not server.exists():
        raise SystemExit(
            "MarkItDown MCP is not installed. Run scripts/setup-markitdown.ps1."
        )

    environment = os.environ.copy()
    environment["PYTHONUTF8"] = "1"
    environment["PYTHONIOENCODING"] = "utf-8"

    parameters = StdioServerParameters(
        command=str(server),
        args=[],
        env=environment,
    )

    async with stdio_client(parameters) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("Available tools:", ", ".join(tool.name for tool in tools.tools))

            uri = sample.as_uri()
            result = await session.call_tool(
                "convert_to_markdown",
                {"uri": uri},
            )

            print("Converted URI:", uri)
            for item in result.content:
                text = getattr(item, "text", None)
                if text:
                    print(text)


if __name__ == "__main__":
    asyncio.run(main())
