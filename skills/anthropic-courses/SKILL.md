---
name: anthropic-courses
description: 'Reference for Anthropic''s 5 official educational courses (github.com/anthropics/courses): API fundamentals, prompt engineering, real-world prompting, prompt evaluations, and tool use. Use when the user asks how to LEARN Claude development, wants a structured course, asks about Anthropic''s official training material, or wants the notebooks cloned and run locally. Triggers: anthropic courses, claude course, learn the claude api, prompt engineering course, tool use tutorial.'
---

# Anthropic Courses Reference

Source: https://github.com/anthropics/courses
5 structured educational courses for learning to build with Claude.

## How to Access

Clone the repository and run notebooks locally:
```bash
git clone https://github.com/anthropics/courses.git
```
Courses use Claude 3 Haiku by default to minimize API costs. You can substitute other models.

---

## Course 1: Anthropic API Fundamentals

**Path:** `anthropic_api_fundamentals/`
**Recommended:** Complete first

Teaches the essentials of working with the Claude SDK.

| Notebook | Topic |
|----------|-------|
| `01_getting_started.ipynb` | Getting an API key, first API call |
| `02_messages_format.ipynb` | Messages format and conversation structure |
| `03_models.ipynb` | Available models and their capabilities |
| `04_parameters.ipynb` | Model parameters (temperature, max_tokens, etc.) |
| `05_Streaming.ipynb` | Streaming responses for real-time output |
| `06_vision.ipynb` | Multimodal prompts with images |

## Course 2: Prompt Engineering Interactive Tutorial

**Path:** `prompt_engineering_interactive_tutorial/Anthropic 1P/`
**Recommended:** Complete second

Comprehensive step-by-step guide to key prompting techniques. Also available as an [AWS Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/0644c9e9-5b82-45f2-8835-3b5aa30b1848/en-US).

| Notebook | Topic |
|----------|-------|
| `00_Tutorial_How-To.ipynb` | How to use the tutorial |
| `01_Basic_Prompt_Structure.ipynb` | Basic prompt structure fundamentals |
| `02_Being_Clear_and_Direct.ipynb` | Writing clear, direct prompts |
| `03_Assigning_Roles_Role_Prompting.ipynb` | Role prompting techniques |
| `04_Separating_Data_and_Instructions.ipynb` | Separating data from instructions |
| `05_Formatting_Output_and_Speaking_for_Claude.ipynb` | Output formatting and prefilling |
| `06_Precognition_Thinking_Step_by_Step.ipynb` | Chain-of-thought / step-by-step reasoning |
| `07_Using_Examples_Few-Shot_Prompting.ipynb` | Few-shot prompting with examples |
| `08_Avoiding_Hallucinations.ipynb` | Techniques to reduce hallucinations |
| `09_Complex_Prompts_from_Scratch.ipynb` | Building complex prompts from scratch |
| `10.1_Appendix_Chaining Prompts.ipynb` | Prompt chaining techniques |
| `10.2_Appendix_Tool Use.ipynb` | Introduction to tool use |
| `10.3_Appendix_Search & Retrieval.ipynb` | Search and retrieval patterns |

## Course 3: Real World Prompting

**Path:** `real_world_prompting/`
**Recommended:** Complete third

Learn how to incorporate prompting techniques into complex, real-world prompts. Also available in a [Google Vertex version](https://github.com/anthropics/courses/tree/vertex/real_world_prompting).

| Notebook | Topic |
|----------|-------|
| `01_prompting_recap.ipynb` | Recap of prompting fundamentals |
| `02_medical_prompt.ipynb` | Building a medical domain prompt |
| `03_prompt_engineering.ipynb` | Advanced prompt engineering techniques |
| `04_call_summarizer.ipynb` | Building a call summarization system |
| `05_customer_support_ai.ipynb` | Customer support AI implementation |

## Course 4: Prompt Evaluations

**Path:** `prompt_evaluations/`
**Recommended:** Complete fourth

Learn how to write production prompt evaluations to measure prompt quality.

| Module | Topic |
|--------|-------|
| `01_intro_to_evals/` | Introduction to evaluations |
| `02_workbench_evals/` | Using the Anthropic Workbench for evals |
| `03_code_graded_evals/` | Code-graded evaluation methods |
| `04_code_graded_classification_evals/` | Classification-specific code-graded evals |
| `05_prompt_foo_code_graded_animals/` | PromptFoo code-graded evals (animals example) |
| `06_prompt_foo_code_graded_classification/` | PromptFoo code-graded classification |
| `07_prompt_foo_custom_graders/` | PromptFoo custom graders |
| `08_prompt_foo_model_graded/` | PromptFoo model-graded evaluations |
| `09_custom_model_graded_prompt_foo/` | Custom model-graded evals with PromptFoo |

## Course 5: Tool Use

**Path:** `tool_use/`
**Recommended:** Complete fifth

Everything you need to implement tool use successfully in your workflows with Claude.

| Notebook | Topic |
|----------|-------|
| `01_tool_use_overview.ipynb` | Overview of tool use concepts |
| `02_your_first_simple_tool.ipynb` | Creating your first simple tool |
| `03_structured_outputs.ipynb` | Getting structured outputs via tools |
| `04_complete_workflow.ipynb` | Complete tool use workflow |
| `05_tool_choice.ipynb` | Controlling tool selection |
| `06_chatbot_with_multiple_tools.ipynb` | Building a chatbot with multiple tools |

---

## Learning Path Summary

```
API Fundamentals (6 notebooks)
    |
    v
Prompt Engineering (13 notebooks)
    |
    v
Real World Prompting (5 notebooks)
    |
    v
Prompt Evaluations (9 modules)
    |
    v
Tool Use (6 notebooks)
```

Total: 39 notebooks/modules across 5 courses.
