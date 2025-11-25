# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Formula Playground** is a sophisticated cryptocurrency trading formula verification tool that validates SDK logic consistency between TypeScript and Rust (WASM) implementations. The application provides data sheet-based formula input/output management, real-time execution comparison between different engines, and maintains IndexedDB-based execution history for regression testing.

### Current Status: Phase 1 MVP ✅ COMPLETE

All core features are implemented and production-ready. Phase 2 (Rust WASM integration) is planned.

## Technology Stack

- **React 19+** with TypeScript in strict mode
- **Vite** with React Compiler optimizations
- **Tailwind CSS 4** for styling
- **Zustand** for state management (multi-store architecture)
- **Monaco Editor** for code editing and display
- **React Router** for routing
- **IndexedDB** via Dexie.js for persistent storage
- **Web Workers** for isolated formula execution
- **ts-morph** for TypeScript AST analysis
- **Radix UI** components for UI elements
- **@tanstack/react-table** for data table management
- **react-resizable-panels** for resizable panel layouts

## Architecture Principles

### Module-Based Architecture

The codebase follows a clean module-based architecture with focused, single-responsibility modules. Each module should be self-contained with clear interfaces and minimal dependencies on other modules.

Key modules include:

- **formula-parser**: Extracts metadata from JSDoc annotations and analyzes types
- **formula-executor**: Handles formula execution in isolated Web Workers
- **formula-datasheet**: Provides tabular formula input/output with auto-calculation
- **source-loader**: Loads formulas from external sources (GitHub, local files)
- **history-manager**: Manages execution history and snapshots
- **sdk-registry**: Registry pattern for SDK adapters

### State Management

Use multiple focused Zustand stores instead of monolithic state. Each store should manage a specific domain of application state. Shared functionality should be extracted to base classes or utilities to avoid duplication.

### Execution Pattern

- All formula calculations must be isolated in Web Workers to prevent UI blocking
- Worker communication should use typed message protocols
- Support multiple execution engines (TS, Local NPM, future Rust)
- Engine selection should be auto-detected based on formula configuration
- Results should include execution metadata (time, status, engine info)

### Data Models

The application uses strongly-typed data models for:

- **FormulaDefinition**: Complete formula metadata including inputs, outputs, source information, and execution configuration
- **RunRecord**: Execution history records with inputs, outputs, timing, and comparison data
- **CanvasSnapshot**: Saved states for formula parameters and canvas configuration

All data models should be defined in TypeScript interfaces with comprehensive type information.

## Development Principles

### Code Organization

- Follow module-based architecture with clear separation of concerns
- Use TypeScript strict mode with comprehensive type definitions
- Prefer composition over inheritance
- Extract shared functionality to base classes or utilities

### State Management

- Use Zustand stores for state management (avoid Context API)
- Keep stores focused on specific domains
- Extract shared logic to base stores or utilities
- Maintain proper separation between UI state and business logic

### Error Handling

- Implement graceful error handling in all async operations
- Provide user-friendly error messages
- Use fallback values for missing data
- Log errors appropriately for debugging

### Performance

- Use Web Workers for CPU-intensive operations
- Implement lazy loading for large data sets
- Use debouncing for frequent updates
- Optimize re-renders with proper React patterns

## Formula Management

### Formula Sources

Formulas can be loaded from multiple sources:

- Built-in formulas from configuration files
- User-imported formulas stored in IndexedDB (takes precedence)
- GitHub repositories
- Local file uploads
- jsDelivr CDN URLs
- Local npm packages

### Formula Definition Requirements

Formulas must include proper JSDoc annotations for metadata extraction:

- Core metadata: name, description, version, tags
- Parameter documentation with types, units, defaults
- Return value documentation with types and units
- Optional execution hints for different engines
- Optional source information for external formulas

The parser automatically extracts this metadata from JSDoc annotations.

## Testing Strategy

- Manual testing with real formula inputs
- Automated linting and type checking
- Regression testing via IndexedDB execution history
- Historical comparison for formula changes
- Canvas snapshots for state restoration

## Code Quality Standards

### TypeScript

- Strict mode enabled
- Comprehensive type definitions for all public APIs
- JSDoc comments for documentation
- Proper error handling with try-catch blocks

### React Patterns

- Functional components with hooks
- Proper dependency arrays in useEffect
- Proper key props for list rendering
- Avoid unnecessary re-renders

### Component Design

- Keep components focused and reusable
- Use composition for complex UI
- Extract business logic from UI components
- Follow accessibility best practices

## Important Constraints

### Browser Compatibility

- Requires modern browsers with Web Worker support
- IndexedDB support required
- ES Modules support required
- Monaco Editor requires modern browser with good performance

### Performance Considerations

- React Compiler optimizations enabled
- Web Workers prevent UI blocking
- IndexedDB for efficient data persistence
- Lazy loading of formula definitions

### Future Development

- Phase 2: Rust WASM integration planned
- Phase 3: AI explanations and advanced reporting
- Formula marketplace capabilities
- Advanced debugging tools
