# UI/UX Design Document: The Lenny Growth Assistant

## 1. UI/UX Principles
-   **Clarity over Density:** The interface should feel clean and focused on the conversation. Unnecessary UI elements should be hidden behind settings or contextual menus.
-   **Contextual Awareness:** The assistant should seamlessly transition between chat and artifact viewing without losing context.
-   **Feedback and State:** Clear loading states (e.g., typing indicators, skeleton loaders for artifacts) are crucial when interacting with local LLMs which might have higher latency.
-   **Accessibility:** Use semantic HTML, ARIA labels for interactive elements, and ensure sufficient color contrast (WCAG AA).

## 2. Information Architecture
-   **Main Layout:** Split screen. The left pane contains the conversation history and input area. The right pane (conditionally rendered) contains the Artifact Viewer.
-   **Header:** Session management (New Chat button, Session History dropdown), Model Toggle (Ollama vs. Cloud), and Settings.
-   **Input Area:** Text area that auto-expands, send button, and optional file attachment (if transcript upload is supported in the future).

## 3. Key Interaction States
1.  **Empty State:** When a new chat is started, display a welcome message with suggested prompts (e.g., "Draft a Ship 30 for 30 essay on product-led growth", "Create a landing page mockup for a B2B SaaS").
2.  **Generating State:** Show a pulsing indicator while the LLM is generating the response. If retrieving documents, show "Searching transcripts...".
3.  **Artifact Generation:** When an artifact is detected in the response stream, smoothly slide open the right pane to render the artifact.
4.  **Error State:** Graceful error messages (e.g., "Ollama is not responding. Please check if the local server is running.") instead of generic system failures.

## 4. Responsive Behavior
-   **Desktop (>1024px):** Side-by-side split pane for Chat (40%) and Artifact Viewer (60%).
-   **Tablet (768px - 1024px):** Side-by-side, but equal split (50/50).
-   **Mobile (<768px):** Stacked layout. The Artifact Viewer slides up as a bottom sheet or full-screen modal over the chat when activated.

## 5. Artifact Viewer Details
-   **Markdown Mode:** Renders standard Markdown with syntax highlighting for code blocks.
-   **HTML/CSS Mode (Preview):** Renders the generated code inside a sandboxed `<iframe>`.
    -   `sandbox="allow-scripts"` to permit interactive UI components.
    -   Restricted origin to prevent access to the main application's cookies or local storage.
-   **Code Mode:** Allows the user to view the raw generated code for the artifact.

## 6. Design Decisions
-   **Framework:** Tailwind CSS for rapid prototyping and maintaining a consistent design system. `shadcn/ui` for accessible, unstyled components that we can theme easily to match "Lenny's" branding (e.g., deep blues, clean whites).
-   **Model Toggle Visibility:** Placed prominently in the header to satisfy the evaluator's need to easily switch and test different LLM configurations.
