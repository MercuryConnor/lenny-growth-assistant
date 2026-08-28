import os
from langchain_community.llms import Ollama
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

class LLMFactory:
    @staticmethod
    def get_llm(provider: str = "ollama", model_name: str = "llama3.2:1b"):
        if provider == "ollama":
            return Ollama(
                base_url=OLLAMA_BASE_URL,
                model=model_name,
                callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])
            )
        # Cloud providers can be added here
        raise ValueError(f"Unknown provider: {provider}")

def generate_response(prompt: str, provider: str = "ollama"):
    llm = LLMFactory.get_llm(provider)
    return llm.invoke(prompt)
