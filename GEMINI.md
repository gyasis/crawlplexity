# Project Overview

This project, named "Crawlplexity," is a self-hosted AI-powered search engine. It combines Google search results (via the Serper API) with intelligent web scraping (using a self-hosted Crawl4AI instance) and language model processing (via LiteLLM) to provide accurate, cited answers to user queries. The frontend is built with Next.js and React, and the backend relies on a combination of services orchestrated by the Next.js server.

**Key Technologies:**

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend:** Node.js (via Next.js), LiteLLM, Crawl4AI
*   **APIs:** Serper API (for Google Search)
*   **Caching:** Redis
*   **LLM Providers:** OpenAI, Anthropic, Claude, Groq, Google, and local Ollama models

**Architecture:**

The application follows a microservice-based architecture. The user's query is first sent to the Serper API to get Google search results. Then, Crawl4AI scrapes the content of the top results. This content is then passed to a large language model via LiteLLM to generate a response. The results are cached in Redis to improve performance.

# Building and Running

**1. Prerequisites:**

*   Docker and Docker Compose
*   Node.js 18+
*   API keys for Serper and at least one LLM provider (or a local Ollama instance)

**2. Installation:**

```bash
npm install
```

**3. Environment Setup:**

Create a `.env.local` file and add the necessary API keys. An example is provided in the `README.md`.

**4. Running the Application:**

There are two ways to run the application:

*   **Using Docker Compose (Recommended):**

    ```bash
    docker-compose up -d
    ```

*   **Running Services Individually:**

    ```bash
    # Start Crawl4AI scraping service
    docker run -d -p 11235:11235 unclecode/crawl4ai:latest

    # Start LiteLLM proxy
    docker run -d -p 14782:4000 ghcr.io/berriai/litellm:main-latest

    # Start Redis cache
    docker run -d -p 29674:6379 redis:alpine
    ```

**5. Starting the Development Server:**

```bash
npm run dev
```

The application will be available at `http://localhost:18563`.

**6. Building for Production:**

```bash
npm run build
```

**7. Starting the Production Server:**

```bash
npm start
```

# Development Conventions

*   **Linting:** The project uses ESLint for code linting. Run `npm run lint` to check for linting errors.
*   **Testing:** The `README.md` does not mention a specific testing framework, but there is a `tests` directory, which suggests that tests are part of the project.
*   **Commits:** The `README.md` does not specify any commit message conventions.
*   **Contributing:** The `README.md` provides instructions for contributing to the project.
