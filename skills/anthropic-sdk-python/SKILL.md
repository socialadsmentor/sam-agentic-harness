---
name: anthropic-sdk-python
description: 'Reference for the official Anthropic Python SDK (`anthropic` on PyPI, Python 3.9+, MIT). Covers client setup, the Messages API, streaming, async clients, tool use, and error handling. Use when writing or debugging Python code that calls the Claude API. Triggers: python sdk, anthropic python, claude api python, messages api, streaming completion, async anthropic client.'
---

# Anthropic Python SDK Reference

## Overview

The **Anthropic Python SDK** (`anthropic`) provides access to the Claude API from Python applications. It is the official SDK maintained by Anthropic, built on `httpx` with full type annotations, async support, streaming, and automatic retries.

- **Package:** `anthropic` on PyPI
- **Version:** 0.84.0 (as of last fetch)
- **Python:** 3.9+
- **License:** MIT
- **Repo:** https://github.com/anthropics/anthropic-sdk-python
- **Docs:** https://platform.claude.com/docs/en/api/sdks/python

### Dependencies

- `httpx` (>=0.25.0, <1)
- `pydantic` (>=1.9.0, <3)
- `typing-extensions` (>=4.10, <5)
- `anyio` (>=3.5.0, <5)
- `jiter` (>=0.4.0, <1)

---

## Installation

```bash
# Standard install
pip install anthropic

# With MCP helpers (Python 3.10+)
pip install anthropic[mcp]

# With Bedrock support
pip install anthropic[bedrock]

# With Vertex AI support
pip install anthropic[vertex]
```

---

## Client Initialization

### Sync Client

```python
import anthropic

# Uses ANTHROPIC_API_KEY env var by default
client = anthropic.Anthropic()

# Explicit API key
client = anthropic.Anthropic(api_key="sk-ant-...")

# With custom settings
client = anthropic.Anthropic(
    api_key="sk-ant-...",
    base_url="https://custom-endpoint.example.com",  # or ANTHROPIC_BASE_URL env var
    timeout=60.0,          # request timeout in seconds (default: 600)
    max_retries=3,         # retry count (default: 2)
    default_headers={"X-Custom": "value"},
    default_query={"param": "value"},
)
```

### Async Client

```python
import anthropic

client = anthropic.AsyncAnthropic()
# Same constructor parameters as sync client
```

### Cloud Provider Clients

```python
# AWS Bedrock
from anthropic import AnthropicBedrock
client = AnthropicBedrock()

# Google Vertex AI
from anthropic import AnthropicVertex
client = AnthropicVertex()
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key (required unless passed explicitly) |
| `ANTHROPIC_BASE_URL` | Custom API base URL |
| `ANTHROPIC_LOG` | Set to `debug` for verbose logging |

---

## Messages API (Core)

### Basic Message

```python
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude"}
    ],
)
print(message.content)  # list of ContentBlock
print(message.content[0].text)  # first text block
```

### Multi-turn Conversation

```python
message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    system="You are a helpful assistant.",
    messages=[
        {"role": "user", "content": "What is Python?"},
        {"role": "assistant", "content": "Python is a programming language..."},
        {"role": "user", "content": "What are its main features?"},
    ],
)
```

### Message Response Object

```python
message.id           # "msg_..."
message.type         # "message"
message.role         # "assistant"
message.content      # list[ContentBlock] - TextBlock, ToolUseBlock, ThinkingBlock
message.model        # model used
message.stop_reason  # "end_turn", "max_tokens", "tool_use", "stop_sequence"
message.usage        # Usage object
message.usage.input_tokens
message.usage.output_tokens
```

---

## Streaming

### Stream Helper (Recommended)

```python
# Sync
with client.messages.stream(
    max_tokens=1024,
    messages=[{"role": "user", "content": "Say hello!"}],
    model="claude-sonnet-4-5-20250929",
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

# Get the accumulated final message
final = stream.get_final_message()
```

### Async Stream Helper

```python
async with client.messages.stream(
    max_tokens=1024,
    messages=[{"role": "user", "content": "Say hello!"}],
    model="claude-sonnet-4-5-20250929",
) as stream:
    async for text in stream.text_stream:
        print(text, end="", flush=True)

accumulated = await stream.get_final_message()
```

### Stream Events

```python
with client.messages.stream(...) as stream:
    for event in stream:
        if event.type == "text":
            print(event.text)          # delta text
            print(event.snapshot)      # accumulated text so far
        elif event.type == "input_json":
            print(event.partial_json)  # tool input delta
            print(event.snapshot)      # accumulated JSON string
        elif event.type == "content_block_stop":
            print(event.content_block) # full ContentBlock
        elif event.type == "message_stop":
            print(event.message)       # full Message
```

### Stream Methods

- `stream.text_stream` - iterator over text deltas only
- `stream.get_final_message()` - blocks until done, returns accumulated Message
- `stream.get_final_text()` - blocks until done, returns concatenated text
- `stream.close()` - cancel the stream early
- `stream.until_done()` - blocks until stream consumed

### Raw Stream (Lower-Level)

```python
# Returns iterable of raw SSE events, uses less memory
stream = client.messages.create(
    ...,
    stream=True,
)
for event in stream:
    # RawMessageStartEvent, RawContentBlockDeltaEvent, etc.
    print(event)
```

---

## Tool Use (Function Calling)

### Manual Tool Definition

```python
from anthropic.types import ToolParam, MessageParam

tools: list[ToolParam] = [
    {
        "name": "get_weather",
        "description": "Get the current weather in a city",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["city"],
        },
    }
]

message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What is the weather in SF?"}],
)

# Check for tool use
for block in message.content:
    if block.type == "tool_use":
        print(block.name)   # "get_weather"
        print(block.input)  # {"city": "SF"}
        print(block.id)     # tool use ID for result
```

### Returning Tool Results

```python
# After getting tool_use, call your function, then send result back
messages = [
    {"role": "user", "content": "What is the weather in SF?"},
    {"role": "assistant", "content": message.content},  # contains tool_use block
    {
        "role": "user",
        "content": [
            {
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": [{"type": "text", "text": "The weather is 73f"}],
            }
        ],
    },
]

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    tools=tools,
    messages=messages,
)
```

### @beta_tool Decorator (Automatic Schema)

```python
from anthropic import beta_tool

@beta_tool
def sum(left: int, right: int) -> str:
    """Adds two integers together.
    Args:
        left (int): The first integer to add.
        right (int): The second integer to add.
    Returns:
        int: The sum of left and right integers.
    """
    return str(left + right)

# Use as dict for manual API calls
message = client.beta.messages.create(
    tools=[sum.to_dict()],
    max_tokens=1024,
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "What is 2 + 2?"}],
)
```

### Tool Runner (Auto-Execution)

```python
runner = client.beta.messages.tool_runner(
    max_tokens=1024,
    model="claude-sonnet-4-5-20250929",
    tools=[sum],
    messages=[{"role": "user", "content": "What is 9 + 10?"}],
)
for message in runner:
    print(message)  # handles tool calls automatically
```

### ToolError

```python
from anthropic.lib.tools import ToolError

@beta_tool
def my_tool(url: str) -> str:
    """Does something."""
    if not valid(url):
        raise ToolError(f"Invalid URL: {url}")
    # ToolError can also include content blocks (images, etc.)
    raise ToolError([
        {"type": "text", "text": "Error details"},
        {"type": "image", "source": {"type": "base64", "data": img_data, "media_type": "image/png"}},
    ])
```

---

## Web Search (Server-Side Tool)

```python
message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{"role": "user", "content": "What's the weather in New York?"}],
    tools=[
        {
            "name": "web_search",
            "type": "web_search_20250305",
        }
    ],
)

# Access search usage
if message.usage.server_tool_use:
    print(f"Web search requests: {message.usage.server_tool_use.web_search_requests}")
```

---

## Vision (Image Input)

### Base64 Image

```python
import base64
from pathlib import Path

image_data = base64.standard_b64encode(Path("image.png").read_bytes()).decode("utf-8")

message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    },
                },
            ],
        }
    ],
)
```

### URL Image

```python
message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Describe this image"},
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": "https://example.com/image.jpg",
                    },
                },
            ],
        }
    ],
)
```

Supported formats: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

---

## Extended Thinking

```python
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=3200,
    thinking={"type": "enabled", "budget_tokens": 1600},
    messages=[{"role": "user", "content": "Solve this complex problem..."}],
)

for block in response.content:
    if block.type == "thinking":
        print(f"Thinking: {block.thinking}")
    elif block.type == "text":
        print(f"Response: {block.text}")
```

---

## Structured Outputs (Pydantic Parsing)

```python
import pydantic
import anthropic

class Order(pydantic.BaseModel):
    product_name: str
    price: float
    quantity: int

client = anthropic.Anthropic()

parsed_message = client.messages.parse(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Extract: 2 packs of Green Tea at $5.50 each"}],
    max_tokens=1024,
    output_format=Order,
)

print(parsed_message.parsed_output)  # Order(product_name='Green Tea', price=5.5, quantity=2)
```

---

## Prompt Caching

```python
message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "Very long system prompt here...",
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[{"role": "user", "content": "Question about the system prompt"}],
)

# Check cache usage
print(message.usage.cache_creation_input_tokens)
print(message.usage.cache_read_input_tokens)
```

---

## Message Batches API

### Create a Batch

```python
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": "req-1",
            "params": {
                "model": "claude-sonnet-4-5-20250929",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Hello!"}],
            },
        },
        {
            "custom_id": "req-2",
            "params": {
                "model": "claude-sonnet-4-5-20250929",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Hi there!"}],
            },
        },
    ]
)
print(batch.id)  # "msgbatch_..."
```

### Retrieve Batch Results

```python
# Stream results (memory-efficient)
result_stream = client.messages.batches.results(batch_id)
for result in result_stream:
    print(result.custom_id)
    if result.result.type == "succeeded":
        print(result.result.message.content)
```

### List / Cancel Batches

```python
# List batches
for batch in client.messages.batches.list():
    print(batch.id, batch.processing_status)

# Cancel a batch
client.messages.batches.cancel(batch_id)
```

---

## MCP (Model Context Protocol) Integration

Requires: `pip install anthropic[mcp]` (Python 3.10+)

### MCP Tool Runner

```python
from anthropic import AsyncAnthropic
from anthropic.lib.tools.mcp import async_mcp_tool
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

client = AsyncAnthropic()

async with stdio_client(StdioServerParameters(command="mcp-server")) as (read, write):
    async with ClientSession(read, write) as mcp_client:
        await mcp_client.initialize()

        tools_result = await mcp_client.list_tools()
        runner = await client.beta.messages.tool_runner(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Use the available tools"}],
            tools=[async_mcp_tool(t, mcp_client) for t in tools_result.tools],
        )
        async for message in runner:
            print(message)
```

### MCP Prompts and Resources

```python
from anthropic.lib.tools.mcp import mcp_message, mcp_resource_to_content

# Use MCP prompts
prompt = await mcp_client.get_prompt(name="my-prompt")
response = await client.beta.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[mcp_message(m) for m in prompt.messages],
)

# Use MCP resources as content
resource = await mcp_client.read_resource(uri="file:///path/to/doc.txt")
response = await client.beta.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            mcp_resource_to_content(resource),
            {"type": "text", "text": "Summarize this document"},
        ],
    }],
)
```

---

## Error Handling

### Exception Hierarchy

```
AnthropicError (base)
  +-- APIError (has .status_code, .message, .response, .body)
  |     +-- APIConnectionError    (no response - network issue)
  |     +-- APIStatusError        (has HTTP status code)
  |           +-- BadRequestError       (400)
  |           +-- AuthenticationError   (401)
  |           +-- PermissionDeniedError (403)
  |           +-- NotFoundError         (404)
  |           +-- ConflictError         (409)
  |           +-- UnprocessableEntityError (422)
  |           +-- RateLimitError        (429)
  |           +-- OverloadedError       (529)
  |           +-- InternalServerError   (>=500)
  |           +-- DeadlineExceededError (504)
  +-- APIResponseValidationError
```

### Catching Errors

```python
import anthropic

client = anthropic.Anthropic()

try:
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello"}],
    )
except anthropic.RateLimitError:
    print("Rate limited - back off and retry")
except anthropic.OverloadedError:
    print("API overloaded - try again later")
except anthropic.AuthenticationError:
    print("Invalid API key")
except anthropic.BadRequestError as e:
    print(f"Bad request: {e.message}")
except anthropic.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
except anthropic.APIConnectionError:
    print("Network connection failed")
except anthropic.AnthropicError as e:
    print(f"SDK error: {e}")
```

### Accessing Error Details

```python
except anthropic.APIStatusError as e:
    e.status_code  # HTTP status code
    e.message      # error message
    e.response     # httpx.Response
    e.body         # parsed error body (dict or None)
```

---

## Advanced Features

### Retries

```python
# Default: 2 retries with exponential backoff
# Retries on: connection errors, 408, 409, 429, >=500
client = anthropic.Anthropic(max_retries=5)

# Per-request override
message = client.messages.create(
    ...,
    max_retries=0,  # disable retries for this call
)
```

### Timeouts

```python
# Default timeout: 600 seconds (10 minutes)
client = anthropic.Anthropic(
    timeout=30.0,  # 30 second timeout
)

# Granular timeout control
from anthropic import Timeout

client = anthropic.Anthropic(
    timeout=Timeout(
        connect=5.0,
        read=60.0,
        write=30.0,
        pool=10.0,
    ),
)

# Per-request timeout
message = client.messages.create(
    ...,
    timeout=120.0,
)
```

### Raw Response Access

```python
# Get the raw httpx.Response alongside the parsed data
response = client.with_raw_response.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)

print(response.headers)          # response headers
print(response.status_code)      # 200
message = response.parse()       # parsed Message object

# Streaming raw response (doesn't read body eagerly)
response = client.with_streaming_response.messages.create(...)
```

### Pagination

```python
# Auto-pagination for list endpoints
for batch in client.messages.batches.list():
    print(batch.id)

# Async auto-pagination
async for batch in client.messages.batches.list():
    print(batch.id)
```

### Debug Logging

```bash
export ANTHROPIC_LOG=debug
```

---

## Key Types Reference

### Import Paths

```python
# Main types
from anthropic.types import (
    Message,
    MessageParam,
    ContentBlock,
    TextBlock,
    ToolUseBlock,
    ToolResultBlockParam,
    ToolParam,
    Usage,
    MessageStartEvent,
    RawContentBlockDeltaEvent,
)

# Batch types
from anthropic.types.messages import (
    MessageBatch,
    MessageBatchIndividualResponse,
)

# Shared types
from anthropic.types import (
    APIErrorObject,
    ErrorResponse,
)
```

### Model Strings

```python
# Current models (use these strings)
"claude-opus-4-6"
"claude-sonnet-4-5-20250929"
"claude-sonnet-4-5"
"claude-haiku-3-5-20241022"
"claude-sonnet-4-20250514"
```

### List Models Programmatically

```python
models = client.models.list()
for model in models:
    print(model.id, model.display_name)

# Get specific model
model = client.models.retrieve("claude-sonnet-4-5-20250929")
```

---

## Quick Reference Table

| Operation | Method |
|-----------|--------|
| Send message | `client.messages.create(...)` |
| Stream message | `client.messages.stream(...)` (context manager) |
| Raw stream | `client.messages.create(..., stream=True)` |
| Parse structured | `client.messages.parse(..., output_format=Model)` |
| Create batch | `client.messages.batches.create(requests=[...])` |
| Get batch results | `client.messages.batches.results(batch_id)` |
| List batches | `client.messages.batches.list()` |
| Cancel batch | `client.messages.batches.cancel(batch_id)` |
| List models | `client.models.list()` |
| Get model | `client.models.retrieve(model_id)` |

---

## Resources

- SDK source: https://github.com/anthropics/anthropic-sdk-python
- API docs: https://docs.anthropic.com/en/api/
- Platform docs: https://platform.claude.com/docs/en/api/sdks/python
- Changelog: https://github.com/anthropics/anthropic-sdk-python/blob/main/CHANGELOG.md
