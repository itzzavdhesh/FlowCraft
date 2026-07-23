<div align="center">

# 🔀 FlowCraft

**A form-driven flowchart builder powered by Gemini AI.**

Build beautiful, structured flowcharts by filling out a simple form — no dragging shapes manually.

[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen)](https://github.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue)](CONTRIBUTING.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)

</div>

---

## What is FlowCraft?

FlowCraft (internally called FlowForge) is an AI-assisted flowchart builder where you describe your flow using a structured form interface, and the app renders it as a clean visual diagram. It supports terminators, process blocks, and decision nodes — all wired together through a linked-list-style canvas.

Key highlights:

- Form-based block creation (no drag-and-drop complexity)
- Real-time canvas rendering with connection arrows
- Gemini AI integration for smart assistance
- Export to PNG, PDF, and PPTX
- Save/load workspace via Local Storage

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React 19 + TypeScript               |
| Styling    | Tailwind CSS v4                     |
| Build Tool | Vite                                |
| AI         | Google Gemini API (`@google/genai`) |
| Animations | Motion (Framer Motion)              |
| Export     | html-to-image, jsPDF, PptxGenJS     |
| Icons      | Lucide React                        |

---

## Project Structure

```
FlowCraft/
├── src/
│   ├── components/
│   │   ├── CenterCanvas.tsx   # Main flowchart canvas
│   │   ├── LeftSidebar.tsx    # Block creation form panel
│   │   ├── RightSidebar.tsx   # Block properties panel
│   │   └── Toast.tsx          # Notification system
│   ├── utils/
│   │   └── layout.ts          # Auto-layout logic
│   ├── App.tsx                # Root component & state
│   ├── types.ts               # Shared TypeScript types
│   └── index.css
├── .env.example
└── metadata.json
```

---

## Run Locally

**Prerequisites:** Node.js 18+

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/FlowCraft.git
cd FlowCraft

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# 4. Start the dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

**Getting a Gemini API key:** Visit [Google AI Studio](https://aistudio.google.com/) → Get API key.

---

## Available Scripts

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start dev server on port 3000 |
| `npm run build`   | Production build              |
| `npm run preview` | Preview production build      |
| `npm run lint`    | TypeScript type check         |

---

## Contributing

Contributions are welcome! Whether it's a bug fix, new feature, or documentation improvement — all help is appreciated.

- Read the [Contributing Guide](CONTRIBUTING.md) before opening a PR
- Check [open issues](../../issues) for things to work on
- Look for issues labeled `good first issue` if you're new

---

## Live Demo

View the app running on AI Studio: [FlowCraft on AI Studio](https://ai.studio/apps/97299ac9-6418-472f-a6d9-920fdb698eed)

---

## License

Licensed under the [Apache 2.0 License](LICENSE).
