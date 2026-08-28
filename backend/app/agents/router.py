from sqlalchemy.orm import Session
from app.services.rag import retrieve_relevant_chunks
from app.agents.llm_client import generate_response

def route_and_execute(db: Session, message: str, skill: str = "qa", provider: str = "ollama"):
    """
    Routes the user's message to the appropriate agent/prompt chain based on the provider.
    """
    
    # 0. Short-circuit for greeting / health-check messages
    greetings = {"hi", "hello", "hey", "ping", "test", "yo"}
    if message.strip().lower() in greetings:
        # Do a quick RAG smoke test to confirm the DB is live
        chunks = retrieve_relevant_chunks(db, "product growth strategy", top_k=1)
        db_status = "✅ Knowledge base is live" if chunks else "⚠️ Knowledge base is empty"
        return (
            "Hi! I am The Lenny Growth Assistant.",
            None
        )

    # 1. Retrieve context
    chunks = retrieve_relevant_chunks(db, message, top_k=5)
    context = "\n\n".join([c.content for c in chunks])
    
    if not context:
        context = "No relevant context found in the transcripts."


    # 2. Route based on skill
    if skill == "ship30":
        prompt = f"""
You are an expert growth and product writing assistant. 
Based strictly on the following context from Lenny's Podcast transcripts, write a Ship 30 for 30 style essay.
The essay must:
- Be approximately 1,250 words.
- Have a strong hook and clear narrative progression.
- Use skimmable formatting (headings, bullets, selective bolding).
- Have a specific, useful takeaway.
- Ground all claims in the provided context.

Context:
{context}

Topic/Question: {message}

Essay:
"""
    elif skill == "artifact":
        prompt = f"""
You are an expert web developer and UI designer.
Based on the following context and user request, generate a complete, working HTML/CSS/JS snippet or Markdown document.
You MUST wrap your output in <artifact type="html"> ... </artifact> or <artifact type="markdown"> ... </artifact> tags.

Context:
{context}

Request: {message}

Artifact:
"""
    else: # Default QA
        prompt = f"""
You are "The Lenny Growth Assistant", an AI assistant built to answer product management and growth questions strictly using Lenny's podcast transcripts.
Answer the following question using ONLY the context provided. If the context does not contain the answer, acknowledge that the available material does not support an answer. Do not hallucinate.

Context:
{context}

Question: {message}

Answer:
"""

    # 3. Generate response using selected provider
    if provider == "anthropic":
        from app.agents.anthropic_client import generate_response_anthropic
        response_text = generate_response_anthropic(prompt)
    elif provider == "gemini":
        from app.agents.gemini_client import generate_response_gemini
        response_text = generate_response_gemini(prompt)
    else:
        response_text = generate_response(prompt)
    
    
    # Parse artifacts if necessary
    artifact = None
    if "<artifact type=" in response_text:
        # Simple extraction, in a real app use a robust parser or regex
        start_idx = response_text.find("<artifact type=")
        end_idx = response_text.find("</artifact>") + len("</artifact>")
        if start_idx != -1 and end_idx != -1:
            artifact_tag = response_text[start_idx:end_idx]
            # determine type
            if 'type="html"' in artifact_tag:
                a_type = "html"
            else:
                a_type = "markdown"
            
            content_start = artifact_tag.find(">") + 1
            content_end = artifact_tag.rfind("</artifact>")
            content = artifact_tag[content_start:content_end].strip()
            
            artifact = {"type": a_type, "content": content}
            
            # Remove artifact from main chat response or replace with a placeholder
            response_text = response_text[:start_idx] + "\n[Artifact Generated]\n" + response_text[end_idx:]

    return response_text, artifact
