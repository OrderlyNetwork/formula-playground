# Formula Playground

> A verification tool for Orderly SDK calculation formulas

[![Deploy to GitHub Pages](https://github.com/orderly/formula-playground/actions/workflows/deploy.yml/badge.svg)](https://github.com/orderly/formula-playground/actions/workflows/deploy.yml)

## 🌟 Overview

Formula Playground provides an interactive environment for testing, debugging, and validating Orderly SDK calculation formulas. It features a spreadsheet-like interface for formula development, real-time execution comparison between different engines, and comprehensive execution history tracking for regression testing.

### ✅ Current Status: Phase 1 MVP Complete

All core features are implemented and production-ready.

## 🚀 Key Features

### Core Functionality

- **📊 Datasheet Mode**: Excel-like spreadsheet interface for formula input/output management
  - Auto-calculation with dependency tracking
  - Type-aware input cells (numbers, strings, arrays, objects)
  - Multi-row batch testing
  - Real-time formula execution with detailed logging
- **🧪 Playground Mode**: Interactive formula testing environment

  - Visual parameter configuration
  - Multiple execution engines (TypeScript, Local NPM packages)
  - Execution history and comparison
  - Canvas snapshots for state restoration

- **🔍 Formula Management**

  - Load formulas from multiple sources:
    - Built-in formula library
    - GitHub repositories (via jsDelivr)
    - Local file uploads
    - jsDelivr CDN URLs
    - Local npm packages (@orderly.network SDKs)
  - JSDoc-based automatic metadata extraction
  - Formula versioning and categorization
  - User-imported formulas stored in IndexedDB

- **⚡ Execution Engines**

  - **TypeScript Engine**: Execute formulas in isolated Web Workers
  - **Local NPM Engine**: Run formulas from installed @orderly.network packages
  - **Future**: Rust WASM engine for performance comparison

- **💾 Persistence & History**

  - IndexedDB-based execution history
  - Canvas snapshots for parameter combinations
  - Run record tracking with full metadata
  - Import/export capabilities

- **🎨 Modern UI/UX**
  - Monaco Editor integration for code viewing/editing
  - Responsive resizable panel layouts
  - Dark/light theme support
  - Real-time syntax highlighting
  - Markdown documentation rendering

## 📦 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Installation

```bash
pnpm install
```

### Development

```bash
# Start development server
pnpm dev

# Open http://localhost:5173
```

### Build

```bash
# Type check and build
pnpm build:check

# Build only
pnpm build

# Preview production build
pnpm preview
```

### Generate Formula Config

```bash
# Generate formula configuration from source code
pnpm generate:formulas
```

## 🛠️ Technology Stack

### Core

- **React 19** - UI framework with React Compiler optimizations
- **TypeScript 5.9** - Type-safe development with strict mode
- **Vite 7** - Next-generation build tool
- **pnpm 10** - Fast, disk space efficient package manager

### State & Data

- **Zustand 5** - Lightweight state management (multi-store architecture)
- **Dexie.js 4** - IndexedDB wrapper for persistent storage
- **React Router 7** - Client-side routing

### UI & Styling

- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Monaco Editor** - Code editor (VSCode engine)
- **@tanstack/react-table** - Headless table library
- **react-resizable-panels** - Resizable panel layouts

### Development Tools

- **ts-morph** - TypeScript AST manipulation for formula parsing
- **ESLint 9** - Code linting
- **babel-plugin-react-compiler** - React 19 compiler for optimizations

### Orderly Network SDKs

- **@orderly.network/perp** - Perpetual contract formulas
- **@orderly.network/net** - Network utilities
- **@orderly.network/utils** - Shared utilities

## 📐 Architecture

### Module-Based Design

The codebase follows a clean module-based architecture with focused, single-responsibility modules:

- **formula-parser**: Extracts metadata from JSDoc annotations and analyzes TypeScript types
- **formula-executor**: Handles formula execution in isolated Web Workers with multiple engine adapters
- **formula-datasheet**: Provides tabular formula testing with auto-calculation and dependency tracking
- **source-loader**: Loads formulas from GitHub, local files, jsDelivr, and npm packages
- **history-manager**: Manages execution history and regression testing
- **sdk-registry**: Registry pattern for SDK adapters

### Execution Pattern

- All formula calculations run in isolated Web Workers to prevent UI blocking
- Typed message protocols for worker communication
- Support for multiple execution engines (TypeScript, Local NPM, future Rust WASM)
- Auto-detection of engine based on formula configuration
- Comprehensive execution metadata (timing, status, engine info)

### Data Models

- **FormulaDefinition**: Complete formula metadata with inputs, outputs, source info
- **RunRecord**: Execution history with inputs, outputs, timing, and comparison data
- **CanvasSnapshot**: Saved states for formula parameters and configurations
- **DataSheetRow**: Spreadsheet row with inputs, outputs, and calculation status

## 🎯 Use Cases

### Formula Development

1. Create formulas with proper JSDoc annotations
2. Test in datasheet mode with multiple input combinations
3. View detailed execution logs and timing information
4. Compare results across different parameter sets

### SDK Validation

1. Load formulas from @orderly.network SDK packages
2. Execute in both TypeScript and Local NPM engines
3. Compare results for consistency verification
4. Track execution history for regression testing

### Formula Library Management

1. Import formulas from GitHub repositories
2. Upload custom formula files
3. Configure jsDelivr CDN sources
4. Organize formulas by categories and tags

## 🔄 Roadmap

### Phase 2: Engine Comparison

- [ ] Rust WASM engine integration
- [ ] Side-by-side TypeScript vs Rust comparison
- [ ] Performance benchmarking and visualization
- [ ] Error analysis and highlighting

### Phase 3: Advanced Features

- [ ] AI-powered formula explanations
- [ ] Visual diff for formula changes
- [ ] Advanced performance reports
- [ ] Formula marketplace
- [ ] Code export functionality
- [ ] Advanced debugging tools

## 📄 License

MIT
