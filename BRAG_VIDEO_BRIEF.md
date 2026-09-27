# Brag video: Market Evidence Desk

Run `bash scripts/brag-ready.sh` from a freshly pulled repository. It installs the official Brag skill and five Hyperframes composition skills into `.agents/skills/` for Codex if needed, checks Node.js and FFmpeg, and reports browser readiness. If the Chrome check fails, run `bash scripts/brag-ready.sh --ensure-browser` when downloads are convenient. Restart the agent after installation so it discovers the skills.

In a Codex CLI session at the repository root, use this direction:

> /brag --tone polished --format landscape --duration 24 --no-music. Build a concise contest demo for Market Evidence Desk, using the actual site UI and project code. Start with the question “Can proof of reserves prove an exchange is safe?” Show the Sanity evidence atlas, a dated source and linked claim, the Kraken company description beside the PCAOB and SEC limits, then the two attributed SEC positions on stablecoin reserves. Show a real agent answer with source links and `groq_query` / `knowledge_base_read` if an authenticated capture is available. Close with the refusal to invent a live Bitcoin price and the URL market-evidence-desk.vercel.app. Keep every factual statement attributed; no fake live feed, solvency verdict, trading advice, fabricated agent run, or private token. Use `DEMO_WALKTHROUGH.md` for the real interactions and `SUBMISSION.md` for the contest framing. Make every on-screen label readable at phone size.

Brag defaults to a 15–25 second promotional piece. It should show real project screens, not replace evidence of the live agent. For the DEV submission, pair the short video with the live demo URL, code URL, and a short genuine agent session or the longer walkthrough described in `DEMO_WALKTHROUGH.md`. The contest's mandatory entry elements are the DEV post and Sanity project ID or public dataset URL; a video is optional.

Expected output is a `brag-output/` or dated `brag-output-*/` folder with `brag.mp4`, `brag.jpg`, `brag-plan.md`, and `share-copy.txt`. Watch the finished MP4 and verify that the source names, dates, and UI match the published site before using it in the entry.
