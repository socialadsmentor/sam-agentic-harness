---
name: claude-cookbooks
description: 'Reference index for the 65 official Claude cookbooks (github.com/anthropics/claude-cookbooks): Jupyter notebooks and recipes covering RAG, tool use, vision, sub-agents, evaluation, and more. Use when the user wants a worked example or reference implementation for a Claude capability. Triggers: claude cookbook, anthropic recipe, example notebook, reference implementation, how do I build RAG with claude.'
---

# Claude Cookbooks Reference

Source: https://github.com/anthropics/claude-cookbooks
65 notebooks/recipes for building with Claude.

## How to Access

Each cookbook is a Jupyter notebook. View on GitHub or clone:
```bash
git clone https://github.com/anthropics/claude-cookbooks.git
```
Open notebooks with `jupyter notebook` or view directly on GitHub.

---

## Capabilities (5)

1. **Classification with Claude** - `capabilities/classification/guide.ipynb`
   Build classification systems using RAG and chain-of-thought for insurance tickets.

2. **Enhancing RAG with contextual retrieval** - `capabilities/contextual-embeddings/guide.ipynb`
   Improve RAG accuracy by adding context to chunks before embedding with prompt caching.

3. **Retrieval augmented generation** - `capabilities/retrieval_augmented_generation/guide.ipynb`
   Build and optimize RAG systems with summary indexing and reranking techniques.

4. **Summarization with Claude** - `capabilities/summarization/guide.ipynb`
   Comprehensive guide to summarizing legal documents with evaluation and advanced techniques.

5. **Text to SQL with Claude** - `capabilities/text_to_sql/guide.ipynb`
   Convert natural language queries to SQL using RAG, chain-of-thought, and self-improvement.

## Claude Agent SDK (4)

6. **The one-liner research agent** - `claude_agent_sdk/00_The_one_liner_research_agent.ipynb`
   Build a research agent using Claude Code SDK with WebSearch for autonomous research.

7. **The chief of staff agent** - `claude_agent_sdk/01_The_chief_of_staff_agent.ipynb`
   Build multi-agent systems with subagents, hooks, output styles, and plan mode features.

8. **The observability agent** - `claude_agent_sdk/02_The_observability_agent.ipynb`
   Connect agents to external systems via MCP servers for GitHub monitoring and CI workflows.

9. **The site reliability agent** - `claude_agent_sdk/03_The_site_reliability_agent.ipynb`
   Build an incident response agent with read-write MCP tools for autonomous diagnosis, remediation, and post-mortem documentation.

## Coding (1)

10. **Prompting for frontend aesthetics** - `coding/prompting_for_frontend_aesthetics.ipynb`
    Guide to prompting Claude for distinctive, polished frontend designs avoiding generic aesthetics.

## Extended Thinking (2)

11. **Extended thinking** - `extended_thinking/extended_thinking.ipynb`
    Use Claude's extended thinking for transparent step-by-step reasoning with budget management.

12. **Extended thinking with tool use** - `extended_thinking/extended_thinking_with_tool_use.ipynb`
    Combine extended thinking with tools for transparent reasoning during multi-step workflows.

## Fine-Tuning (1)

13. **Finetuning Claude 3 Haiku on Bedrock** - `finetuning/finetuning_on_bedrock.ipynb`
    Step-by-step guide to finetuning Claude 3 Haiku on Amazon Bedrock for custom tasks.

## Miscellaneous / Core Techniques (14)

14. **Batch processing with Message Batches API** - `misc/batch_processing.ipynb`
    Process large volumes of requests asynchronously with 50% cost reduction using batches.

15. **Building evals** - `misc/building_evals.ipynb`
    Build robust evaluation systems to measure and improve Claude's performance on key metrics.

16. **Building a moderation filter with Claude** - `misc/building_moderation_filter.ipynb`
    Build customizable content moderation filters by defining rules and categories in prompts.

17. **Generate synthetic test data for your prompt template** - `misc/generate_test_cases.ipynb`
    Generate synthetic test cases to evaluate and improve your Claude prompt templates.

18. **Prompting Claude for "JSON mode"** - `misc/how_to_enable_json_mode.ipynb`
    Get reliable JSON output from Claude using effective prompting techniques.

19. **How to make SQL queries with Claude** - `misc/how_to_make_sql_queries.ipynb`
    Generate SQL queries from natural language questions using Claude with database schema context.

20. **Metaprompt** - `misc/metaprompt.ipynb`
    Prompt engineering tool that generates starting prompts for your tasks to solve blank-page problem.

21. **"Uploading" PDFs to Claude via the API** - `misc/pdf_upload_summarization.ipynb`
    Process and summarize PDF documents using Claude API with text extraction and encoding.

22. **Prompt caching through the Claude API** - `misc/prompt_caching.ipynb`
    Cache and reuse prompt context for cost savings and faster responses.

23. **Session memory compaction** - `misc/session_memory_compaction.ipynb`
    Manage long-running conversations with instant session memory compaction using background threading and prompt caching.

24. **Summarizing web page content with Claude 3 Haiku** - `misc/read_web_pages_with_haiku.ipynb`
    Fetch and summarize web page content using Claude 3 Haiku via URL extraction.

25. **Sampling responses beyond the max tokens limit** - `misc/sampling_past_max_tokens.ipynb`
    Generate longer responses beyond max_tokens limit using prefill technique with message continuation.

26. **Speculative prompt caching** - `misc/speculative_prompt_caching.ipynb`
    Reduce time-to-first-token by warming cache speculatively while users formulate their queries.

27. **Citations** - `misc/using_citations.ipynb`
    Enable Claude to provide detailed source citations when answering document-based questions.

## Multimodal (5)

28. **Giving Claude a crop tool for better image analysis** - `multimodal/crop_tool.ipynb`
    Give Claude a crop tool to zoom into image regions for detailed analysis of charts, documents, and diagrams.

29. **Best practices for using vision with Claude** - `multimodal/best_practices_for_vision.ipynb`
    Tips and techniques for optimal image processing performance with Claude's vision capabilities.

30. **Getting started - how to pass images into Claude** - `multimodal/getting_started_with_vision.ipynb`
    Tutorial on passing images to Claude 3 API for vision-based text analysis.

31. **How to transcribe documents with Claude** - `multimodal/how_to_transcribe_text.ipynb`
    Extract and structure unstructured text from images and PDFs using Claude 3's vision.

32. **Working with charts, graphs, and slide decks** - `multimodal/reading_charts_graphs_powerpoints.ipynb`
    Extract insights from charts, graphs, and presentations using Claude's vision analysis.

33. **Using Haiku as a sub-agent** - `multimodal/using_sub_agents.ipynb`
    Analyze financial reports using Haiku sub-agents for extraction and Opus for synthesis.

## Observability (1)

34. **Usage & cost Admin API cookbook** - `observability/usage_cost_api.ipynb`
    Programmatically access and analyze your Claude API usage and cost data via Admin API.

## Agent Patterns (3)

35. **Basic workflows** - `patterns/agents/basic_workflows.ipynb`
    Three simple multi-LLM workflow patterns trading cost or latency for improved performance.

36. **Evaluator optimizer** - `patterns/agents/evaluator_optimizer.ipynb`
    Workflow pattern using one LLM for generation and another for evaluation feedback loop.

37. **Orchestrator workers** - `patterns/agents/orchestrator_workers.ipynb`
    Central LLM dynamically delegates tasks to worker LLMs and synthesizes their combined results.

## Skills (3)

38. **Introduction to Claude Skills** - `skills/notebooks/01_skills_introduction.ipynb`
    Create documents, analyze data, automate workflows with Claude's Excel, PowerPoint, PDF skills.

39. **Claude Skills for financial applications** - `skills/notebooks/02_skills_financial_applications.ipynb`
    Build financial dashboards and portfolio analytics using Claude's Excel, PowerPoint, PDF skills.

40. **Building custom Skills for Claude** - `skills/notebooks/03_skills_custom_development.ipynb`
    Create, deploy, and manage custom skills extending Claude with specialized organizational workflows.

## Third-Party Integrations (12)

41. **Low latency voice assistant with ElevenLabs** - `third_party/ElevenLabs/low_latency_stt_claude_tts.ipynb`
    Build a low-latency voice assistant using ElevenLabs for speech-to-text and text-to-speech.

42. **Transcribe audio with Deepgram & prepare interview questions** - `third_party/Deepgram/prerecorded_audio.ipynb`
    Transcribe audio with Deepgram and generate interview questions using Claude.

43. **RAG pipeline with LlamaIndex** - `third_party/LlamaIndex/Basic_RAG_With_LlamaIndex.ipynb`
    Build basic RAG pipeline with LlamaIndex for document retrieval and question answering.

44. **Multi-document agents** - `third_party/LlamaIndex/Multi_Document_Agents.ipynb`
    Build RAG for large document collections using DocumentAgents with ReAct Agent pattern.

45. **Multi-modal with LlamaIndex** - `third_party/LlamaIndex/Multi_Modal.ipynb`
    Use LlamaIndex's Anthropic MultiModal LLM abstraction for image understanding and reasoning.

46. **ReAct agent with LlamaIndex** - `third_party/LlamaIndex/ReAct_Agent.ipynb`
    Create ReAct agents with LlamaIndex for tool-based reasoning and action workflows.

47. **RouterQuery engine** - `third_party/LlamaIndex/Router_Query_Engine.ipynb`
    Route queries to different indices using LlamaIndex RouterQueryEngine for multi-document search.

48. **SubQuestionQueryEngine** - `third_party/LlamaIndex/SubQuestion_Query_Engine.ipynb`
    Decompose complex queries into sub-questions across multiple documents using LlamaIndex.

49. **RAG system using Claude 3 and MongoDB** - `third_party/MongoDB/rag_using_mongodb.ipynb`
    Build chatbot RAG system with Claude and MongoDB using tech news as knowledge base.

50. **Claude 3 RAG agents with LangChain v1** - `third_party/Pinecone/claude_3_rag_agent.ipynb`
    Build RAG agents with Claude 3 using LangChain v1's updated agent framework patterns.

51. **Retrieval-augmented generation using Pinecone** - `third_party/Pinecone/rag_using_pinecone.ipynb`
    Connect Claude with Pinecone vector database for RAG and semantic search.

52. **Iteratively searching Wikipedia with Claude** - `third_party/Wikipedia/wikipedia-search-cookbook.ipynb`
    Legacy notebook showing iterative Wikipedia searches with Claude 2 for research workflows.

53. **Using Wolfram Alpha LLM API as a tool** - `third_party/WolframAlpha/using_llm_api.ipynb`
    Integrate Wolfram Alpha LLM API as Claude tool for computational queries.

## Tool Evaluation (1)

54. **Tool evaluation** - `tool_evaluation/tool_evaluation.ipynb`
    Run parallel agent evaluations on tools independently from evaluation task files.

## Tool Use (10)

55. **Using a calculator tool with Claude** - `tool_use/calculator_tool.ipynb`
    Provide Claude with calculator tool for arithmetic operations and mathematical problem solving.

56. **Creating a customer service agent** - `tool_use/customer_service_agent.ipynb`
    Build customer service chatbot with Claude using tools for customer lookup and order management.

57. **Extracting structured JSON using tool use** - `tool_use/extracting_structured_json.ipynb`
    Extract structured JSON data from various inputs using Claude's tool use capabilities.

58. **Memory & context management** - `tool_use/memory_cookbook.ipynb`
    Build AI agents with persistent memory using Claude's memory tool and context editing.

59. **Parallel tool calls** - `tool_use/parallel_tools.ipynb`
    Enable parallel tool calls on Claude 3.7 Sonnet using batch tool meta-pattern workaround.

60. **Programmatic tool calling (PTC)** - `tool_use/programmatic_tool_calling_ptc.ipynb`
    Reduce latency and token consumption by letting Claude write code that calls tools programmatically.

61. **Tool choice** - `tool_use/tool_choice.ipynb`
    Control how Claude selects tools using tool_choice parameter for forced or auto selection.

62. **Tool search with embeddings** - `tool_use/tool_search_with_embeddings.ipynb`
    Scale Claude applications to thousands of tools using semantic embeddings for dynamic tool discovery.

63. **Tool search alternate approaches** - `tool_use/tool_search_alternate_approaches.ipynb`
    Alternative approaches for tool search and selection at scale.

64. **Note-saving tool with Pydantic** - `tool_use/tool_use_with_pydantic.ipynb`
    Create validated tools using Pydantic models for type-safe Claude tool use interactions.

65. **Using vision with tools** - `tool_use/vision_with_tools.ipynb`
    Combine Claude's vision with tools to extract structured data from images like nutrition labels.

## Automatic Context Compaction (1)

66. **Automatic context compaction** - `tool_use/automatic-context-compaction.ipynb`
    Manage context limits in long-running agentic workflows by automatically compressing conversation history.

---

## Categories Index

- **Agent Patterns**: 4, 7, 8, 9, 33, 35, 36, 37, 44, 50, 56, 58, 66
- **Claude Agent SDK**: 6, 7, 8, 9
- **Evals**: 15, 17, 36, 54
- **Fine-Tuning**: 13
- **Integrations**: 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53
- **Multimodal**: 28, 29, 30, 31, 32, 42, 45, 65
- **Observability**: 34
- **RAG & Retrieval**: 1, 2, 3, 5, 7, 8, 19, 21, 24, 27, 43, 44, 47, 48, 49, 50, 51
- **Responses**: 10, 14, 16, 18, 20, 22, 23, 25, 26, 27, 57
- **Skills**: 10, 38, 39, 40
- **Thinking**: 11, 12
- **Tools**: 1, 2, 3, 4, 12, 46, 53, 55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 66
