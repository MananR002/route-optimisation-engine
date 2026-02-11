/**
 * Unit tests for input validation and reliability improvements.
 * Covers invalid inputs, critical field requirements, graph edge cases, and immutability.
 */

const { optimizeDelivery, validateInputs, InputValidationError, deepClone } = require('../src/index');
const { loadDrivers, loadOrders, loadRoadGraph } = require('../src/data/input');

// Helper to create valid sample inputs
function getValidInputs() {
  return {
    drivers: [
      { id: 'd1', name: 'Alice', currentLocation: 'depot', capacity: 100 }
    ],
    orders: [
      { id: 'o1', destination: 'locA', priority: 1 }
    ],
    graph: {
      depot: { locA: 10 },
      locA: { depot: 10 }
    }
  };
}

describe('Input Validation and Reliability', () => {
  describe('validateInputs', () => {
    test('accepts valid inputs', () => {
      const inputs = getValidInputs();
      expect(() => validateInputs(inputs)).not.toThrow();
    });

    test('throws for missing inputs object', () => {
      expect(() => validateInputs(null)).toThrow(InputValidationError);
      expect(() => validateInputs(undefined)).toThrow(InputValidationError);
      expect(() => validateInputs('string')).toThrow(InputValidationError);
      expect(() => validateInputs([])).toThrow(InputValidationError);
    });

    test('throws for empty or invalid drivers array', () => {
      const inputs = getValidInputs();
      inputs.drivers = [];
      expect(() => validateInputs(inputs)).toThrow(/Drivers must be a non-empty array/);
      
      inputs.drivers = [{ name: 'Bob' }]; // missing capacity (critical)
      expect(() => validateInputs(inputs)).toThrow(/must have positive numeric capacity/);
      
      inputs.drivers = [null];
      expect(() => validateInputs(inputs)).toThrow(/must be a non-array object/);
    });

    test('throws for missing critical fields in drivers (no silent defaults)', () => {
      const inputs = getValidInputs();
      delete inputs.drivers[0].capacity; // critical field
      expect(() => validateInputs(inputs)).toThrow(/must have positive numeric capacity/);
    });

    test('throws for invalid orders (missing destination critical)', () => {
      const inputs = getValidInputs();
      inputs.orders = [{ id: 'o1' }]; // has id but missing destination (critical)
      expect(() => validateInputs(inputs)).toThrow(/must have a non-empty string destination/);
      
      inputs.orders = [{ id: 'o1', destination: '' }]; // empty string destination
      expect(() => validateInputs(inputs)).toThrow(/must have a non-empty string destination/);
      
      // Also test no id and no dest
      inputs.orders = [{}];
      expect(() => validateInputs(inputs)).toThrow(/must have id or destination/);
    });

    test('throws for invalid graph structures and edge cases', () => {
      const inputs = getValidInputs();
      
      // Empty graph
      inputs.graph = {};
      expect(() => validateInputs(inputs)).toThrow(/Graph must be a non-empty object/);
      
      // Non-object graph
      inputs.graph = 'invalid';
      expect(() => validateInputs(inputs)).toThrow(/Graph must be a non-empty object/);
      
      // Node with invalid connections
      inputs.graph = { depot: 'not-object' };
      expect(() => validateInputs(inputs)).toThrow(/must have a connections object/);
      
      // Negative distance
      inputs.graph = { depot: { locA: -5 } };
      expect(() => validateInputs(inputs)).toThrow(/Invalid distance.*must be non-negative number/);
      
      // No connections edge case
      inputs.graph = { depot: {}, locA: {} };
      expect(() => validateInputs(inputs)).toThrow(/Graph must contain at least one connection/);
    });

    test('handles array in object positions', () => {
      const inputs = getValidInputs();
      inputs.drivers = [[]]; // array instead of object
      expect(() => validateInputs(inputs)).toThrow(/must be a non-array object/);
    });
  });

  describe('Immutability', () => {
    test('optimizeDelivery does not mutate original inputs', () => {
      const originalInputs = getValidInputs();
      const originalCopy = deepClone(originalInputs); // for comparison
      
      const result = optimizeDelivery(originalInputs);
      
      // Original unchanged
      expect(originalInputs).toEqual(originalCopy);
      expect(originalInputs.drivers[0].capacity).toBe(100); // not mutated
      
      // Result has processed data
      expect(result.assignments.length).toBeGreaterThan(0);
    });

    test('loaders produce immutable copies', () => {
      const drivers = [{ id: 'd1', capacity: 50 }];
      const loaded = loadDrivers(drivers);
      
      // Modify loaded - original unchanged
      loaded[0].capacity = 999;
      expect(drivers[0].capacity).toBe(50);
      
      // Graph
      const graph = { depot: { locA: 10 } };
      const loadedGraph = loadRoadGraph(graph);
      loadedGraph.depot.locA = 999;
      expect(graph.depot.locA).toBe(10);
    });
  });

  describe('optimizeDelivery integration with errors', () => {
    test('throws InputValidationError for invalid critical fields', () => {
      const inputs = getValidInputs();
      delete inputs.drivers[0].capacity; // critical
      expect(() => optimizeDelivery(inputs)).toThrow(InputValidationError);
    });

    test('throws for missing order destination', () => {
      const inputs = getValidInputs();
      delete inputs.orders[0].destination;
      expect(() => optimizeDelivery(inputs)).toThrow(InputValidationError);
    });

    test('successful run with valid inputs (post-refactor)', () => {
      const inputs = getValidInputs();
      const result = optimizeDelivery(inputs);
      expect(result).toHaveProperty('assignments');
      expect(result.summary.averageETA).toBeGreaterThan(0);
      expect(result.assignments[0]).toHaveProperty('eta');
    });
  });
});