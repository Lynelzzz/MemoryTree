# MemoryTree

MemoryTree is a privacy-first web application designed to help users co-create short memory stories with the assistance of AI. The system provides gentle, controllable first-draft suggestions that users can fully edit before saving each story as a "leaf" on their personal MemoryTree.

This project was developed as part of an Individual Dissertation at the University of Nottingham, School of Computer Science.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Deployed Configuration (Recommended)](#deployed-configuration-recommended)
- [Local Configuration](#local-configuration)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Usage Guide](#usage-guide)
- [Privacy & Data Storage](#privacy--data-storage)
- [License](#license)

## Features

### AI-Assisted Generation
- **Deployed**: Uses OpenAI API (GPT-5) via Vercel serverless function
- **Local**: Uses a local language model (Qwen 4B used) via Ollama — no internet required

### Controllable Writing Assistant
- Selectable tone: warm / light / calm / neutral
- Selectable length preset: short / medium / long
- Topic chosen from prompt cards or custom input
- Safety constraints to avoid over-dramatisation
- Confirmation gate (two checkboxes) before saving

### MemoryTree Visualisation
- Interactive tree visualisation with SVG graphics
- Memories displayed as leaf-shaped nodes
- Organised by life phases (childhood, early-teens, teens, early-adult, recent)
- Tree canopy, trunk with bark texture, and root system
- Fullscreen mode support

### Memory Management
- View text, metadata, and creation time
- Edit leaf name, story text, and approximate year
- Attach images and videos (stored locally in IndexedDB)
- Export memories as `.txt` files or as a ZIP archive
- Delete with confirmation

### Complete Editing Control
- Rewrite, delete, or regenerate AI drafts
- Nothing is saved until user confirms

### Settings & Privacy
- Export all memories as a ZIP file (includes tree screenshot)
- Delete all locally stored data
- Explanation of prototype's research context

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Vite (build tool)
- CSS (custom styling, no frameworks)
- JSZip (ZIP export)
- html2canvas (tree screenshot for export)

### Backend (Local configuration only)
- Node.js
- Express
- Ollama (local LLM integration)

### Deployed backend
- Vercel serverless function (`frontend/api/generate.js`)
- OpenAI API

### Storage
- localStorage (memories and sessions)
- IndexedDB (media attachments)

## Project Structure

```
MemoryTree/
  frontend/
    api/
      generate.js          # Vercel serverless function (deployed config)
    src/
      assets/              # UoN logo, background
      components/          # Reusable UI components
        ConfirmGate.jsx
        Layout.jsx
        LengthSelector.jsx
        MemoryList.jsx
        MemoryTreeView.jsx
        PromptCardGrid.jsx
        SafetyNotice.jsx
        ToneSelector.jsx
      pages/               # Page components
        EditorPage.jsx
        HomePage.jsx
        MemoryDetailPage.jsx
        NewSessionPage.jsx
        SettingsPage.jsx
        TreePage.jsx
        YearMemoriesPage.jsx
      App.jsx
      fakeApi.js           # localStorage-based data layer
      main.jsx
      mediaStore.js        # IndexedDB media storage
      styles.css           # Global styles
    index.html
    package.json
    package-lock.json
    vite.config.mjs
  backend/
    server.mjs             # Express server with Ollama integration (local config)
    package.json
    package-lock.json
    .env.example           # Environment variables template
  README.md
```

---

## Deployed Configuration (Recommended)

The easiest way to try MemoryTree is via the hosted deployment on Vercel - no installation required.

**Live URL**: https://memory-tree-theta.vercel.app/

### How it works

- The frontend is hosted on Vercel
- AI generation is handled by the Vercel serverless function at `frontend/api/generate.js`, which calls the OpenAI API with GPT-5
- All memory data remains stored locally in your browser (localStorage + IndexedDB) — Only the minimal text required for drafting is transmitted for draft generation

### Requirements

- A modern web browser
- No installation, no account, no API key needed on your end

---

## Local Configuration

If you prefer to run MemoryTree entirely on your own machine with a local AI model (no external API calls at all), follow the instructions below.

### How it works

- The frontend runs via Vite dev server
- A local Express backend (`backend/server.mjs`) handles AI generation by calling Ollama running on your machine
- The used model is Qwen 4B

---

## Prerequisites

This is only for local configuration, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Ollama** - Download from [ollama.com](https://ollama.com/)

## Installation

### 1. Open the MemoryTree folder

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

The `.env` file should contain:

```
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_NAME=qwen:4b
```

### 4. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 5. Install the Local AI Model

Open a new terminal and run:

```bash
ollama pull qwen:4b
```

Verify the installation:

```bash
ollama list
```

You should see:

```
NAME      ID          SIZE
qwen:4b   <id>        <size>
```

## Running the Application

### 1. Start Ollama

```bash
ollama run qwen:4b
```

### 2. Start the Backend Server

In a new terminal:

```bash
cd backend
npm run dev
```

You should see:

```
MemoryTree backend listening on http://localhost:3001
Using Ollama at http://localhost:11434 with model qwen:4b
```

### 3. Start the Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Vite will start the development server at:

```
http://localhost:5173
```

Open this URL in your browser to use MemoryTree.

## Usage Guide

### Creating a New Memory

1. Click "Start a new session" on the homepage
2. Fill in who the memory is for
3. Select prompt cards or enter a custom topic
4. Choose tone (warm/light/calm/neutral) and length (short/medium/long)
5. Click "Go to editor" to generate AI Draft or skip AI assistance
6. Edit the story in the editor
7. Add a leaf name and approximate year (optional)
8. Attach images or videos (optional)
9. Confirm both checkboxes and click "Add to MemoryTree"

### Viewing the MemoryTree

- Navigate to "My MemoryTree" to see all memories
- Single-click a leaf to preview in the side panel
- Double-click a leaf to open the full detail view
- Use the fullscreen button for a larger view

### Managing Memories

- **Edit**: Click "Edit leaf details" to modify any memory
- **Export**: Download individual memories as text files, or export all as a ZIP
- **Delete**: Remove memories with confirmation

## Privacy & Data Storage

MemoryTree is designed with privacy as a core principle:

- **Browser Storage**: All memories, sessions, and media are stored locally in your browser (localStorage + IndexedDB)
- **Data Control**: You can export or delete all data at any time from the Settings page
- **Deployed config**: Only the minimal text required for drafting is sent to the OpenAI API
- **Local config**: Fully offline, no data leaves your machine at any point

## License

This project is developed for academic purposes as part of an Individual Dissertation at the University of Nottingham.

You may reuse or modify it for research and educational purposes. Not intended for commercial deployment.

---

**Author**: Yizhen Wang
**Institution**: University of Nottingham, School of Computer Science
**Year**: 2025-2026
