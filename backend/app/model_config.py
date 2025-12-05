# app/model_config.py

# The new AWS LLM ARNS are located at:
# https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/inference-profiles

MODEL_CONFIGS = {
    "general-assistant-1": {
        "type": "general",
        "base_model": "arn:aws:bedrock:us-east-1:353207798728:inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0",
        "system_prompt": "You are a helpful general assistant.",
    },
    "general-assistant-2": {
        "type": "general",
        "base_model": "arn:aws:bedrock:us-east-1:353207798728:inference-profile/global.anthropic.claude-opus-4-5-20251101-v1:0",
        "system_prompt": "You are a helpful general assistant.",
    },
    "general-assistant-3": {
        "type": "general",
        "base_model": "arn:aws:bedrock:us-east-1:353207798728:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0",
        "system_prompt": "You are a helpful general assistant.",
    },
    "rag-assistant-1": {
        "type": "rag-assistant-1",
        "base_model": "arn:aws:bedrock:us-east-1:353207798728:inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0",
        "system_prompt": "You are a helpful assistant that answers questions given relevant context.",
        "vector_store": r"C:\Users\Laptop\Desktop\Coding\React\hyperchat\pipelines\rag-assistant-1\vectorstore_db"
    },
    "tools-assistant-1": {
        "type": "tools-assistant-1",
        "base_model": "arn:aws:bedrock:us-east-1:353207798728:inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0",
        "system_prompt": "You can call tools to fetch live data.",
        "tools": ["weather", "inventory"],
    },
}
