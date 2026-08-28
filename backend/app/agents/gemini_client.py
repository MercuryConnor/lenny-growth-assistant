import os
from google import genai

def generate_response_gemini(prompt: str) -> str:
    """
    Generates a response using the Google Gemini API (gemini-2.0-flash).
    Expects GEMINI_API_KEY environment variable to be set.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set. Cannot use Gemini Cloud LLM.")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )
    return response.text
