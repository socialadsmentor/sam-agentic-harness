---
name: anthropic-sdk-php
description: 'Quick reference for the official Anthropic Claude SDK for PHP (package `anthropic-ai/sdk`, requires PHP 8.1+). Covers installation via Composer, client setup, the Messages API, streaming, and tool use. Use when writing or debugging PHP code that calls the Claude API. Triggers: php sdk, anthropic php, claude in php, composer anthropic, php claude client.'
---

# Anthropic SDK for PHP - Quick Reference

## Overview
Official Claude SDK for PHP. Requires PHP 8.1.0+.
- **Package:** `anthropic-ai/sdk`
- **Docs:** https://platform.claude.com/docs/en/api/sdks/php
- **Repo:** https://github.com/anthropics/anthropic-sdk-php

## Installation

```sh
composer require "anthropic-ai/sdk"
```

## Client Initialization

```php
<?php
use Anthropic\Client;

// With API key from environment
$client = new Client(
    apiKey: getenv('ANTHROPIC_API_KEY') ?: 'my-anthropic-api-key'
);
```

## Messages API - Basic

```php
$message = $client->messages->create(
    maxTokens: 1024,
    messages: [['role' => 'user', 'content' => 'Hello, Claude']],
    model: 'claude-opus-4-6',
);

var_dump($message->content);
```

## Streaming

```php
use Anthropic\Messages\RawContentBlockDeltaEvent;
use Anthropic\Messages\RawContentBlockStartEvent;
use Anthropic\Messages\RawMessageDeltaEvent;
use Anthropic\Messages\RawMessageStartEvent;

$stream = $client->messages->createStreaming(
    maxTokens: 1024,
    messages: [['role' => 'user', 'content' => 'Hello, Claude']],
    model: 'claude-sonnet-4-20250514'
);

foreach ($stream as $event) {
    switch (true) {
        case $event instanceof RawMessageStartEvent:
            var_dump($event->message);
            break;

        case $event instanceof RawContentBlockStartEvent:
            var_dump($event->contentBlock);
            break;

        case $event instanceof RawContentBlockDeltaEvent:
            var_dump($event->delta);
            break;

        case $event instanceof RawMessageDeltaEvent:
            var_dump($event->delta);
            break;

        default:
            var_dump($event->type);
            break;
    }
}
```

## Multi-turn Conversation

```php
$messages = [
    ['role' => 'user', 'content' => 'What is the capital of France?'],
];

$response = $client->messages->create(
    maxTokens: 1024,
    messages: $messages,
    model: 'claude-sonnet-4-20250514',
);

// Append assistant response and follow-up
$messages[] = ['role' => 'assistant', 'content' => $response->content[0]->text];
$messages[] = ['role' => 'user', 'content' => 'What about Germany?'];

$response2 = $client->messages->create(
    maxTokens: 1024,
    messages: $messages,
    model: 'claude-sonnet-4-20250514',
);
```

## Tool Use

```php
$response = $client->messages->create(
    maxTokens: 1024,
    messages: [['role' => 'user', 'content' => 'What is the weather in San Francisco?']],
    model: 'claude-sonnet-4-20250514',
    tools: [
        [
            'name' => 'get_weather',
            'description' => 'Get the current weather in a given location',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'location' => [
                        'type' => 'string',
                        'description' => 'The city and state, e.g. San Francisco, CA',
                    ],
                ],
                'required' => ['location'],
            ],
        ],
    ],
);

// Check for tool use in response
foreach ($response->content as $block) {
    if ($block->type === 'tool_use') {
        $toolName = $block->name;
        $toolInput = $block->input;
        // Execute tool and send result back
    }
}
```

## System Prompt

```php
$message = $client->messages->create(
    maxTokens: 1024,
    system: 'You are a helpful assistant that speaks like a pirate.',
    messages: [['role' => 'user', 'content' => 'Hello!']],
    model: 'claude-sonnet-4-20250514',
);
```

## Available Models

| Model String | Description |
|-------------|-------------|
| `claude-opus-4-6` | Claude Opus 4.6 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-haiku-4-5-20250929` | Claude Haiku 4.5 |

## Key Types

| Type | Purpose |
|------|---------|
| `Anthropic\Client` | Main client |
| `RawMessageStartEvent` | Stream: message start |
| `RawContentBlockStartEvent` | Stream: content block start |
| `RawContentBlockDeltaEvent` | Stream: content delta (text chunks) |
| `RawMessageDeltaEvent` | Stream: message delta (stop reason, usage) |

## Platform Support

- **AWS Bedrock:** Dedicated example at `examples/bedrock/`
- **GCP Vertex:** Dedicated example at `examples/vertex/`
- **Anthropic Foundry:** Dedicated example at `examples/foundry/`

## Error Handling

The SDK throws exceptions for API errors. Wrap calls in try-catch:

```php
try {
    $message = $client->messages->create(
        maxTokens: 1024,
        messages: [['role' => 'user', 'content' => 'Hello']],
        model: 'claude-sonnet-4-20250514',
    );
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
```
