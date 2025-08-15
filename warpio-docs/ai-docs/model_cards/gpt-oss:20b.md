# openai model card

Title: OpenAI Harmony Response Format

Description: The gpt-oss models were trained on the harmony response format for defining conversation structures, generating reasoning output and stru...

Keywords: openai, cookbook, api, examples, guides, gpt, chatgpt, gpt-4, embeddings

### Aug 5, 2025

# OpenAI Harmony Response Format

Dominik Kundel(OpenAI)

Open in GitHub

The `gpt-oss` models were trained on the harmony response format for defining conversation structures, generating reasoning output and structuring function calls. If you are not using `gpt-oss` directly but through an API or a provider like Ollama, you will not have to be concerned about this as your inference solution will handle the formatting. If you are building your own inference solution, this guide will walk you through the prompt format. The format is designed to mimic the OpenAI Responses API, so if you have used that API before, this format should hopefully feel familiar to you. `gpt-oss` should not be used without using the harmony format, as it will not work correctly.

Concepts

---

### Roles

Every message that the model processes has a role associated with it. The model knows about three types of roles:

| Role        | Purpose                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system`    | A system message is used to specify reasoning effort, meta information like knowledge cutoff and built-in tools                                                                         |
| `developer` | The developer message is used to provide information about the instructions for the model (what is normally considered the “system prompt”) and available function tools                |
| `user`      | Typically representing the input to the model                                                                                                                                           |
| `assistant` | Output by the model which can either be a tool call or a message output. The output might also be associated with a particular “channel” identifying what the intent of the message is. |
| `tool`      | Messages representing the output of a tool call. The specific tool name will be used as the role inside a message.                                                                      |

These roles also represent the information hierarchy that the model applies in case there are any instruction conflicts: `system` > `developer` > `user` > `assistant` > `tool`

#### Channels

Assistant messages can be output in three different “channels”. These are being used to separate between user-facing responses and internal facing messages.

| Channel      | Purpose                                                                                                                                                                                                                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `final`      | Messages tagged in the final channel are messages intended to be shown to the end-user and represent the responses from the model.                                                                                                                                                                                                                   |
| `analysis`   | These are messages that are being used by the model for its chain of thought (CoT). **Important:** Messages in the analysis channel do not adhere to the same safety standards as final messages do. Avoid showing these to end-users.                                                                                                               |
| `commentary` | Any function tool call will typically be triggered on the `commentary` channel while built-in tools will normally be triggered on the `analysis` channel. However, occasionally built-in tools will still be output to `commentary`. Occasionally this channel might also be used by the model to generate a preamble to calling multiple functions. |

Harmony renderer library

---

We recommend using our harmony renderer through PyPI or crates.io when possible as it will automatically handle rendering your messages in the right format and turning them into tokens for processing by the model.

Below is an example of using the renderer to construct a system prompt and a short conversation.

```
from openai_harmony import (
Author,
Conversation,
DeveloperContent,
HarmonyEncodingName,
Message,
Role,
SystemContent,
ToolDescription,
load_harmony_encoding,
ReasoningEffort
)

encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)

system_message = (
SystemContent.new()
.with_model_identity(
"You are ChatGPT, a large language model trained by OpenAI."
)
.with_reasoning_effort(ReasoningEffort.HIGH)
.with_conversation_start_date("2025-06-28")
.with_knowledge_cutoff("2024-06")
.with_required_channels(["analysis", "commentary", "final"])
)

developer_message = (
DeveloperContent.new()
.with_instructions("Always respond in riddles")
.with_function_tools(
[
ToolDescription.new(
"get_location",
"Gets the location of the user.",
),
ToolDescription.new(
"get_current_weather",
"Gets the current weather in the provided location.",
parameters={
"type": "object",
"properties": {
"location": {
"type": "string",
"description": "The city and state, e.g. San Francisco, CA",
},
"format": {
"type": "string",
"enum": ["celsius", "fahrenheit"],
"default": "celsius",
},
},
"required": ["location"],
},
),
]
)
)

convo = Conversation.from_messages(
[
Message.from_role_and_content(Role.SYSTEM, system_message),
Message.from_role_and_content(Role.DEVELOPER, developer_message),
Message.from_role_and_content(Role.USER, "What is the weather in Tokyo?"),
Message.from_role_and_content(
Role.ASSISTANT,
'User asks: "What is the weather in Tokyo?" We need to use get_weather tool.',
).with_channel("analysis"),
Message.from_role_and_content(Role.ASSISTANT, '{"location": "Tokyo"}')
.with_channel("commentary")
.with_recipient("functions.get_weather")
.with_content_type("json"),
Message.from_author_and_content(
Author.new(Role.TOOL, "functions.lookup_weather"),
'{ "temperature": 20, "sunny": true }',
).with_recipient("assistant").with_channel("commentary"),
]
)

tokens = encoding.render_conversation_for_completion(convo, Role.ASSISTANT)

# After receiving a token response
# Do not pass in the stop token
parsed_response = encoding.parse_messages_from_completion_tokens(new_tokens, Role.ASSISTANT)
```

Additionally the openai_harmony library also includes a StreamableParser for parsing and decoding as the model is generating new tokens. This can be helpful for example to stream output and handle unicode characters during decoding.

```
from openai_harmony import (
load_harmony_encoding,
Role,
StreamableParser,
HarmonyEncodingName
)

encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)
stream = StreamableParser(encoding, role=Role.ASSISTANT)

tokens = [
200005,35644,200008,1844,31064,25,392,4827,382,220,17,659,220,17,16842,12295,81645,
13,51441,6052,13,200007,200006,173781,200005,17196,200008,17,659,220,17,314,220,19,
13,200002
]

for token in tokens:
stream.process(token)
print("--------------------------------")
print("current_role", stream.current_role)
print("current_channel", stream.current_channel)
print("last_content_delta", stream.last_content_delta)
print("current_content_type", stream.current_content_type)
print("current_recipient", stream.current_recipient)
print("current_content", stream.current_content)
```

Prompt format

---

If you choose to build your own renderer, you’ll need to adhere to the following format.

### Special Tokens

The model uses a set of special tokens to identify the structure of your input. If you are using tiktoken these tokens are encoded in the `o200k_harmony` encoding. All special tokens follow the format `<|type|>`.

| Special token | Purpose   | Token ID |
| ------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| <             | start     | >        | Indicates the beginning of a message. Followed by the “header” information of a message starting with the role                  | `200006` |
| <             | end       | >        | Indicates the end of a message                                                                                                  | `200007` |
| <             | message   | >        | Indicates the transition from the message “header” to the actual content                                                        | `200008` |
| <             | channel   | >        | Indicates the transition to the channel information of the header                                                               | `200005` |
| <             | constrain | >        | Indicates the transition to the data type definition in a tool call                                                             | `200003` |
| <             | return    | >        | Indicates the model is done with sampling the response message. A valid “stop token” indicating that you should stop inference. | `200002` |
| <             | call      | >        | Indicates the model wants to call a tool. A valid “stop token” indicating that you should stop inference.                       | `200012` |

### Message format

The harmony response format consists of “messages” with the model potentially generating multiple messages in one go. The general structure of a message is as follows:

```
<|start|>{header}<|message|>{content}<|end|>
```

The `{header}` contains a series of meta information including the role. `<|end|>` represents the end of a fully completed message but the model might also use other stop tokens such as `<|call|>` for tool calling and `<|return|>` to indicate the model is done with the completion.

### Chat conversation format

Following the message format above the most basic chat format consists of a `user` message and the beginning of an `assistant` message.

#### Example input

```
<|start|>user<|message|>What is 2 + 2?<|end|>
<|start|>assistant
```

The output will begin by specifying the `channel`. For example `analysis` to output the chain of thought. The model might output multiple messages (primarily chain of thought messages) for which it uses the `<|end|>` token to separate them.

Once its done generating it will stop with either a `<|return|>` token indicating it’s done generating the final answer, or `<|call|>` indicating that a tool call needs to be performed. In either way this indicates that you should stop inference.

#### Example output

```
<|channel|>analysis<|message|>User asks: "What is 2 + 2?" Simple arithmetic. Provide answer.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
```

The `final` channel will contain the answer to your user’s request. Check out the reasoning section for more details on the chain-of-thought.

### System message format

The system message is used to provide general information to the system. This is different to what might be considered the “system prompt” in other prompt formats. For that, check out the developer message format.

We use the system message to define:

1.  The **identity** of the model — This should always stay as `You are ChatGPT, a large language model trained by OpenAI.` If you want to change the identity of the model, use the instructions in the developer message.
2.  Meta **dates** — Specifically the `Knowledge cutoff:` and the `Current date:`
3.  The **reasoning effort** — As specified on the levels `high`, `medium`, `low`
4.  Available channels — For the best performance this should map to `analysis`, `commentary`, and `final`.
5.  Built-in tools — The model has been trained on both a `python` and `browser` tool. Check out the built-in tools section for details.

**If you are defining functions,** it should also contain a note that all function tool calls must go to the `commentary` channel.

For the best performance stick to this format as closely as possible.

#### Example system message

The most basic system message you should use is the following:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.<|end|>
```

If functions calls are present in the developer message section, use:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|>
```

### Developer message format

The developer message represents what is commonly considered the “system prompt”. It contains the instructions that are provided to the model and optionally a list of function tools available for use or the output format you want the model to adhere to for structured outputs.

If you are not using function tool calling your developer message would just look like this:

```
<|start|>developer<|message|># Instructions

{instructions}<|end|>
```

Where `{instructions}` is replaced with your “system prompt”.

For defining function calling tools, check out the dedicated section.  
For defining an output format to be used in structured outputs, check out this section of the guide.

### Reasoning

The gpt-oss models are reasoning models. By default, the model will do medium level reasoning. To control the reasoning you can specify in the system message the reasoning level as `low`, `medium`, or `high`. The recommended format is:

```
Reasoning: high
```

The model will output its raw chain-of-thought (CoT) as assistant messages into the `analysis` channel while the final response will be output as `final`.

For example for the question `What is 2 + 2?` the model output might look like this:

```
<|channel|>analysis<|message|>User asks: "What is 2 + 2?" Simple arithmetic. Provide answer.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
```

In this case the CoT is

```
User asks: “What is 2 + 2?” Simple arithmetic. Provide answer.
```

And the actual answer is:

```
2 + 2 = 4
```

**Important:**  
The model has not been trained to the same safety standards in the chain-of-thought as it has for final output. You should not show the chain-of-thought to your users, as they might contain harmful content. Learn more in the model card.

#### Handling reasoning output in subsequent sampling

In general, you should drop any previous CoT content on subsequent sampling if the responses by the assistant ended in a message to the `final` channel. Meaning if our first input was this:

```
<|start|>user<|message|>What is 2 + 2?<|end|>
<|start|>assistant
```

and resulted in the output:

```
<|channel|>analysis<|message|>User asks: "What is 2 + 2?" Simple arithmetic. Provide answer.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
```

For the model to work properly, the input for the next sampling should be

```
<|start|>user<|message|>What is 2 + 2?<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
<|start|>user<|message|>What about 9 / 2?<|end|>
<|start|>assistant
```

The exception for this is tool/function calling. The model is able to call tools as part of its chain-of-thought and because of that, we should pass the previous chain-of-thought back in as input for subsequent sampling. Check out the function calling section for a complete example.

### Function calling

#### Defining available tools

All functions that are available to the model should be defined in the developer message in a dedicated `Tools` section.

To define the functions we use a TypeScript-like type syntax and wrap the functions into a dedicated `functions` namespace. It’s important to stick to this format closely to improve accuracy of function calling. You can check out the harmony renderer codebase for more information on how we are turning JSON schema definitions for the arguments into this format but some general formatting practices:

- Define every function as a `type {function_name} = () => any` if it does not receive any arguments
- For functions that receive an argument name the argument `_` and inline the type definition
- Add comments for descriptions in the line above the field definition
- Always use `any` as the return type
- Keep an empty line after each function definition
- Wrap your functions into a namespace, generally `functions` is the namespace you should use to not conflict with other tools that the model might have been trained on.

Here’s a complete input example including the definition of two functions:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|><|start|>developer<|message|># Instructions

Use a friendly tone.

# Tools

## functions

namespace functions {

// Gets the location of the user.
type get_location = () => any;

// Gets the current weather in the provided location.
type get_current_weather = (_: {
// The city and state, e.g. San Francisco, CA
location: string,
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

// Gets the current weather in the provided list of locations.
type get_multiple_weathers = (_: {
// List of city and state, e.g. ["San Francisco, CA", "New York, NY"]
locations: string[],
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

} // namespace functions<|end|><|start|>user<|message|>What is the weather like in SF?<|end|><|start|>assistant
```

#### Receiving tool calls

If the model decides to call a tool it will define a `recipient` in the header of the message using the format `to={name}`. For example, if it decides to trigger the `get_current_weather` function from above it would specify `to=functions.get_current_weather` in the header and `commentary` as the channel as specified in the system message. **The recipient might be defined in the role or channel section of the header.**

The model might also specify a `<|constrain|>` token to indicate the type of input for the tool call. In this case since it’s being passed in as JSON the `<|constrain|>` is set to `json`.

```
<|channel|>analysis<|message|>Need to use function get_weather.<|end|><|start|>assistant<|channel|>commentary to=functions.get_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>
```

#### Handling tool calls

After the function call was handled we need to provide the output back to the model by specifying a new tool message with the output after the call message.

A tool message has the following format:

```
<|start|>{toolname} to=assistant<|channel|>commentary<|message|>{output}<|end|>
```

So in our example above

```
<|start|>functions.get_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
```

Once you have gathered the output for the tool calls you can run inference with the complete content:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|><|start|>developer<|message|># Instructions

Use a friendly tone.

# Tools

## functions

namespace functions {

// Gets the location of the user.
type get_location = () => any;

// Gets the current weather in the provided location.
type get_current_weather = (_: {
// The city and state, e.g. San Francisco, CA
location: string,
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

// Gets the current weather in the provided list of locations.
type get_multiple_weathers = (_: {
// List of city and state, e.g. ["San Francisco, CA", "New York, NY"]
locations: string[],
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

} // namespace functions<|end|><|start|>user<|message|>What is the weather like in SF?<|end|><|start|>assistant<|channel|>analysis<|message|>Need to use function get_weather.<|end|><|start|>assistant<|channel|>commentary to=functions.get_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|><|start|>functions.get_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|><|start|>assistant
```

As you can see above we are passing not just the function out back into the model for further sampling but also the previous chain-of-thought (“Need to use function get_weather.”) to provide the model with the necessary information to continue its chain-of-thought or provide the final answer.

#### Preambles

At times the model might choose to generate a “preamble” to inform the user about the tools it is about to call. For example, when it plans to call multiple tools. If this is the case it will generate an assistant message on the `commentary` channel that, unlike the chain-of-thought, is intended to be shown to the end-user.

```
<|channel|>analysis<|message|>{long chain of thought}<|end|><|start|>assistant<|channel|>commentary<|message|>**Action plan**:
1. Generate an HTML file
2. Generate a JavaScript for the Node.js server
3. Start the server
---
Will start executing the plan step by step<|end|><|start|>assistant<|channel|>commentary to=functions.generate_file<|constrain|>json<|message|>{"template": "basic_html", "path": "index.html"}<|call|>
```

In this case the model generated an action plan to inform the user about the multiple steps it is about to execute.

### Structured output

To control the output behavior of the model, you can define a response format at the end of the developer message with the following structure:

```
# Response Formats

## {format name}

// {description or context}
{schema}<|end|>
```

The format name functions similar to the name you can specify for your schema in the Responses API and the schema is a JSON Schema.

As an example, here’s a developer message that defines a schema for a shopping list:

```
<|start|>developer<|message|># Instructions

You are a helpful shopping assistant

# Response Formats

## shopping_list

{"properties":{"items":{"type":"array","description":"entries on the shopping list","items":{"type":"string"}}},"type":"object"}<|end|><|start|>user<|message|>I need to buy coffee, soda and eggs<|end|><|start|>assistant
```

This prompt alone will, however, only influence the model’s behavior but doesn’t guarantee the full adherence to the schema. For this you still need to construct your own grammar and enforce the schema during sampling.

### Built-in tools

During the training of the `gpt-oss` models, they were trained with two common tools to browse for information and execute python code to improve its results.

If you are trying to build this functionality, you should use the format below to improve reliability and accuracy.

These tools should be defined in the system message not in the developer message by adding a `# Tools` section.

#### Browser tool

To define the browser tool add it to the system prompt section:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Tools

## browser

// Tool for browsing.
// The `cursor` appears in brackets before each browsing display: `[{cursor}]`.
// Cite information from the tool using the following format:
// `【{cursor}†L{line_start}(-L{line_end})?】`, for example: `【6†L9-L11】` or `【8†L3】`.
// Do not quote more than 10 words directly from the tool output.
// sources=web (default: web)
namespace browser {

// Searches for information related to `query` and displays `topn` results.
type search = (_: {
query: string,
topn?: number, // default: 10
source?: string,
}) => any;

// Opens the link `id` from the page indicated by `cursor` starting at line number `loc`, showing `num_lines` lines.
// Valid link ids are displayed with the formatting: `【{id}†.*】`.
// If `cursor` is not provided, the most recent page is implied.
// If `id` is a string, it is treated as a fully qualified URL associated with `source`.
// If `loc` is not provided, the viewport will be positioned at the beginning of the document or centered on the most relevant passage, if available.
// Use this function without `id` to scroll to a new location of an opened page.
type open = (_: {
id?: number | string, // default: -1
cursor?: number, // default: -1
loc?: number, // default: -1
num_lines?: number, // default: -1
view_source?: boolean, // default: false
source?: string,
}) => any;

// Finds exact matches of `pattern` in the current page, or the page given by `cursor`.
type find = (_: {
pattern: string,
cursor?: number, // default: -1
}) => any;

} // namespace browser

# Valid channels: analysis, commentary, final. Channel must be included for every message.<|end|>
```

If the model decides to call actions in the browser it will use the same format as for function calls with two notable exceptions:

1.  Requests will be made to the `analysis` channel
2.  The recipient will be `browser.search`, `browser.open`, `browser.find` respectively

#### Python tool

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Tools

## python

Use this tool to execute Python code in your chain of thought. The code will not be shown to the user. This tool should be used for internal reasoning, but not for code that is intended to be visible to the user (e.g. when creating plots, tables, or files).

When you send a message containing Python code to python, it will be executed in a stateful Jupyter notebook environment. python will respond with the output of the execution or time out after 120.0 seconds. The drive at '/mnt/data' can be used to save and persist user files. Internet access for this session is UNKNOWN. Depends on the cluster.

# Valid channels: analysis, commentary, final. Channel must be included for every message.<|end|>
```

If the model decides to execute Python code it will use the same format as for function calls with two notable exceptions:

3.  Requests will be made to the `analysis` channel
4.  The recipient will always be `python`

---

# Unsloth specific

## template

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: {{ currentDate }}
{{- if and .IsThinkSet .Think (ne .ThinkLevel "") }}

Reasoning: {{ .ThinkLevel }}
{{- else if or (not .IsThinkSet) (and .IsThinkSet .Think) }}

Reasoning: medium
{{- end }}

{{- $hasNonBuiltinTools := false }}
{{- if .Tools -}}
{{- $hasBrowserSearch := false }}
{{- $hasBrowserOpen := false }}
{{- $hasBrowserFind := false }}
{{- $hasPython := false }}
  {{- range .Tools }}
    {{- if eq .Function.Name "browser.search" -}}{{- $hasBrowserSearch = true -}}
    {{- else if eq .Function.Name "browser.open" -}}{{- $hasBrowserOpen = true -}}
    {{- else if eq .Function.Name "browser.find" -}}{{- $hasBrowserFind = true -}}
    {{- else if eq .Function.Name "python" -}}{{- $hasPython = true -}}
    {{- else }}{{ $hasNonBuiltinTools = true -}}
    {{- end }}
  {{- end }}
{{- if or $hasBrowserSearch $hasBrowserOpen $hasBrowserFind $hasPython }}

# Tools
{{- if or $hasBrowserSearch $hasBrowserOpen $hasBrowserFind }}

## browser

// Tool for browsing.
// The `cursor` appears in brackets before each browsing display: `[{cursor}]`.
// Cite information from the tool using the following format:
// `【{cursor}†L{line_start}(-L{line_end})?】`, for example: `【6†L9-L11】` or `【8†L3】`.
// Do not quote more than 10 words directly from the tool output.
// sources=web (default: web)
namespace browser {
{{- if $hasBrowserSearch }}

// Searches for information related to `query` and displays `topn` results.
type search = (_: {
query: string,
topn?: number, // default: 10
source?: string,
}) => any;
{{- end }}
{{- if $hasBrowserOpen }}

// Opens the link `id` from the page indicated by `cursor` starting at line number `loc`, showing `num_lines` lines.
// Valid link ids are displayed with the formatting: `【{id}†.*】`.
// If `cursor` is not provided, the most recent page is implied.
// If `id` is a string, it is treated as a fully qualified URL associated with `source`.
// If `loc` is not provided, the viewport will be positioned at the beginning of the document or centered on the most relevant passage, if available.
// Use this function without `id` to scroll to a new location of an opened page.
type open = (_: {
id?: number | string, // default: -1
cursor?: number, // default: -1
loc?: number, // default: -1
num_lines?: number, // default: -1
view_source?: boolean, // default: false
source?: string,
}) => any;
{{- end }}
{{- if $hasBrowserFind }}

// Finds exact matches of `pattern` in the current page, or the page given by `cursor`.
type find = (_: {
pattern: string,
cursor?: number, // default: -1
}) => any;
{{- end }}

} // namespace browser
{{- end }}{{/* end if has browser tools */}}
{{- if $hasPython }}

## python

Use this tool to execute Python code in your chain of thought. The code will not be shown to the user. This tool should be used for internal reasoning, but not for code that is intended to be visible to the user (e.g. when creating plots, tables, or files).

When you send a message containing Python code to python, it will be executed in a stateful Jupyter notebook environment. python will respond with the output of the execution or time out after 120.0 seconds. The drive at '/mnt/data' can be used to save and persist user files. Internet access for this session is UNKNOWN. Depends on the cluster.
{{- end }}{{/* end if hasPython */}}
{{- end }}{{/* end if has any built-in tools */}}
{{- end }}{{/* end if .Tools */}}

# Valid channels: analysis, commentary, final. Channel must be included for every message.{{ if $hasNonBuiltinTools }}
Calls to these tools must go to the commentary channel: 'functions'.
{{- end -}}<|end|>{{/* end of system */ -}}
{{- if or $hasNonBuiltinTools .System -}}
<|start|>developer<|message|>{{- if $hasNonBuiltinTools }}# Tools

## functions

namespace functions {
{{- range .Tools }}
{{- if not (or (eq .Function.Name "browser.search") (eq .Function.Name "browser.open") (eq .Function.Name "browser.find") (eq .Function.Name "python")) }}
{{if .Function.Description }}
// {{ .Function.Description }}
{{- end }}
{{- if and .Function.Parameters.Properties (gt (len .Function.Parameters.Properties) 0) }}
type {{ .Function.Name }} = (_: {
{{- range $name, $prop := .Function.Parameters.Properties }}
{{- if $prop.Description }}
  // {{ $prop.Description }}
{{- end }}
  {{ $name }}: {{ if gt (len $prop.Type) 1 }}{{ range $i, $t := $prop.Type }}{{ if $i }} | {{ end }}{{ $t }}{{ end }}{{ else }}{{ index $prop.Type 0 }}{{ end }},
{{- end }}
}) => any;
{{- else }}
type {{ .Function.Name }} = () => any;
{{- end }}
{{- end }}{{/* end if not browser tool */}}
{{- end }}{{/* end of range .Tools */}}

} // namespace functions
{{- end }}{{/* end if hasNonBuiltinTools */}}
{{- if .System}}

# Instructions

{{ .System }}
{{- end -}}
<|end|>
{{- end -}}
{{- /* Find the index of the last user message */ -}}
{{- $lastUserIdx := -1 }}
{{- $prefillingContent := false }}
{{- $prefillingThinkingOnly := false }}
{{- range $i, $msg := .Messages }}
  {{- $last := eq (len (slice $.Messages $i)) 1 -}}
  {{- if eq $msg.Role "user" }}
    {{- $lastUserIdx = $i }}
  {{- end -}}
  {{- if and $last (eq $msg.Role "assistant") (gt (len $msg.Content) 0) }}
    {{- $prefillingContent = true }}
  {{- else if and $last (eq $msg.Role "assistant") (gt (len $msg.Thinking) 0) }}
    {{- $prefillingThinkingOnly = true }}
  {{- end }}
{{- end -}}
{{- /* Now render messages */ -}}
{{- range $i, $msg := .Messages }}
  {{- $last := eq (len (slice $.Messages $i)) 1 -}}
  {{- if (ne $msg.Role "system") -}}
    {{- if eq $msg.Role "tool" -}}
      {{- if or (eq $msg.ToolName "python") (eq $msg.ToolName "browser.search") (eq $msg.ToolName "browser.open") (eq $msg.ToolName "browser.find") -}}
        <|start|>{{ $msg.ToolName }} to=assistant<|message|>{{ $msg.Content }}<|end|>
      {{- else -}}
        <|start|>functions.{{ $msg.ToolName }} to=assistant<|message|>{{ $msg.Content }}<|end|>
      {{- end -}}
    {{- else if eq $msg.Role "assistant" -}}
      {{- if and $msg.Thinking (gt $i $lastUserIdx) -}}{{- /* Show thinking only after last user message */ -}}
      <|start|>assistant<|channel|>analysis<|message|>{{ $msg.Thinking }}{{- if not $prefillingThinkingOnly -}}<|end|>{{- end -}}
      {{- end -}}
      {{- if gt (len $msg.Content) 0 -}}
        <|start|>assistant<|channel|>final<|message|>{{ $msg.Content }}{{- if not $prefillingContent -}}<|end|>{{- end -}}
      {{- end -}}
      {{- if gt (len $msg.ToolCalls) 0 -}}
        {{- range $j, $toolCall := $msg.ToolCalls -}}
          {{- $isBuiltin := or (eq $toolCall.Function.Name "python") (eq $toolCall.Function.Name "browser.search") (eq $toolCall.Function.Name "browser.open") (eq $toolCall.Function.Name "browser.find") -}}
          <|start|>assistant<|channel|>{{ if $isBuiltin }}analysis{{ else }}commentary{{ end }} to={{ if not $isBuiltin}}functions.{{end}}{{ $toolCall.Function.Name }} <|constrain|>json<|message|>{{ $toolCall.Function.Arguments }}<|call|>
        {{- end -}}
      {{- end -}}
    {{- else if eq $msg.Role "user" -}}
      <|start|>{{ $msg.Role }}<|message|>{{ $msg.Content }}<|end|>
    {{- end }}
  {{- else }}
  {{- end }}
{{- end -}}
{{- if not (or $prefillingContent $prefillingThinkingOnly) -}}
<|start|>assistant
{{- end -}}
```

---

## params

```
{
    "stop": [
        "<|endoftext|>",
        "<|return|>"
    ],
    "temperature": 1.0,
    "min_p" : 0.00,
    "top_k" : 0,
    "top_p" : 1.0
}
```

---

## config.json

```
{
  "architectures": [
    "GptOssForCausalLM"
  ],
  "attention_bias": true,
  "attention_dropout": 0.0,
  "eos_token_id": 200002,
  "experts_per_token": 4,
  "head_dim": 64,
  "hidden_act": "silu",
  "hidden_size": 2880,
  "initial_context_length": 4096,
  "initializer_range": 0.02,
  "intermediate_size": 2880,
  "layer_types": [
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention",
    "sliding_attention",
    "full_attention"
  ],
  "max_position_embeddings": 131072,
  "model_type": "gpt_oss",
  "num_attention_heads": 64,
  "num_experts_per_tok": 4,
  "num_hidden_layers": 24,
  "num_key_value_heads": 8,
  "num_local_experts": 32,
  "output_router_logits": false,
  "pad_token_id": 200017,
  "rms_norm_eps": 1e-05,
  "rope_scaling": {
    "beta_fast": 32.0,
    "beta_slow": 1.0,
    "factor": 32.0,
    "original_max_position_embeddings": 4096,
    "rope_type": "yarn",
    "truncate": false
  },
  "rope_theta": 150000,
  "router_aux_loss_coef": 0.9,
  "sliding_window": 128,
  "swiglu_limit": 7.0,
  "tie_word_embeddings": false,
  "torch_dtype": "bfloat16",
  "transformers_version": "4.55.0",
  "unsloth_fixed": true,
  "use_cache": true,
  "vocab_size": 201088
}
```

---

## readme

````
---

---
description: Run & fine-tune OpenAI's new open-source models!
---

# gpt-oss: How to Run & Fine-tune

OpenAI releases '**gpt-oss-120b'** and '**gpt-oss-20b'**, two SOTA open language models under the Apache 2.0 license. Both 128k context models outperform similarly sized open models in reasoning, tool use, and agentic tasks. You can now run & fine-tune them locally with Unsloth!

{% hint style="info" %}
Aug 13: We've fixed our fine-tuning & inference notebooks making them much more stable! Update Unsloth using the new installation cells.
{% endhint %}

It's best to train & use Unsloth quants due to our [fixes](#unsloth-fixes-for-gpt-oss) for the model.

> [**Fine-tune**](#fine-tuning-gpt-oss-with-unsloth) **gpt-oss-20b for free with our** [**Colab notebook**](https://colab.research.google.com/github/unslothai/notebooks/blob/main/nb/gpt-oss-\(20B\)-Fine-tuning.ipynb)

Trained with [RL](reinforcement-learning-rl-guide), **gpt-oss-120b** rivals o4-mini and **gpt-oss-20b** rivals o3-mini. Both excel at function calling and CoT reasoning, surpassing o1 and GPT-4o.

{% hint style="success" %}
**Includes Unsloth's** [**chat template fixes**](#unsloth-fixes-for-gpt-oss)**. For best results, use our uploads & train with Unsloth!**
{% endhint %}

<a href="#run-gpt-oss-20b" class="button secondary">Run gpt-oss-20b</a><a href="#run-gpt-oss-120b" class="button secondary">Run gpt-oss-120b</a><a href="#fine-tuning-gpt-oss-with-unsloth" class="button primary">Fine-tune gpt-oss</a>

#### **gpt-oss - Unsloth GGUFs:**

* 20B: [gpt-oss-**20B**](https://huggingface.co/unsloth/gpt-oss-20b-GGUF)

## :scroll:Unsloth fixes for gpt-oss

OpenAI released a standalone parsing and tokenization library called [Harmony](https://github.com/openai/harmony) which allows one to tokenize conversations to OpenAI's preferred format for gpt-oss. The official OpenAI [cookbook article](https://app.gitbook.com/o/HpyELzcNe0topgVLGCZY/s/xhOjnexMCB3dmuQFQ2Zq/) provides many more details on how to use the Harmony library.

Inference engines generally use the jinja chat template instead and not the Harmony package, and we found some issues with them after comparing with Harmony directly. If you see below, the top is the correct rendered form as from Harmony. The below is the one rendered by the current jinja chat template. There are quite a few differences!


We also made some functions to directly allow you to use OpenAI's Harmony library directly without a jinja chat template if you desire - you can simply parse in normal conversations like below:

```python
messages = [
    {"role" : "user", "content" : "What is 1+1?"},
    {"role" : "assistant", "content" : "2"},
    {"role": "user",  "content": "What's the temperature in San Francisco now? How about tomorrow? Today's date is 2024-09-30."},
    {"role": "assistant",  "content": "User asks: 'What is the weather in San Francisco?' We need to use get_current_temperature tool.", "thinking" : ""},
    {"role": "assistant", "content": "", "tool_calls": [{"name": "get_current_temperature", "arguments": '{"location": "San Francisco, California, United States", "unit": "celsius"}'}]},
    {"role": "tool", "name": "get_current_temperature", "content": '{"temperature": 19.9, "location": "San Francisco, California, United States", "unit": "celsius"}'},
]
```

Then use the `encode_conversations_with_harmony` function from Unsloth:

```python
from unsloth_zoo import encode_conversations_with_harmony

def encode_conversations_with_harmony(
    messages,
    reasoning_effort = "medium",
    add_generation_prompt = True,
    tool_calls = None,
    developer_instructions = None,
    model_identity = "You are ChatGPT, a large language model trained by OpenAI.",
)
```

The harmony format includes multiple interesting things:

1. `reasoning_effort = "medium"` You can select low, medium or high, and this changes gpt-oss's reasoning budget - generally the higher the better the accuracy of the model.
2. `developer_instructions` is like a system prompt which you can add.
3. `model_identity` is best left alone - you can edit it, but we're unsure if custom ones will function.

We find multiple issues with current jinja chat templates (there exists multiple implementations across the ecosystem):

1. Function and tool calls are rendered with `tojson`, which is fine it's a dict, but if it's a string, speech marks and other **symbols become backslashed**.
2. There are some **extra new lines** in the jinja template on some boundaries.
3. Tool calling thoughts from the model should have the **`analysis` tag and not `final` tag**.
4. Other chat templates seem to not utilize `<|channel|>final` at all - one should use this for the final assistant message. You should not use this for thinking traces or tool calls.

Our chat templates for the GGUF, our BnB and BF16 uploads and all versions are fixed!

## :1234: Precision issues

We found multiple precision issues in Tesla T4 and float16 machines primarily since the model was trained using BF16, and so outliers and overflows existed. MXFP4 is not actually supported on Ampere and older GPUs, so Triton provides `tl.dot_scaled` for MXFP4 matrix multiplication. It upcasts the matrices to BF16 internaly on the fly.

We made a [MXFP4 inference notebook](https://colab.research.google.com/github/unslothai/notebooks/blob/main/nb/GPT_OSS_MXFP4_\(20B\)-Inference.ipynb) as well in Tesla T4 Colab!

{% hint style="info" %}
[Software emulation](https://triton-lang.org/main/python-api/generated/triton.language.dot_scaled.html) enables targeting hardware architectures without native microscaling operation support. Right now for such case, microscaled lhs/rhs are upcasted to `bf16` element type beforehand for dot computation,
{% endhint %}

We found if you use float16 as the mixed precision autocast data-type, you will get infinities after some time. To counteract this, we found doing the MoE in bfloat16, then leaving it in either bfloat16 or float32 precision. If older GPUs don't even have bfloat16 support (like T4), then float32 is used.

We also change all precisions of operations (like the router) to float32 for float16 machines.

## 🖥️ **Running gpt-oss**

Below are guides for the [20B](#run-gpt-oss-20b) and [120B](#run-gpt-oss-120b) variants of the model.

{% hint style="info" %}
Any quant smaller than F16, including 2-bit has minimal accuracy loss, since only some parts (e.g., attention layers) are lower bit while most remain full-precision. That’s why sizes are close to the F16 model; for example, the 2-bit (11.5 GB) version performs nearly the same as the full 16-bit (14 GB) one. Once llama.cpp supports better quantization for these models, we'll upload them ASAP.
{% endhint %}

### :gear: Recommended Settings

OpenAI recommends these inference settings for both models:

`temperature=1.0`, `top_p=1.0`, `top_k=0`

* <mark style="background-color:green;">**Temperature of 1.0**</mark>
* Top\_K = 0 (or experiment with 100 for possible better results)
* Top\_P = 1.0
* Recommended minimum context: 16,384
* Maximum context length window: 131,072
* OpenAI now lets you adjust gpt-oss reasoning traces: low, medium, or high - if your tool supports it. Lower traces speed up responses but may slightly reduce answer quality.

**Chat template:**

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.\nKnowledge cutoff: 2024-06\nCurrent date: 2025-08-05\n\nReasoning: medium\n\n# Valid channels: analysis, commentary, final. Channel must be included for every message.<|end|><|start|>user<|message|>Hello<|end|><|start|>assistant<|channel|>final<|message|>Hi there!<|end|><|start|>user<|message|>What is 1+1?<|end|><|start|>assistant
```

The end of sentence/generation token: EOS is `<|return|>`

### Run gpt-oss-20B


To achieve inference speeds of 6+ tokens per second for our Dynamic 4-bit quant, have at least **14GB of unified memory** (combined VRAM and RAM) or **14GB of system RAM** alone. As a rule of thumb, your available memory should match or exceed the size of the model you’re using. GGUF Link: [unsloth/gpt-oss-20b-GGUF](https://huggingface.co/unsloth/gpt-oss-20b-GGUF)

**NOTE:** The model can run on less memory than its total size, but this will slow down inference. Maximum memory is only needed for the fastest speeds.&#x20;

{% hint style="info" %}
Follow the [**best practices above**](#recommended-settings). They're the same as the 120B model.
{% endhint %}

You can run the model on Google Colab, Docker, LM Studio or llama.cpp for now. See below:

> **You can run gpt-oss-20b for free with our** [**Google Colab notebook**](https://colab.research.google.com/github/unslothai/notebooks/blob/main/nb/GPT_OSS_MXFP4_\(20B\)-Inference.ipynb)

#### 🐋 Docker: Run gpt-oss-20b Tutorial

If you already have Docker desktop, all your need to do is run the command below and you're done:

```
docker model pull hf.co/unsloth/gpt-oss-20b-GGUF:F16
```

#### :sparkles: Llama.cpp: Run gpt-oss-20b Tutorial

1. Obtain the latest `llama.cpp` on [GitHub here](https://github.com/ggml-org/llama.cpp). You can follow the build instructions below as well. Change `-DGGML_CUDA=ON` to `-DGGML_CUDA=OFF` if you don't have a GPU or just want CPU inference.

```bash
apt-get update
apt-get install pciutils build-essential cmake curl libcurl4-openssl-dev -y
git clone https://github.com/ggml-org/llama.cpp
cmake llama.cpp -B llama.cpp/build \
    -DBUILD_SHARED_LIBS=OFF -DGGML_CUDA=ON -DLLAMA_CURL=ON
cmake --build llama.cpp/build --config Release -j --clean-first --target llama-cli llama-gguf-split
cp llama.cpp/build/bin/llama-* llama.cpp
```

2.  You can directly pull from Hugging Face via:

    ```
    ./llama.cpp/llama-cli \
        -hf unsloth/gpt-oss-20b-GGUF:F16 \
        --jinja -ngl 99 --threads -1 --ctx-size 16384 \
        --temp 1.0 --top-p 1.0 --top-k 0
    ```
3. Download the model via (after installing `pip install huggingface_hub hf_transfer` ).

```python
# !pip install huggingface_hub hf_transfer
import os
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id = "unsloth/gpt-oss-20b-GGUF",
    local_dir = "unsloth/gpt-oss-20b-GGUF",
    allow_patterns = ["*F16*"],
)
```


## 🦥 Fine-tuning gpt-oss with Unsloth

**Unsloth gpt-oss fine-tuning is 1.5x faster, uses 70% less VRAM, and supports 10x longer context lengths.** gpt-oss-20b LoRA training fits on a 14GB VRAM, and **gpt-oss-120b works on 65GB VRAM**.

{% hint style="info" %}
Aug 13: We've fixed our fine-tuning & inference notebooks making them much more stable! Update Unsloth using the new installation cells we put in the notebook.
{% endhint %}

Free Unsloth notebooks to fine-tune gpt-oss:

* gpt-oss-20b [Reasoning + Conversational notebook](https://colab.research.google.com/github/unslothai/notebooks/blob/main/nb/gpt-oss-\(20B\)-Fine-tuning.ipynb) (recommended)
* GRPO notebooks coming soon! Stay tuned!

To fine-tune gpt-oss and leverage our latest updates, you must install the latest version of Unsloth:

```
pip install --upgrade --force-reinstall --no-cache-dir unsloth unsloth_zoo
```

### 💡Making efficient gpt-oss fine-tuning work

We found that while MXFP4 is highly efficient, it does not natively support training with gpt-oss. To overcome this limitation, we implemented custom training functions specifically for MXFP4 layers through mimicking it via `Bitsandbytes` NF4 quantization.

We utilized OpenAI's Triton Kernels library directly to allow MXFP4 inference. For finetuning / training however, the MXFP4 kernels do not yet support training, since the backwards pass is not yet implemented. We're actively working on implementing it in Triton! There is a flag called `W_TRANSPOSE` as mentioned [here](https://github.com/triton-lang/triton/blob/main/python/triton_kernels/triton_kernels/matmul_ogs_details/_matmul_ogs.py#L39), which should be implemented. The derivative can be calculated by the transpose of the weight matrices, and so we have to implement the transpose operation.

If you want to train gpt-oss with any library other than Unsloth, you’ll need to upcast the weights to bf16 before training. This approach, however, **significantly increases** both VRAM usage and training time by as much as **300% more memory usage**! <mark style="background-color:green;">**ALL other training methods will require a minimum of 65GB VRAM to train the 20b model while Unsloth only requires 14GB VRAM (-80%).**</mark>

As both models use MoE architecture, the 20B model selects 4 experts out of 32, while the 120B model selects 4 out of 128 per token. During training and release, weights are stored in MXFP4 format as `nn.Parameter` objects, not as `nn.Linear` layers, which complicates quantization, especially since MoE/MLP experts make up about 19B of the 20B parameters.

To enable `BitsandBytes` quantization and memory-efficient fine-tuning, we converted these parameters into `nn.Linear` layers. Although this slightly slows down operations, it allows fine-tuning on GPUs with limited memory, a worthwhile trade-off.

### Datasets fine-tuning guide

Though gpt-oss supports only reasoning, you can still fine-tune it with a non-reasoning [dataset](datasets-guide), but this may affect its reasoning ability. If you want to maintain its reasoning capabilities (optional), you can use a mix of direct answers and chain-of-thought examples. Use at least <mark style="background-color:green;">75% reasoning</mark> and <mark style="background-color:green;">25% non-reasoning</mark> in your dataset to make the model retain its reasoning capabilities.

Our gpt-oss-20b Conversational notebook uses OpenAI's example which is Hugging Face's Multilingual-Thinking dataset. The purpose of using this dataset is to enable the model to learn and develop reasoning capabilities in these four distinct languages.
