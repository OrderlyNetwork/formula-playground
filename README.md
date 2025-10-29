# Formula Playground - MVP

An interactive formula verification tool for cryptocurrency trading calculations.

## Phase 1 MVP Features

- ✅ TypeScript formula execution
- ✅ React Flow visualization with auto-layout
- ✅ IndexedDB history tracking
- ✅ Input parameter configuration
- ✅ Result display and comparison UI
- ✅ Pre-defined formula library

## Quick Start

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
formula-playground/
├── sdk-mock/               # Mock SDK with sample formulas
│   └── ts/
│       └── formulas.ts     # TypeScript formula implementations
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Basic components (Button, Input, Card, etc.)
│   │   └── formula-ui/     # Formula-specific components
│   ├── constants/          # Constants and mock data
│   │   └── mockFormulas.ts # Pre-parsed formula definitions
│   ├── lib/                # Utility libraries
│   │   ├── utils.ts        # General utilities
│   │   ├── math.ts         # Math utilities
│   │   └── dexie.ts        # IndexedDB setup
│   ├── modules/            # Core business logic
│   │   ├── formula-parser/ # TS source code parser (for future)
│   │   ├── formula-executor/ # Formula execution via Web Worker
│   │   ├── formula-graph/  # React Flow graph generation
│   │   ├── history-manager/ # IndexedDB history management
│   │   └── sdk-registry/   # SDK adapter registry
│   ├── pages/              # Page components
│   │   └── playground/     # Main playground page
│   ├── store/              # Zustand state management
│   │   ├── formulaStore.ts # Formula state
│   │   ├── graphStore.ts   # Graph state
│   │   └── historyStore.ts # History UI state
│   └── types/              # TypeScript type definitions
└── public/
    └── formulaConfig.json  # Configuration file
```

## Available Formulas

1. **Funding Fee Calculation** - Calculate perpetual contract funding fees
2. **Liquidation Price** - Calculate liquidation price for leveraged positions
3. **Profit and Loss** - Calculate PnL for trading positions
4. **Margin Requirement** - Calculate required margin for positions
5. **Percentage Change** - Calculate percentage change between values

## Technology Stack

- **Framework**: React 19 + TypeScript
- **Visualization**: React Flow + ELK.js
- **State Management**: Zustand
- **Storage**: Dexie.js (IndexedDB)
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite
- **Parser**: ts-morph (for future SDK parsing)

## Phase 2 Roadmap (Coming Next)

- Rust WASM engine integration
- Dual-engine comparison (TS vs Rust)
- Error analysis and highlighting
- Web Worker optimization
- SDK source code parsing

## Phase 3 Roadmap (Future)

- AI-powered formula explanations
- Snapshot comparison
- Visual error/performance reports
- Code export functionality
- Formula version management

## Documentation

See `/docs` folder for detailed documentation:

- `PRD.md` - Product Requirements Document
- `TECH.md` - Technical Design Document

## License

MIT
