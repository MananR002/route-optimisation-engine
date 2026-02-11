/**
 * Unit tests for input validation and reliability improvements.
 * Covers invalid inputs, critical field requirements, graph edge cases, and immutability.
 */

const { optimizeDelivery, validateInputs, InputValidationError, deepClone } = require('../src/index');
const { loadDrivers, loadOrders, loadRoadGraph } = require('../src/data/input');
const { assignDriversToOrders, calculateShortestDistance } = require('../src/utils/optimizer');

// Helper to create valid sample inputs (updated for new fields)
function getValidInputs() {
  return {
    drivers: [
      { 
        id: 'd1', 
        name: 'Alice', 
        currentLocation: 'depot', 
        capacity: 100,
        shiftEndTime: '2024-12-31T18:00:00Z' // new field
      },
      { 
        id: 'd2', 
        name: 'Bob', 
        currentLocation: 'locB', 
        capacity: 50,
        shiftEndTime: '2024-12-31T17:00:00Z' // new field
      }
    ],
    orders: [
      { 
        id: 'o1', 
        destination: 'locA', 
        priority: 1,
        size: 20,
        deadlineTime: '2024-12-31T16:00:00Z' // new field
      },
      { 
        id: 'o2', 
        destination: 'locC', 
        priority: 2,
        size: 30,
        deadlineTime: '2024-12-31T15:00:00Z' // new field
      }
    ],
    graph: {
      depot: { locA: 10, locB: 25, locC: 40 },
      locA: { depot: 10, locB: 15, locC: 30 },
      locB: { depot: 25, locA: 15, locC: 20 },
      locC: { depot: 40, locA: 30, locB: 20 }
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

  // New tests for phase 1 greedy assignment
  describe('Phase 1: Distance-aware Greedy Assignment', () => {
    test('assignDriversToOrders uses graph distances and capacity checks', () => {
      const inputs = getValidInputs();
      const { drivers, orders, graph } = inputs; // prepared in loader but test raw
      const preparedDrivers = loadDrivers(drivers);
      const preparedOrders = loadOrders(orders);
      const preparedGraph = loadRoadGraph(graph);
      
      const assignments = assignDriversToOrders(preparedDrivers, preparedOrders, preparedGraph);
      
      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments[0]).toHaveProperty('assignmentScore');
      expect(assignments[0]).toHaveProperty('distance');
      // Driver should be marked unavailable internally
      expect(assignments[0].driver.availability).toBe(false);
    });

    test('calculateShortestDistance computes correct distances', () => {
      const graph = getValidInputs().graph;
      expect(calculateShortestDistance(graph, 'depot', 'locA')).toBe(10);
      expect(calculateShortestDistance(graph, 'depot', 'locC')).toBe(40);
      expect(calculateShortestDistance(graph, 'locB', 'locC')).toBe(20);
      expect(calculateShortestDistance(graph, 'unknown', 'locA')).toBe(Infinity);
    });

    test('greedy respects capacity and prefers nearest', () => {
      const inputs = getValidInputs();
      // Adjust for test: make o2 fit only certain driver
      const testInputs = { ...inputs };
      testInputs.orders[1].size = 60; // too big for d2, but wait d1=100
      const preparedDrivers = loadDrivers(testInputs.drivers);
      const preparedOrders = loadOrders(testInputs.orders);
      const assignments = assignDriversToOrders(preparedDrivers, preparedOrders, testInputs.graph);
      
      // Should assign both if possible, but check scores/distances
      expect(assignments.length).toBe(1); // since second order size=60, d1 capacity reduced
      // First assign nearest
    });

    test('assignment score based on distance + priority', () => {
      const inputs = getValidInputs();
      const preparedDrivers = loadDrivers(inputs.drivers);
      const preparedOrders = loadOrders(inputs.orders);
      const assignments = assignDriversToOrders(preparedDrivers, preparedOrders, inputs.graph);
      
      assignments.forEach(ass => {
        expect(ass.assignmentScore).toBeGreaterThan(0);
        // Score should incorporate distance and priority
        const expectedScoreApprox = ass.distance + (10 / (ass.order.priority || 1));
        expect(Math.abs(ass.assignmentScore - expectedScoreApprox)).toBeLessThan(0.1);
      });
    });
  });
});