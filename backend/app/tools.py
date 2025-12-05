# app/tools.py

async def call_tools(model: str, tools: list[str], message: str, history: list | None):
    # TODO: implement real tool-calling logic (e.g. call weather APIs)
    # For now, just echo what would happen.
    return {
        "final_answer": f"[TOOLS MODEL {model}] Would call tools {tools} to answer: '{message}'"
    }
