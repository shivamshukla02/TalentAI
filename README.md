# 🧠✨ TalentAI 

> **AI Resume Analyzer & Job Finder that actually slays.**

Tired of your applications going into the void? Getting ghosted by recruiters? We fixed that. **TalentAI** roasts (and boosts) your resume using AI and matches you with jobs that actually fit your vibe. No cap, just pure career Ws. 🚀

---

## 💅 The Vibe (Features)
- **Resume Glow-up:** Upload your PDF and let our AI cook. Get instant feedback, keyword optimization, and formatting checks.
- **Smart Job Matchmaking:** Stop endlessly scrolling LinkedIn. We find jobs that match your *actual* skills. 
- **Monorepo Magic:** Clean, scalable architecture so the codebase stays aesthetic.

---

## 🏗️ The Architecture (How it works under the hood)

We keep it clean with a `pnpm` monorepo. Here is how the magic happens:

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#ff9add,stroke:#ff69b4,stroke-width:2px,color:#000;
    classDef backend fill:#bbf7d0,stroke:#22c55e,stroke-width:2px,color:#000;
    classDef ai fill:#c7d2fe,stroke:#6366f1,stroke-width:2px,color:#000;
    classDef user fill:#fef08a,stroke:#eab308,stroke-width:2px,color:#000;

    %% Nodes
    U((🧑‍💻 You)):::user
    F[✨ Frontend <br> /talentai]:::frontend
    A[⚡️ API Server <br> /api-server]:::backend
    L[📦 Shared Libs <br> /lib]:::backend
    AI[🧠 AI Resume Engine]:::ai

    %% Connections
    U -->|Uploads Resume| F
    F -->|Sends Data| A
    A <-->|Prompts & Analysis| AI
    A -.->|Uses| L
    F -.->|Uses| L
    A -->|Returns Glow-up| F
    F -->|Displays Insights| U
