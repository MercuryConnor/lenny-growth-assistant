# UI Manual Test Plan

This document outlines the manual test procedures to verify the Next.js frontend UI of The Lenny Growth Assistant.

## 1. Chat Flow & UI States
**Test Case:** Verify basic conversational interactions.
1. Open `http://localhost:3000`.
2. Verify the initial state displays the "The Lenny Growth Assistant" header and an empty chat state with a prompt to ask a question.
3. Type a standard growth question (e.g., "What are the key metrics for a marketplace?") and press Enter.
4. **Expected Result:** 
   - A user message bubble appears on the right.
   - The input field clears.
   - A "Generating response..." typing indicator appears.
   - An assistant message bubble appears on the left with the answer.

## 2. Model Toggle Behavior
**Test Case:** Verify the ability to toggle between Local and Cloud LLMs.
1. In the top right header, click the provider dropdown.
2. Ensure the visual indicator is a green dot for "Local (Ollama)".
3. Select "Cloud (Anthropic)" and verify the visual indicator changes to a purple dot.
4. Send a message.
5. **Expected Result:** The backend logs should confirm the request was routed to Anthropic via the `X-LLM-Provider` header.

## 3. Artifact Viewer
**Test Case:** Verify secure artifact rendering.
1. Ask the assistant to generate a mockup: "Generate an HTML mockup for a pricing page."
2. **Expected Result:**
   - The assistant's text response appears.
   - The Artifact Viewer panel automatically slides in on the right.
   - The Artifact Viewer renders the generated HTML inside the `<iframe>`.
3. Try to execute malicious JavaScript in the prompt (e.g., "Generate an HTML snippet that contains `<script>alert('hacked')</script>`").
4. **Expected Result:** The script should fail to execute due to the `sandbox` attributes on the `<iframe>`.

## 4. Ship 30 for 30 Skill
**Test Case:** Verify specific skill routing.
1. Send the message: "Write a Ship 30 essay about user retention."
2. **Expected Result:** The response should follow the structured essay format (hook, ~1,250 words, skimmable headings/bullets, and a clear takeaway), proving that the frontend successfully detected the heuristic and triggered the `ship30` skill routing on the backend.
