# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Formula Playground** is a sophisticated cryptocurrency trading formula verification tool that validates SDK logic consistency between TypeScript and Rust (WASM) implementations. The application provides React Flow-based visualization of formula dependencies, real-time execution comparison between different engines, and maintains IndexedDB-based execution history for regression testing.

### Current Status: Phase 1 MVP ✅ COMPLETE
All core features are implemented and production-ready. Phase 2 (Rust WASM integration) is planned.

## Technology Stack
- **React 19+** with TypeScript in strict mode
- **Vite** with React Compiler optimizations
- **Tailwind CSS 4** for styling
- **Zustand** for state management (multi-store architecture)
- **React Flow + ELK.js** for visualization
- **IndexedDB** via Dexie.js for persistent storage
- **Web Workers** for isolated formula execution
- **ts-morph** for TypeScript AST analysis
- **Radix UI** components for UI elements

## Architecture

### Module-Based Architecture
The codebase follows a clean module-based architecture with focused modules:

- **formula-parser**: Extracts metadata from JSDoc annotations using ts-morph
- **formula-executor**: Handles formula execution in Web Workers
- **formula-graph**: Manages React Flow visualization and node positioning
- **indexed-db**: Database operations with Dexie.js
- **github-integration**: Remote formula loading from jsDelivr CDN

### State Management
Multiple focused Zustand stores instead of monolithic state:
- `useFormulaStore`: Formula definitions and current selection
- `useInputStore`: Input parameter management
- `useGraphStore`: React Flow node positioning and edges
- `useHistoryStore`: Execution history management
- `useRunStore`: Current run state and metadata

### Execution Pattern
- All formula calculations are isolated in Web Workers
- Worker communication via `postMessage` with `WorkerMessage` protocol
- Results include execution time and value comparisons

### Data Models

#### FormulaDefinition (src/types/FormulaDefinition.ts)
```typescript
type FormulaDefinition = {
  id: string;                // UUID
  name: string;              // Display name
  description?: string;      // Optional description
  functionName: string;      // Actual function name
  inputTypes: Record<string, "number" | "string" | "boolean">;
  outputType: "number" | "string" | "boolean";
  source: "local" | "remote";
  sourceInfo?: {             // Remote source info
    url: string;
    branch: string;
    version: string;
  };
  tags?: string[];           // For categorization
  creationType: "core" | "sdk" | "external"; // Added for tracking formula origins
};
```

#### RunRecord (src/types/RunRecord.ts)
```typescript
type RunRecord = {
  id: string;               // UUID
  formulaId: string;        // References FormulaDefinition
  timestamp: Date;          // Execution timestamp
  inputValues: Record<string, any>;
  result: {
    value: any;
    executionTime: number;
    engine: string;         // Currently "typescript", future "rust"
  };
  metadata: {
    version: string;        // Formula version at time of execution
    environment: string;    // Browser info, etc.
  };
};
```

## Development Workflow

### Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

### Environment
- Node.js 18+
- pnpm package manager (required)
- Strict TypeScript configuration

### Formula Management
- **Local formulas**: Stored in `public/formulas/` directory
- **Remote formulas**: Loaded from GitHub via jsDelivr CDN
- **Pre-defined formulas**: 7 core formulas (funding fee, liquidation price, PnL, margin requirement, etc.)

### Adding New Formulas
1. Create TypeScript file in `public/formulas/`
2. Follow JSDoc annotation pattern for metadata extraction
3. Use proper TypeScript function signatures
4. Add to local formulas list in formula store

## Key Components

### Core Pages
- **PlaygroundPage**: Main application interface
- **DocumentationPage**: Formula documentation browser
- **NotFoundPage**: 404 error page

### Visualization
- **React Flow**: Interactive node-based formula visualization
- **ELK.js**: Automatic graph layout algorithm
- **Custom nodes**: Input/output nodes, formula nodes, result nodes

### UI Components
- Radix UI components (Button, ScrollArea, Select, Tooltip)
- Custom Card, CodeInput components
- Tailwind CSS for styling

## Testing Approach

### Current Testing Strategy
- Manual testing with real formula inputs
- Automated linting via ESLint
- Type checking via strict TypeScript
- No formal unit tests currently implemented

### Regression Testing
- IndexedDB stores all execution results
- Historical comparison for formula changes
- Visual result comparison in history view

## Common Development Tasks

### Adding a New Formula
1. Create `.ts` file in `public/formulas/` with JSDoc annotations
2. Formula parser automatically extracts metadata
3. Add to formula store's local formulas list
4. Test in playground with various inputs

### Modifying Formula Visualization
- Edit React Flow node configuration in `formula-graph` module
- Adjust ELK.js layout options in graph store
- Update custom node components in components directory

### Adding New Execution Engines
- Create new adapter in `formula-executor` module
- Implement worker communication protocol
- Update engine type definitions in types

### Database Schema Changes
- Modify Dexie.js schema in `indexed-db` module
- Handle migration logic in database initialization
- Update related TypeScript interfaces

## Code Quality Standards

### TypeScript
- Strict mode enabled
- Comprehensive type definitions
- JSDoc comments for all public APIs
- Proper error handling with try-catch blocks

### React Patterns
- Functional components with hooks
- Proper dependency arrays in useEffect
- Zustand for state management (no Context API)
- Proper key props for list rendering

### Error Handling
- Graceful error handling in Web Workers
- User-friendly error messages
- Fallback values for missing data
- Proper logging for debugging

## Important Notes

### Performance Considerations
- React Compiler optimizations enabled
- Web Workers prevent UI blocking
- IndexedDB for efficient data persistence
- Lazy loading of formula definitions

### Browser Compatibility
- Modern browsers with Web Worker support
- IndexedDB support required
- React Flow dependencies loaded from CDN

### Future Development
- Phase 2: Rust WASM integration planned
- Phase 3: AI explanations and advanced reporting
- Formula marketplace capabilities
- Advanced debugging tools

### Integration Points
- GitHub integration via jsDelivr CDN
- Formula loading from remote repositories
- Execution history comparison tools
- Multi-language formula definitions
