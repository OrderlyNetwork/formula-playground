# User Code Execution - Testing Guide

## Implementation Summary

The user code execution feature has been successfully implemented. The system now supports compiling and executing user-entered TypeScript code in developer mode using esbuild-wasm.

## What Was Implemented

### 1. Dependencies

- ✅ Added `esbuild-wasm@0.24.2` to package.json
- ✅ Installed via pnpm

### 2. Code Compiler Module

**File:** `src/modules/formula-executor/code-compiler.ts`

Features:

- Lazy initialization of esbuild-wasm (initializes only on first use)
- Memory caching of compiled code to avoid redundant compilation
- Uses CDN WASM URL for reliability across environments
- Detailed error messages with line numbers for compilation failures
- Targets ES2020 with ESM format

### 3. Formula Parser

**File:** `src/modules/formula-parser/index.ts`

Already stores complete source code:

- Line 158: `sourceCode: func.getText()` captures full function declaration
- Includes JSDoc comments and all function code
- Ready for compilation and execution

### 4. TSAdapter Enhancement

**File:** `src/modules/formula-executor/adapters/ts-adapter.ts`

Added three new methods:

1. **executeUserCode()** - Main compilation and execution pipeline

   - Compiles TypeScript to JavaScript using esbuild
   - Extracts function from compiled code
   - Executes with proper argument mapping
   - Handles async functions
   - Applies engine hints for precision

2. **extractFunctionFromCode()** - Function extraction helper

   - Creates safe execution scope
   - Captures exports from compiled code
   - Finds and returns executable function
   - Provides clear error messages

3. **formatCompilationError()** - Error formatting
   - Parses esbuild error format
   - Extracts line numbers and descriptions
   - Returns user-friendly error messages

Updated execution priority:

1. User source code (if `formula.sourceCode` exists and `creationType === "parsed"`)
2. jsDelivr (if enabled)
3. Hardcoded implementations
4. Error if none found

### 5. Web Worker Compatibility

**File:** `src/modules/formula-executor/workers/ts-worker.ts`

No changes needed - automatically supports user code execution through TSAdapter.

## How to Test

### Access Developer Mode

1. Open the application at http://localhost:5174/
2. Navigate to Developer Mode (usually `/dev` route)
3. You should see:
   - Code editor on the right side (Monaco Editor)
   - Parse button to process the code
   - Formula data sheet for testing

### Test Case 1: Simple Addition Function

**Purpose:** Verify basic TypeScript compilation and execution

**Code to test:**

```typescript
/**
 * @formulaId add_numbers
 * @name Add Numbers
 * @description Adds two numbers together
 * @version 1.0.0
 * @param {number} a - First number @default 5
 * @param {number} b - Second number @default 10
 * @returns {number} Sum of the two numbers
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

**Steps:**

1. Paste the code into the code editor
2. Click "Parse" button
3. Wait for success message: "✅ Successfully parsed 1 formula(s)"
4. The formula should appear in the formula list
5. Enter values for `a` and `b` (or use defaults)
6. Click "Execute" or "Calculate" button
7. **Expected Result:** Should show result = 15 (5 + 10)

### Test Case 2: Complex Calculation with TypeScript Features

**Purpose:** Verify TypeScript type annotations work correctly

**Code to test:**

```typescript
/**
 * @formulaId calculate_roi
 * @name Calculate ROI
 * @description Calculate return on investment percentage
 * @version 1.0.0
 * @param {number} initialInvestment - Initial investment amount @default 1000
 * @param {number} finalValue - Final value @default 1500
 * @returns {number} ROI percentage
 */
export function calculateROI(
  initialInvestment: number,
  finalValue: number
): number {
  const profit = finalValue - initialInvestment;
  const roi = (profit / initialInvestment) * 100;
  return Math.round(roi * 100) / 100; // Round to 2 decimal places
}
```

**Steps:**

1. Paste the code and click "Parse"
2. Use default values or enter: initialInvestment=1000, finalValue=1500
3. Click "Execute"
4. **Expected Result:** Should show result = 50 (50% ROI)

### Test Case 3: Multiple Formulas in One File

**Purpose:** Verify parsing and selection of multiple formulas

**Code to test:**

```typescript
/**
 * @formulaId multiply
 * @name Multiply
 * @description Multiply two numbers
 * @version 1.0.0
 * @param {number} x - First number @default 3
 * @param {number} y - Second number @default 4
 * @returns {number} Product
 */
export function multiply(x: number, y: number): number {
  return x * y;
}

/**
 * @formulaId divide
 * @name Divide
 * @description Divide two numbers
 * @version 1.0.0
 * @param {number} x - Numerator @default 12
 * @param {number} y - Denominator @default 3
 * @returns {number} Quotient
 */
export function divide(x: number, y: number): number {
  if (y === 0) {
    throw new Error("Division by zero");
  }
  return x / y;
}
```

**Steps:**

1. Paste the code and click "Parse"
2. Should see: "✅ Successfully parsed 2 formula(s)"
3. Select "multiply" formula and test with x=3, y=4
4. **Expected Result:** result = 12
5. Select "divide" formula and test with x=12, y=3
6. **Expected Result:** result = 4

### Test Case 4: Error Handling - Syntax Error

**Purpose:** Verify compilation error messages are user-friendly

**Code to test:**

```typescript
/**
 * @formulaId broken
 * @name Broken Formula
 * @description This has a syntax error
 * @version 1.0.0
 * @param {number} x - Input @default 1
 * @returns {number} Result
 */
export function broken(x: number): number {
  return x + // Missing operand - syntax error
}
```

**Steps:**

1. Paste the code and click "Parse"
2. **Expected Result:** Should show compilation error with line number
3. Error message should indicate where the syntax error is

### Test Case 5: Error Handling - Runtime Error

**Purpose:** Verify runtime errors are caught and displayed

**Code to test:**

```typescript
/**
 * @formulaId divide_safe
 * @name Safe Division
 * @description Division with error handling test
 * @version 1.0.0
 * @param {number} numerator - Numerator @default 10
 * @param {number} denominator - Denominator @default 0
 * @returns {number} Result
 */
export function divideSafe(numerator: number, denominator: number): number {
  if (denominator === 0) {
    throw new Error("Cannot divide by zero!");
  }
  return numerator / denominator;
}
```

**Steps:**

1. Paste and parse successfully
2. Use denominator = 0
3. Click "Execute"
4. **Expected Result:** Should show error message "Execution error: Cannot divide by zero!"

### Test Case 6: Async Functions (if supported)

**Purpose:** Verify async function handling

**Code to test:**

```typescript
/**
 * @formulaId async_calc
 * @name Async Calculation
 * @description Test async function execution
 * @version 1.0.0
 * @param {number} x - Input value @default 5
 * @returns {number} Squared value
 */
export async function asyncCalc(x: number): Promise<number> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 10));
  return x * x;
}
```

**Steps:**

1. Paste and parse
2. Enter x = 5
3. Click "Execute"
4. **Expected Result:** Should show result = 25 (may take slightly longer due to async delay)

## Expected Behavior

### Successful Execution

- ✅ Parse button shows "Parsing..." during compilation
- ✅ Success message appears after parsing: "✅ Successfully parsed N formula(s)"
- ✅ Formula appears in the formula list/dropdown
- ✅ Input fields are auto-populated with default values
- ✅ Execute button triggers calculation
- ✅ Result appears in the output section
- ✅ Execution time is displayed
- ✅ Results are saved to history

### Error Scenarios

- ❌ **No JSDoc:** Parse fails with message about missing JSDoc
- ❌ **Compilation Error:** Shows error with line number and description
- ❌ **Runtime Error:** Shows "Execution error: [message]"
- ❌ **No Export:** Shows "No function found in compiled code"

## Performance Notes

### First Execution

- May take 1-2 seconds due to esbuild-wasm initialization
- WASM file is loaded from CDN (https://unpkg.com/esbuild-wasm@0.24.2/esbuild.wasm)
- After initialization, compilation is very fast (<100ms for typical functions)

### Subsequent Executions

- Compiled code is cached in memory
- Same formula re-execution is nearly instant
- Different formulas trigger new compilation but benefit from initialized esbuild

### Caching Strategy

- Memory cache: Compiled JS is cached by `${formulaId}:${version}`
- Cache persists during session
- Cleared on page reload

## Troubleshooting

### "Failed to initialize esbuild-wasm"

- **Cause:** Network issue loading WASM file from CDN
- **Solution:** Check internet connection, try again

### "No function found in compiled code"

- **Cause:** Code doesn't export a function
- **Solution:** Ensure function is exported with `export function`

### "Compilation error at line X"

- **Cause:** TypeScript syntax error
- **Solution:** Fix the syntax error at the indicated line

### Results don't update

- **Cause:** May need to re-execute after code changes
- **Solution:** Parse again after editing code

## Architecture Notes

### Execution Flow

1. User enters TypeScript code in Monaco Editor
2. Clicks "Parse" → `parseAndCreate()` in developerStore
3. Formula parser extracts metadata and stores `sourceCode`
4. Formula appears in formula list
5. User clicks "Execute" → `executeFormula()` in developerStore
6. TSAdapter checks `formula.creationType === "parsed"`
7. Calls `executeUserCode()` which:
   - Compiles TS → JS using esbuild-wasm
   - Extracts function from compiled code
   - Executes with user inputs
   - Returns results
8. Results displayed in UI and saved to history

### Security Considerations

- Code executes in Web Worker (isolated from main thread)
- Compiled code runs in restricted scope (safe globals only)
- No access to DOM, localStorage, network, etc.
- Function constructor used (safer than eval)

### Browser Compatibility

- Requires WebAssembly support (all modern browsers)
- Requires Web Workers support
- Works in Chrome, Firefox, Safari, Edge (recent versions)

## Next Steps

After testing, consider:

1. Add UI loading indicator during esbuild initialization
2. Implement compilation cache persistence (IndexedDB)
3. Add syntax highlighting for compilation errors in Monaco
4. Support for importing external types (advanced feature)
5. Add compilation options UI (target, optimization level)

## Verification Checklist

- [ ] Can paste TypeScript code into editor
- [ ] Parse button compiles code successfully
- [ ] Success message appears after parsing
- [ ] Formula appears in list
- [ ] Can select formula and see inputs
- [ ] Default values are populated
- [ ] Execute button runs the code
- [ ] Results appear correctly
- [ ] Compilation errors show line numbers
- [ ] Runtime errors are caught and displayed
- [ ] Multiple formulas can be parsed
- [ ] Async functions work (if supported)
- [ ] Performance is acceptable (< 2s for first run)
- [ ] TypeScript types are preserved
- [ ] Complex calculations work correctly
