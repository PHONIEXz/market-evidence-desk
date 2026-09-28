#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -s .agents/skills/brag/SKILL.md ]]; then
  echo 'Installing the official Brag skill for Codex in this project.'
  npx --yes skills add https://github.com/latent-spaces/brag --skill brag --agent codex -y
fi
if [[ ! -s .agents/skills/hyperframes-cli/SKILL.md ]]; then
  echo 'Installing the five official Hyperframes composition skills.'
  npx --yes skills add https://github.com/heygen-com/hyperframes --skill hyperframes-core hyperframes-animation hyperframes-creative hyperframes-keyframes hyperframes-cli --agent codex -y
fi

for skill in brag hyperframes-core hyperframes-animation hyperframes-creative hyperframes-keyframes hyperframes-cli; do
  if [[ ! -s ".agents/skills/$skill/SKILL.md" ]]; then
    echo "Missing $skill after installation." >&2
    exit 1
  fi
done
echo 'Brag and all five Hyperframes agent skills are installed in this project.'

if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  echo 'Node.js 22 or newer is required.' >&2
  exit 1
fi
for program in ffmpeg ffprobe; do
  if ! command -v "$program" >/dev/null; then
    echo "Missing $program. Install FFmpeg using your system package manager." >&2
    exit 1
  fi
done

echo "Node $(node --version); FFmpeg and FFprobe found."
if [[ "${1:-}" == '--ensure-browser' ]]; then
  echo 'Checking or downloading the Hyperframes headless browser (may use mobile data).'
  npx --yes hyperframes browser ensure
fi

doctor_json="$(npx --yes hyperframes doctor --json)"
printf '%s\n' "$doctor_json" | node -e '
  let input = "";
  process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    const checks = JSON.parse(input).checks;
    for (const name of ["Version", "Memory", "Chrome", "FFmpeg", "FFprobe"]) {
      const check = checks.find(item => item.name === name);
      console.log(`${check?.ok ? "OK" : "NEEDS ATTENTION"} ${name}: ${check?.detail ?? "not reported"}`);
      if (!check?.ok && check?.hint) console.log(`  ${check.hint}`);
    }
    const chrome = checks.find(item => item.name === "Chrome");
    if (!chrome?.ok) {
      console.log("Docker is optional for local render. To try the pinned browser, run: bash scripts/brag-ready.sh --ensure-browser");
      process.exitCode = 2;
    } else {
      console.log("Brag setup checks pass. Run a short draft render to verify this machine end to end.");
    }
  });
'
