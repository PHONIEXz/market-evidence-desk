"""Ask a research question using the published Sanity Context MCP endpoint."""

import asyncio
from contextlib import AsyncExitStack
import os
import sys

import httpx
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp, create_static_tool_filter
from dotenv import load_dotenv

from scripts.context_config import called_tools, context_urls, initial_context_url, missing_retrievals


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

    try:
        dataset_url, knowledge_base_url = context_urls(
            mcp_url, os.environ.get("SANITY_KNOWLEDGE_BASE_ID", "").strip()
        )
    except ValueError as error:
        raise SystemExit(str(error)) from error

    endpoints = [("structured dataset", dataset_url)]
    if knowledge_base_url:
        endpoints.append(("Sourcebook Knowledge Base", knowledge_base_url))

    contexts = []
    async with httpx.AsyncClient(timeout=30) as http:
        for label, url in endpoints:
            response = await http.get(
                initial_context_url(url), headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            contexts.append(f"# {label}\n{response.text}")

    async with AsyncExitStack() as stack:
        servers = []
        for label, url in endpoints:
            server = await stack.enter_async_context(MCPServerStreamableHttp(
                name=label,
                params={"url": url, "headers": {"Authorization": f"Bearer {token}"}},
                client_session_timeout_seconds=30,
                tool_filter=create_static_tool_filter(blocked_tool_names=["initial_context"]),
            ))
            servers.append(server)
        agent = Agent(
            name="Market Evidence Desk",
            instructions=(
                "You are a cautious research assistant, not a trading adviser. "
                "For every question, use Sanity Context groq_query to read actual "
                "published content before answering. Use groq_query to "
                "retrieve the relevant research question, evidence claims, and each claim's "
                "source URL and publication date. "
                + ("Also use knowledge_base_read on relevant Sourcebook entries; the index "
                   "may lag behind the live dataset. The same SEC page or dataset claim "
                   "appearing twice is one source, not independent corroboration. "
                   if knowledge_base_url else "")
                + "Distinguish observed facts from "
                "interpretation. Present supporting and conflicting evidence separately. "
                "Include source URLs and timestamps that you actually retrieved. "
                "If the content is absent, stale, contradictory, or lacks a source, say so "
                "and do not invent an answer, URL, price, or prediction. Never place trades.\n\n"
                "# Sanity Context reference\n"
                + "\n\n".join(contexts)
            ),
            mcp_servers=servers,
        )
        result = await Runner.run(agent, question)
        names = called_tools(result.new_items)
        missing = missing_retrievals(names, require_knowledge_base=bool(knowledge_base_url))
        if missing:
            raise SystemExit("Answer withheld: the agent did not call required Sanity tools: " + ", ".join(missing))
        print("Sanity tools used: " + ", ".join(names), file=sys.stderr)
        print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())
