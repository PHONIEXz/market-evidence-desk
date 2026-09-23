"""Ask a research question using the published Sanity Context MCP endpoint."""

import asyncio
from contextlib import AsyncExitStack
import os
import sys

import httpx
from agents import Agent, AsyncOpenAI, OpenAIChatCompletionsModel, Runner, set_tracing_disabled
from agents.mcp import MCPServerStreamableHttp, create_static_tool_filter
from dotenv import load_dotenv

from scripts.context_config import called_tools, context_urls, initial_context_url, missing_retrievals
from scripts.model_config import configured_value, missing_settings, model_credentials


async def main() -> None:
    load_dotenv()
    question = " ".join(sys.argv[1:]).strip()
    if not question:
        raise SystemExit('Usage: python agent.py "What does the evidence say about ...?"')

    missing = missing_settings(os.environ)
    if missing:
        raise SystemExit("Set these values in .env: " + ", ".join(missing))
    mcp_url = configured_value(os.environ, "SANITY_CONTEXT_MCP_URL")
    token = configured_value(os.environ, "SANITY_ORGANIZATION_TOKEN")
    credentials = model_credentials(os.environ)

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
        model_options = {}
        if credentials[0] == "gemini":
            set_tracing_disabled(True)
            client = await stack.enter_async_context(AsyncOpenAI(
                api_key=credentials[1],
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            ))
            model_options["model"] = OpenAIChatCompletionsModel(
                model=credentials[2], openai_client=client
            )
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
            **model_options,
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
