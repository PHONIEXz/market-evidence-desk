# Market Evidence Desk Brag

This directory is a source-driven, 21-second launch video made with the Brag skill and Hyperframes 0.8.73. It shows the real site's headlines and a compact reconstruction of its research workflow. It never runs the AI agent or fetches live market data. The instrumental in composition/assets/music is generated from the accompanying Python source and uses no third-party recording.

To author locally: cd brag-output/composition && npm ci && npm run check. The check regenerates the original music and copies the pinned GSAP file into the composition.

To render on a machine with Chromium and FFmpeg: cd brag-output/composition && npm run render -- --skill brag --fps 30 --workers 1 --low-memory-mode --quality looks --output ../brag.mp4. The workflow in .github/workflows/render-brag.yml performs the full check, render, poster extraction and upload on GitHub's runner for this branch. Download the market-evidence-desk-brag artifact from the workflow run; generated video and poster are excluded from Git.

The launch workflow can be repeated for other projects: inspect the current product first, write a truthful 15–25-second Brag plan, build and check a project-specific composition, render an MP4 and poster, and keep the share copy with it. Update the content as each product changes.
