"""Ask a research question using the published Sanity Context MCP endpoint."""

import asyncio
import os
import sys
from urllib.parse import urlparse, urlunparse

import httpx
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp, create_static_tool_filter
from dotenv import load_dotenv


async def main() -> None:
    load_dotenv()
    question = " ".join(sys.argv[1:]).strip()
    if not question:
        raise SystemExit('Usage: python agent.py "What does the evidence say about ...?"')

    mcp_url = os.environ.get("SANITY_CONTEXT_MCP_URL")
    token = os.environ.get("SANITY_ORGANIZATION_TOKEN")
    if not mcp_url or not token or not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit(
            "Set SANITY_CONTEXT_MCP_URL, SANITY_ORGANIZATION_TOKEN, and OPENAI_API_KEY in .env"
        )

    parsed = urlparse(mcp_url)
    if parsed.scheme != "https" or parsed.hostname != "api.sanity.io":
        raise SystemExit("SANITY_CONTEXT_MCP_URL must be a Sanity HTTPS endpoint")

    initial_url = urlunparse(
        parsed._replace(path=parsed.path.rstrip("/") + "/initial-context")
    )
    async with httpx.AsyncClient(timeout=30) as http:
        response = await http.get(
            initial_url, headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        initial_context = response.text

    async with MCPServerStreamableHttp(
        name="sanity-context",
        params={
            "url": mcp_url,
            "headers": {"Authorization": f"Bearer {token}"},
        },
        client_session_timeout_seconds=30,
        tool_filter=create_static_tool_filter(blocked_tool_names=["initial_context"]),
    ) as server:
        agent = Agent(
            name="Market Evidence Desk",
            instructions=(
                "You are a cautious research assistant, not a trading adviser. "
                "For every question, use the available Sanity Context tools to read actual "
                "published content before answering. In dataset mode, use groq_query to "
                "retrieve the relevant research question, evidence claims, and each claim's "
                "source URL and publication date. In Knowledge Base mode, use "
                "knowledge_base_read on relevant entries. Distinguish observed facts from "
                "interpretation. Present supporting and conflicting evidence separately. "
                "Include source URLs and timestamps that you actually retrieved. "
                "If the content is absent, stale, contradictory, or lacks a source, say so "
                "and do not invent an answer, URL, price, or prediction. Never place trades.\n\n"
                "# Sanity Context reference\n"
                + initial_context
            ),
            mcp_servers=[server],
        )
        result = await Runner.run(agent, question)
        print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())
