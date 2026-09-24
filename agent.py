"""Ask a research question using the published Sanity Context MCP endpoint."""

import asyncio
from contextlib import AsyncExitStack
import os
import sys

import httpx
from agents import Agent, AsyncOpenAI, ModelSettings, OpenAIChatCompletionsModel, Runner, set_tracing_disabled
from agents.mcp import MCPServerStreamableHttp, create_static_tool_filter
from dotenv import load_dotenv
from openai import InternalServerError

from scripts.context_config import called_tools, context_urls, initial_context_url, missing_retrievals, sourcebook_id
from scripts.model_config import configured_value, fallback_model, missing_settings, model_credentials

CASES = {
    "compare": (
        "For the Sanity research question about proof-of-reserves scope, compare what "
        "Kraken said customers could check in its 2022 snapshot with what the SEC "
        "and PCAOB staff said proof-of-reserves reports cannot establish in 2023. "
        "Follow the linked evidence claims to all three original source records. "
        "Give each source's title, publication date, and URL. Label Kraken's "
        "description as its company account, not independent verification. "
        "Say whether these historical sources establish any exchange's solvency today."
    ),
    "price": (
        "What is Bitcoin's price right now, and should I buy it today? "
        "Use only the Sanity dataset and Sourcebook available to you."
    ),
}

# Read the complete small published evidence graph. This is executed through
# Sanity Context, so the model never has to decide whether to fetch evidence.
EVIDENCE_QUERY = (
    '*[_type in ["marketEvent", "evidenceClaim", "source"]][0...40]'
    '{_id,_type,title,summary,text,stance,review,publishedAt,url,kind,notes,'
    '"source":source->{_id,title,url,publishedAt,kind,notes},'
    '"event":event->{_id,title,summary,review}}'
)


def tool_text(result):
    """Use only successful, nonempty MCP responses as evidence."""
    if result.is_error:
        raise RuntimeError("The Sanity Context query failed.")
    content = "\n".join(
        block.text for block in result.content
        if getattr(block, "type", None) == "text" and getattr(block, "text", None)
    ).strip()
    if not content:
        raise RuntimeError("Sanity Context returned no published evidence.")
    return content


def resolve_question(arguments):
    if arguments and arguments[0] == "--case":
        if len(arguments) != 2 or arguments[1] not in CASES:
            raise SystemExit("Choose --case compare or --case price")
        return CASES[arguments[1]]
    return " ".join(arguments).strip()


async def research_answer(question: str) -> dict:
    """Run the same source-checked agent for the CLI and hosted demo."""
    if not question:
        raise ValueError("A research question is required")

    missing = missing_settings(os.environ)
    if missing:
        raise ValueError("Missing agent settings: " + ", ".join(missing))
    mcp_url = configured_value(os.environ, "SANITY_CONTEXT_MCP_URL")
    token = configured_value(os.environ, "SANITY_ORGANIZATION_TOKEN")
    credentials = model_credentials(os.environ)

    dataset_url, knowledge_base_url = context_urls(
        mcp_url, sourcebook_id(os.environ)
    )

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

    instructions = (
        "You are a cautious research assistant, not a trading adviser. "
        "For every question, use Sanity Context groq_query to read actual "
        "published content before answering. Use groq_query to "
        "retrieve the relevant research question, evidence claims, and the actual "
        "source record including its url and publishedAt fields. "
        + ("Also use knowledge_base_read on relevant Sourcebook entries; the index "
           "may lag behind the live dataset. The same SEC page or dataset claim "
           "appearing twice is one source, not independent corroboration. "
           if knowledge_base_url else "")
        + "Distinguish observed facts from "
        "interpretation. Present supporting and conflicting evidence separately. "
        "For a comparison, follow the research question to each evidence claim "
        "and then to its source. Identify each source's origin and stance; "
        "include the title, publication date, and URL for each retrieved source. "
        "A company's description of its own process is company context, not "
        "independent verification. If the Knowledge Base lacks a recently added "
        "source, disclose the gap and use GROQ for the published record. "
        "Include an explicit 'Publication date:' calendar date and 'Source URL:' "
        "copied from the retrieved source record. Write the URL as plain https:// "
        "without backslash escapes. Do not infer the publication date from the question. "
        "If publishedAt is missing, say that the publication date is unverified. "
        "Include only timestamps that you actually retrieved. "
        "If the content is absent, stale, contradictory, or lacks a source, say so "
        "and do not invent an answer, URL, price, or prediction. Never place trades.\n\n"
        "# Sanity Context reference\n"
        + "\n\n".join(contexts)
    )

    async def run_with_fresh_mcp(model_options):
        # A failed Runner.run can close MCP sessions; retries need new connections.
        async with AsyncExitStack() as mcp_stack:
            dataset = await mcp_stack.enter_async_context(MCPServerStreamableHttp(
                name="structured dataset",
                params={"url": dataset_url, "headers": {"Authorization": f"Bearer {token}"}},
                client_session_timeout_seconds=30,
            ))
            published = tool_text(await dataset.call_tool("groq_query", {"query": EVIDENCE_QUERY}))
            if "evidenceClaim" not in published or "source" not in published:
                raise RuntimeError("Sanity Context returned no usable evidence graph.")

            names = ["groq_query"]
            sourcebook = "No Sourcebook Knowledge Base is configured."
            if knowledge_base_url:
                knowledge_base = await mcp_stack.enter_async_context(MCPServerStreamableHttp(
                    name="Sourcebook Knowledge Base",
                    params={"url": knowledge_base_url, "headers": {"Authorization": f"Bearer {token}"}},
                    client_session_timeout_seconds=30,
                    tool_filter=create_static_tool_filter(allowed_tool_names=["knowledge_base_read"]),
                ))
                reader = Agent(
                    name="Sourcebook reader",
                    instructions=("Read the Sourcebook entries relevant to the question using "
                                  "knowledge_base_read. Copy entry paths exactly from the "
                                  "Sourcebook outline below; never invent paths. "
                                  "After the tool returns, report the relevant content "
                                  "and any missing or stale coverage.\n\n" + contexts[-1]),
                    mcp_servers=[knowledge_base],
                    model_settings=ModelSettings(tool_choice="required"),
                    **model_options,
                )
                read = await Runner.run(reader, question, max_turns=4)
                read_names = called_tools(read.new_items)
                if not any(name.endswith("knowledge_base_read") for name in read_names):
                    raise RuntimeError("Answer withheld: the agent did not call required Sanity tools: knowledge_base_read")
                if not isinstance(read.final_output, str) or not read.final_output.strip():
                    raise RuntimeError("The Sourcebook returned no readable evidence.")
                sourcebook = read.final_output
                names.extend(read_names)

            agent = Agent(
                name="Market Evidence Desk",
                instructions=instructions + "\nUse only the retrieved evidence supplied with the question; "
                             "both Sanity tools were called before synthesis.",
                **model_options,
            )
            result = await Runner.run(
                agent, f"Question: {question}\n\n# Published Sanity evidence graph\n{published}"
                       f"\n\n# Sourcebook entries read through knowledge_base_read\n{sourcebook}",
                max_turns=2,
            )
            return result, names

    async with AsyncExitStack() as client_stack:
        model_options = {}
        if credentials[0] == "gemini":
            set_tracing_disabled(True)
            client = await client_stack.enter_async_context(AsyncOpenAI(
                api_key=credentials[1],
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                max_retries=1,
            ))
            model_options["model"] = OpenAIChatCompletionsModel(
                model=credentials[2], openai_client=client
            )
        try:
            result, names = await run_with_fresh_mcp(model_options)
        except InternalServerError as error:
            if credentials[0] != "gemini" or error.status_code != 503:
                raise
            alternative = fallback_model(os.environ, credentials[2], error.status_code)
            if alternative:
                print(f"Gemini {credentials[2]} is overloaded; trying {alternative}.", file=sys.stderr)
                alternative_options = {"model": OpenAIChatCompletionsModel(
                    model=alternative, openai_client=client
                )}
                try:
                    result, names = await run_with_fresh_mcp(alternative_options)
                except InternalServerError as fallback_error:
                    if fallback_error.status_code != 503:
                        raise
                    raise RuntimeError(
                        "Gemini is temporarily overloaded on both models. "
                        "Try again later or set GEMINI_MODEL to another available model in .env."
                    ) from None
            else:
                raise RuntimeError(
                    "Gemini is temporarily overloaded. Try again later or change "
                    "GEMINI_MODEL in .env."
                ) from None
        missing = missing_retrievals(names, require_knowledge_base=bool(knowledge_base_url))
        if missing:
            raise RuntimeError("Answer withheld: the agent did not call required Sanity tools: " + ", ".join(missing))
        if not isinstance(result.final_output, str) or not result.final_output.strip():
            raise RuntimeError("Answer withheld: the agent returned no text.")
        return {"answer": result.final_output, "tools": names}


async def main() -> None:
    load_dotenv()
    question = resolve_question(sys.argv[1:])
    if not question:
        raise SystemExit('Usage: python agent.py --case compare | --case price | "Your question"')
    try:
        result = await research_answer(question)
    except (ValueError, RuntimeError) as error:
        raise SystemExit(str(error)) from None
    print("Sanity tools used: " + ", ".join(result["tools"]), file=sys.stderr)
    print(result["answer"])


if __name__ == "__main__":
    asyncio.run(main())
