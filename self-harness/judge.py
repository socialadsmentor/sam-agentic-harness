#!/usr/bin/env python3
"""LLM judge (Braintrust autoevals over OpenRouter).

The judgment layer for eval cases that mechanical checks cannot score.
Score + rationale print as JSON so a caller (run-eval.cjs, behavior-judge.py,
or your own script; every entry point requires --yes-send-transcripts or SAM_HARNESS_ALLOW_REMOTE_JUDGE=1 before anything is sent) can consume it.

Usage:
  python judge.py factuality --input "Q" --output "candidate" --expected "reference"
  python judge.py classify --rubric-file rubric.txt --choices '{"A":1,"B":0}' \
      --input "..." --output "candidate" [--expected "reference"]

Env:
  OPENROUTER_API_KEY   required. Read from the environment, or from a .env
                        file at $SAM_HARNESS_ENV_FILE if set, else
                        <this repo>/.env, else ~/.claude/.env.
  JUDGE_MODEL           model id passed to autoevals (default:
                        anthropic/claude-haiku-4.5, a cheap OpenRouter model).
Every result includes usage-derived cost fields from autoevals so token spend
stays visible.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Same secret shapes as scripts/secret-scanner.js, ported to Python so anything routed through
# this judge (transcript excerpts included) gets scrubbed before it leaves the machine.
_SECRET_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?:aws_secret_access_key|secret_key)\s*[=:]\s*[\"']?[A-Za-z0-9/+=]{40}[\"']?", re.I),
    re.compile(r"gh[ps]_[0-9a-zA-Z]{36}"),
    re.compile(r"gho_[0-9a-zA-Z]{36}"),
    re.compile(r"xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{20,35}"),
    re.compile(r"[sr]k_(live|test)_[0-9a-zA-Z]{24,}"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}"),
    re.compile(r"sk-ant-[a-zA-Z0-9_-]{80,}"),
    re.compile(r"[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}"),
    re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"AIza[0-9A-Za-z_-]{35}"),
    re.compile(r"SK[0-9a-fA-F]{32}"),
    re.compile(r"SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}"),
    re.compile(r"https?://[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@(?!example\.com|localhost)[a-zA-Z0-9._-]+"),
    re.compile(r"(?:api_key|apikey|secret|password|token|credential)\s*[=:]\s*[\"'][a-zA-Z0-9_\-/+=]{20,}[\"']", re.I),
]


def redact(text):
    if not text:
        return text
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub("[REDACTED]", text)
    return text


def load_env_key():
    if os.environ.get("OPENROUTER_API_KEY"):
        return os.environ["OPENROUTER_API_KEY"]
    candidates = []
    if os.environ.get("SAM_HARNESS_ENV_FILE"):
        candidates.append(Path(os.environ["SAM_HARNESS_ENV_FILE"]))
    candidates.append(Path(__file__).resolve().parent.parent / ".env")
    home = Path(os.environ.get("USERPROFILE", os.environ.get("HOME", "")))
    candidates.append(home / ".claude" / ".env")
    for env_path in candidates:
        try:
            with open(env_path, encoding="utf-8") as fh:
                for line in fh:
                    if line.startswith("OPENROUTER_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
        except OSError:
            continue
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["factuality", "classify"])
    parser.add_argument("--input", required=True,
                         help='the input text, or "-" to read it from stdin instead of argv '
                              '(argv is visible to other local processes; prefer "-" for anything '
                              'sensitive such as a transcript excerpt)')
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected", default=None)
    parser.add_argument("--rubric-file", default=None)
    parser.add_argument("--choices", default=None, help='JSON map choice->score, e.g. {"A":1,"B":0}')
    parser.add_argument("--name", default="judged_axis")
    parser.add_argument("--yes-send-transcripts", action="store_true",
                        help="Required (or SAM_HARNESS_ALLOW_REMOTE_JUDGE=1) to send the input to the remote model endpoint.")
    args = parser.parse_args()

    # Opt-in gate (same contract as behavior-judge.py): nothing leaves the machine unless the
    # caller says so explicitly. behavior-judge.py sets the env var for this child after its own gate.
    if not (args.yes_send_transcripts or os.environ.get("SAM_HARNESS_ALLOW_REMOTE_JUDGE") == "1"):
        print(json.dumps({"error": "remote judge not enabled: pass --yes-send-transcripts or set SAM_HARNESS_ALLOW_REMOTE_JUDGE=1", "score": None}))
        return 3

    key = load_env_key()
    if not key:
        print(json.dumps({"error": "OPENROUTER_API_KEY not found; judge unavailable", "score": None}))
        return 2

    os.environ["OPENAI_API_KEY"] = key
    os.environ["OPENAI_BASE_URL"] = "https://openrouter.ai/api/v1"
    model = os.environ.get("JUDGE_MODEL", "anthropic/claude-haiku-4.5")

    from autoevals import LLMClassifier
    from autoevals.llm import Factuality

    raw_input = sys.stdin.read() if args.input == "-" else args.input
    judge_input = redact(raw_input)
    judge_output = redact(args.output)
    judge_expected = redact(args.expected) if args.expected else args.expected

    if args.mode == "factuality":
        if not judge_expected:
            print(json.dumps({"error": "factuality requires --expected", "score": None}))
            return 2
        evaluator = Factuality(model=model)
        result = evaluator(judge_output, judge_expected, input=judge_input)
    else:
        if not args.rubric_file or not args.choices:
            print(json.dumps({"error": "classify requires --rubric-file and --choices", "score": None}))
            return 2
        with open(args.rubric_file, encoding="utf-8") as fh:
            rubric = redact(fh.read())
        evaluator = LLMClassifier(
            name=args.name,
            prompt_template=rubric,
            choice_scores=json.loads(args.choices),
            use_cot=True,
            model=model,
        )
        result = evaluator(judge_output, judge_expected or "", input=judge_input)

    payload = {
        "name": result.name,
        "score": result.score,
        "judge_model": model,
        "rationale": (result.metadata or {}).get("rationale"),
        "metadata": {k: v for k, v in (result.metadata or {}).items() if k != "rationale"},
    }
    print(json.dumps(payload, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
