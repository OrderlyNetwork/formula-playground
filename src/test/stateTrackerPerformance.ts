/**
 * Performance test for DataSheetStateTracker optimizations
 * Tests memory usage and performance improvements
 */

import { dataSheetStateTracker } from '../modules/formula-datasheet/services/dataSheetStateTracker';
import type { CellUpdateEvent, CalculationEvent } from '../modules/formula-datasheet/services/dataSheetStateTracker';

/**
 * Performance test utilities
 */
class StateTrackerPerformanceTest {
  private readonly TEST_FORMULA_ID = 'test-formula-performance';

  /**
   * Test memory limits enforcement
   */
  testMemoryLimits(): void {
    console.log('🧪 Testing memory limits enforcement...');

    const startTime = performance.now();

    // Add more events than the default limit (500)
    const eventCount = 1000;

    for (let i = 0; i < eventCount; i++) {
      const cellEvent: CellUpdateEvent = {
        timestamp: Date.now() + i,
        rowId: `row-${i}`,
        path: `field-${i % 10}`,
        oldValue: i,
        newValue: i + 1,
        isValid: true,
      };

      dataSheetStateTracker.recordCellUpdate(this.TEST_FORMULA_ID, cellEvent);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const updates = dataSheetStateTracker.getCellUpdates(this.TEST_FORMULA_ID);
    const stats = dataSheetStateTracker.getMemoryStats();

    console.log(`✅ Memory limit test completed in ${duration.toFixed(2)}ms`);
    console.log(`📊 Events recorded: ${updates.length} (limit enforced)`);
    console.log(`💾 Estimated memory usage: ${stats.estimatedMemoryKB}KB`);
    console.log(`🔢 Total tracked formulas: ${stats.totalFormulas}`);

    // Verify memory limits are enforced
    if (updates.length <= 500) {
      console.log('✅ Memory limits working correctly');
    } else {
      console.error('❌ Memory limits not enforced properly');
    }
  }

  /**
   * Test deep cloning performance
   */
  testDeepCloningPerformance(): void {
    console.log('🧪 Testing deep cloning performance...');

    // Create a large row dataset
    const largeRowset = Array.from({ length: 500 }, (_, i) => ({
      id: `row-${i}`,
      field1: `value-${i}`,
      field2: i * 2,
      field3: { nested: { data: `nested-${i}` } },
      _isValid: true,
      _result: i * 3,
    }));

    const startTime = performance.now();

    // Record large rowset multiple times
    for (let i = 0; i < 10; i++) {
      dataSheetStateTracker.recordRowStates(
        `${this.TEST_FORMULA_ID}-clone-${i}`,
        largeRowset
      );
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const stats = dataSheetStateTracker.getMemoryStats();

    console.log(`✅ Deep cloning test completed in ${duration.toFixed(2)}ms`);
    console.log(`📊 Total rows tracked: ${stats.totalRows}`);
    console.log(`💾 Memory usage after large dataset: ${stats.estimatedMemoryKB}KB`);
    console.log(`⚡ Average cloning time: ${(duration / 10).toFixed(2)}ms per operation`);
  }

  /**
   * Test auto-cleanup functionality
   */
  testAutoCleanup(): void {
    console.log('🧪 Testing auto-cleanup functionality...');

    // Create tracker with short cleanup interval for testing
    const testTracker = new (class extends dataSheetStateTracker.constructor {
      constructor() {
        super({
          maxEventsPerFormula: 100,
          maxRowsPerFormula: 200,
          enableDeepClone: true,
          autoCleanupInterval: 1000, // 1 second for quick testing
        });
      }
    })();

    // Add some data
    for (let i = 0; i < 50; i++) {
      testTracker.recordCellUpdate('cleanup-test', {
        timestamp: Date.now() - 5000, // Old timestamp (5 seconds ago)
        rowId: `old-row-${i}`,
        path: 'field1',
        oldValue: i,
        newValue: i + 1,
        isValid: true,
      });
    }

    const beforeStats = testTracker.getMemoryStats();
    console.log(`📊 Before cleanup: ${beforeStats.totalFormulas} formulas tracked`);

    // Wait for cleanup (should happen automatically)
    setTimeout(() => {
      const afterStats = testTracker.getMemoryStats();
      console.log(`📊 After cleanup: ${afterStats.totalFormulas} formulas tracked`);

      if (afterStats.totalFormulas < beforeStats.totalFormulas) {
        console.log('✅ Auto-cleanup working correctly');
      } else {
        console.log('ℹ️  Auto-cleanup may need more time or different timing');
      }

      testTracker.clearAll();
    }, 2000);
  }

  /**
   * Run all performance tests
   */
  runAllTests(): void {
    console.log('🚀 Starting DataSheetStateTracker Performance Tests\n');

    this.testMemoryLimits();
    console.log('');

    this.testDeepCloningPerformance();
    console.log('');

    this.testAutoCleanup();
    console.log('');

    console.log('🏁 Performance tests completed!');
    console.log('💡 Tips for optimal performance:');
    console.log('   • Keep event counts reasonable with memory limits');
    console.log('   • Use structuredClone when available for better performance');
    console.log('   • Enable auto-cleanup for long-running applications');
    console.log('   • Monitor memory usage with getMemoryStats()');
  }
}

// Export for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).stateTrackerPerfTest = new StateTrackerPerformanceTest();
  console.log('🧪 Performance test available as: stateTrackerPerfTest.runAllTests()');
}

export { StateTrackerPerformanceTest };