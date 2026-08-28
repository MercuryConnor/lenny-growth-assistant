import os
from anthropic import Anthropic

def generate_response_anthropic(prompt: str) -> str:
    """
    Generates a response using the Anthropic API (Claude 3.5 Sonnet).
    Expects ANTHROPIC_API_KEY environment variable to be set.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set. Cannot use Cloud LLM.")

    client = Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=2048,
        temperature=0.7,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response.content[0].text
