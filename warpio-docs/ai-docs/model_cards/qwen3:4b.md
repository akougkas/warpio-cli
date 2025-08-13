## config.json

```
{
  "architectures": [
    "Qwen3ForCausalLM"
  ],
  "attention_bias": false,
  "attention_dropout": 0.0,
  "bos_token_id": 151643,
  "eos_token_id": 151645,
  "head_dim": 128,
  "hidden_act": "silu",
  "hidden_size": 2560,
  "initializer_range": 0.02,
  "intermediate_size": 9728,
  "max_position_embeddings": 262144,
  "max_window_layers": 36,
  "model_type": "qwen3",
  "num_attention_heads": 32,
  "num_hidden_layers": 36,
  "num_key_value_heads": 8,
  "rms_norm_eps": 1e-06,
  "rope_scaling": null,
  "rope_theta": 5000000,
  "sliding_window": null,
  "tie_word_embeddings": true,
  "torch_dtype": "bfloat16",
  "transformers_version": "4.51.0",
  "use_cache": true,
  "use_sliding_window": false,
  "vocab_size": 151936
}
```

---

## tokenizer_config.json

```
{
    "add_prefix_space": false,
    "added_tokens_decoder": {
        "151643": {
            "content": "<|endoftext|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151644": {
            "content": "<|im_start|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151645": {
            "content": "<|im_end|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151646": {
            "content": "<|object_ref_start|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151647": {
            "content": "<|object_ref_end|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151648": {
            "content": "<|box_start|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151649": {
            "content": "<|box_end|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151650": {
            "content": "<|quad_start|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151651": {
            "content": "<|quad_end|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151652": {
            "content": "<|vision_start|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151653": {
            "content": "<|vision_end|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151654": {
            "content": "<|vision_pad|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151655": {
            "content": "<|image_pad|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151656": {
            "content": "<|video_pad|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": true
        },
        "151657": {
            "content": "<tool_call>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151658": {
            "content": "</tool_call>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151659": {
            "content": "<|fim_prefix|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151660": {
            "content": "<|fim_middle|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151661": {
            "content": "<|fim_suffix|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151662": {
            "content": "<|fim_pad|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151663": {
            "content": "<|repo_name|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151664": {
            "content": "<|file_sep|>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151665": {
            "content": "<tool_response>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151666": {
            "content": "</tool_response>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151667": {
            "content": "<think>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        },
        "151668": {
            "content": "</think>",
            "lstrip": false,
            "normalized": false,
            "rstrip": false,
            "single_word": false,
            "special": false
        }
    },
    "additional_special_tokens": [
        "<|im_start|>",
        "<|im_end|>",
        "<|object_ref_start|>",
        "<|object_ref_end|>",
        "<|box_start|>",
        "<|box_end|>",
        "<|quad_start|>",
        "<|quad_end|>",
        "<|vision_start|>",
        "<|vision_end|>",
        "<|vision_pad|>",
        "<|image_pad|>",
        "<|video_pad|>"
    ],
    "bos_token": null,
    "chat_template": "{%- if tools %}\n    {{- '<|im_start|>system\\n' }}\n    {%- if messages[0].role == 'system' %}\n        {{- messages[0].content + '\\n\\n' }}\n    {%- endif %}\n    {{- \"# Tools\\n\\nYou may call one or more functions to assist with the user query.\\n\\nYou are provided with function signatures within <tools></tools> XML tags:\\n<tools>\" }}\n    {%- for tool in tools %}\n        {{- \"\\n\" }}\n        {{- tool | tojson }}\n    {%- endfor %}\n    {{- \"\\n</tools>\\n\\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\\n<tool_call>\\n{\\\"name\\\": <function-name>, \\\"arguments\\\": <args-json-object>}\\n</tool_call><|im_end|>\\n\" }}\n{%- else %}\n    {%- if messages[0].role == 'system' %}\n        {{- '<|im_start|>system\\n' + messages[0].content + '<|im_end|>\\n' }}\n    {%- endif %}\n{%- endif %}\n{%- set ns = namespace(multi_step_tool=true, last_query_index=messages|length - 1) %}\n{%- for message in messages[::-1] %}\n    {%- set index = (messages|length - 1) - loop.index0 %}\n    {%- if ns.multi_step_tool and message.role == \"user\" and message.content is string and not(message.content.startswith('<tool_response>') and message.content.endswith('</tool_response>')) %}\n        {%- set ns.multi_step_tool = false %}\n        {%- set ns.last_query_index = index %}\n    {%- endif %}\n{%- endfor %}\n{%- for message in messages %}\n    {%- if message.content is string %}\n        {%- set content = message.content %}\n    {%- else %}\n        {%- set content = '' %}\n    {%- endif %}\n    {%- if (message.role == \"user\") or (message.role == \"system\" and not loop.first) %}\n        {{- '<|im_start|>' + message.role + '\\n' + content + '<|im_end|>' + '\\n' }}\n    {%- elif message.role == \"assistant\" %}\n        {%- set reasoning_content = '' %}\n        {%- if message.reasoning_content is string %}\n            {%- set reasoning_content = message.reasoning_content %}\n        {%- else %}\n            {%- if '</think>' in content %}\n                {%- set reasoning_content = content.split('</think>')[0].rstrip('\\n').split('<think>')[-1].lstrip('\\n') %}\n                {%- set content = content.split('</think>')[-1].lstrip('\\n') %}\n            {%- endif %}\n        {%- endif %}\n        {%- if loop.index0 > ns.last_query_index %}\n            {%- if loop.last or (not loop.last and reasoning_content) %}\n                {{- '<|im_start|>' + message.role + '\\n<think>\\n' + reasoning_content.strip('\\n') + '\\n</think>\\n\\n' + content.lstrip('\\n') }}\n            {%- else %}\n                {{- '<|im_start|>' + message.role + '\\n' + content }}\n            {%- endif %}\n        {%- else %}\n            {{- '<|im_start|>' + message.role + '\\n' + content }}\n        {%- endif %}\n        {%- if message.tool_calls %}\n            {%- for tool_call in message.tool_calls %}\n                {%- if (loop.first and content) or (not loop.first) %}\n                    {{- '\\n' }}\n                {%- endif %}\n                {%- if tool_call.function %}\n                    {%- set tool_call = tool_call.function %}\n                {%- endif %}\n                {{- '<tool_call>\\n{\"name\": \"' }}\n                {{- tool_call.name }}\n                {{- '\", \"arguments\": ' }}\n                {%- if tool_call.arguments is string %}\n                    {{- tool_call.arguments }}\n                {%- else %}\n                    {{- tool_call.arguments | tojson }}\n                {%- endif %}\n                {{- '}\\n</tool_call>' }}\n            {%- endfor %}\n        {%- endif %}\n        {{- '<|im_end|>\\n' }}\n    {%- elif message.role == \"tool\" %}\n        {%- if loop.first or (messages[loop.index0 - 1].role != \"tool\") %}\n            {{- '<|im_start|>user' }}\n        {%- endif %}\n        {{- '\\n<tool_response>\\n' }}\n        {{- content }}\n        {{- '\\n</tool_response>' }}\n        {%- if loop.last or (messages[loop.index0 + 1].role != \"tool\") %}\n            {{- '<|im_end|>\\n' }}\n        {%- endif %}\n    {%- endif %}\n{%- endfor %}\n{%- if add_generation_prompt %}\n    {{- '<|im_start|>assistant\\n<think>\\n' }}\n{%- endif %}",
    "clean_up_tokenization_spaces": false,
    "eos_token": "<|im_end|>",
    "errors": "replace",
    "model_max_length": 262144,
    "pad_token": "<|endoftext|>",
    "split_special_tokens": false,
    "tokenizer_class": "Qwen2Tokenizer",
    "unk_token": null,
    "add_bos_token": false
}
```

## tokenizer.json

```
{
  "version": "1.0",
  "truncation": null,
  "padding": null,
  "added_tokens": [
    {
      "id": 151643,
      "content": "<|endoftext|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151644,
      "content": "<|im_start|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151645,
      "content": "<|im_end|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151646,
      "content": "<|object_ref_start|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151647,
      "content": "<|object_ref_end|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151648,
      "content": "<|box_start|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151649,
      "content": "<|box_end|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151650,
      "content": "<|quad_start|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151651,
      "content": "<|quad_end|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151652,
      "content": "<|vision_start|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151653,
      "content": "<|vision_end|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151654,
      "content": "<|vision_pad|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151655,
      "content": "<|image_pad|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151656,
      "content": "<|video_pad|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": true
    },
    {
      "id": 151657,
      "content": "<tool_call>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151658,
      "content": "</tool_call>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151659,
      "content": "<|fim_prefix|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151660,
      "content": "<|fim_middle|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151661,
      "content": "<|fim_suffix|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151662,
      "content": "<|fim_pad|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151663,
      "content": "<|repo_name|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151664,
      "content": "<|file_sep|>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151665,
      "content": "<tool_response>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151666,
      "content": "</tool_response>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151667,
      "content": "<think>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    },
    {
      "id": 151668,
      "content": "</think>",
      "single_word": false,
      "lstrip": false,
      "rstrip": false,
      "normalized": false,
      "special": false
    }
  ],
  "normalizer": {
    "type": "NFC"
  },
  "pre_tokenizer": {
    "type": "Sequence",
    "pretokenizers": [
      {
        "type": "Split",
        "pattern": {
          "Regex": "(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}| ?[^\\s\\p{L}\\p{N}]+[\\r\\n]*|\\s*[\\r\\n]+|\\s+(?!\\S)|\\s+"
        },
        "behavior": "Isolated",
        "invert": false
      },
      {
        "type": "ByteLevel",
        "add_prefix_space": false,
        "trim_offsets": false,
        "use_regex": false
      }
    ]
  },
  "post_processor": {
    "type": "ByteLevel",
    "add_prefix_space": false,
    "trim_offsets": false,
    "use_regex": false
  },
  "decoder": {
    "type": "ByteLevel",
    "add_prefix_space": false,
    "trim_offsets": false,
    "use_regex": false
  },
  "model": {
    "type": "BPE",
    "dropout": null,
    "unk_token": null,
    "continuing_subword_prefix": "",
    "end_of_word_suffix": "",
    "fuse_unk": false,
    "byte_fallback": false,
    "ignore_merges": false,
  }
}
```
