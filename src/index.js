/**
 * Route Optimisation Engine
 * A Node.js utility library for delivery planning optimization.
 * 
 * This library helps assign drivers to delivery orders using a road network graph,
 * providing basic assignments, fastest routes, and ETA estimates.
 */

// Import utilities
const { loadDrivers, loadOrders, loadRoadGraph, deepClone } = require('./data/input');
const { assignDriversToOrders, calculateRouteAndETA, calculateShortestPath } = require('./utils/optimizer');
const { validateInputs, InputValidationError } = require('./utils/validator');

/**
 * Main function to optimize delivery routes.
 * 
 * @param {Object} inputs - Input data containing drivers, orders, and graph
 * @param {Object} [config={}] - Optional config (e.g., { useCache: true } for route caching)
 * @param {boolean} [config.useCache=false] - Enable LRU-like cache for repeated (start,end) shortest paths
 * @returns {Object} - Optimized assignments with routes and ETAs
 */
function optimizeDelivery(inputs, config = {}) {
  const { useCache = false } = config;

  // Ensure immutability: deep clone original inputs to prevent any mutation
  const immutableInputs = deepClone(inputs);

  // Validate inputs (now throws consistently for errors; no return object)
  try {
    validateInputs(immutableInputs);
  } catch (error) {
    if (error instanceof InputValidationError) {
      throw error; // rethrow for consistent handling
    }
    throw new Error(`Validation failed: ${error.message}`);
  }

  const { drivers, orders, graph } = immutableInputs;

  // Load and prepare data (loaders also ensure cloned/immutable outputs)
  const preparedDrivers = loadDrivers(drivers);
  const preparedOrders = loadOrders(orders);
  const roadGraph = loadRoadGraph(graph);

  // Optional shared route cache (key: 'start:end', value: {distance, path})
  const routeCache = useCache ? new Map() : null;

  // Perform basic assignment and route calculation (pass cache if enabled)
  const assignments = assignDriversToOrders(preparedDrivers, preparedOrders, roadGraph, routeCache);
  
  // Calculate routes and ETAs for assignments (pass cache)
  const optimizedAssignments = assignments.map(assignment => {
    const routeInfo = calculateRouteAndETA(assignment.driver, assignment.order, roadGraph, routeCache);
    return {
      ...assignment,
      ...routeInfo
    };
  });

  return {
    assignments: optimizedAssignments,
    summary: {
      totalDrivers: drivers.length,
      totalOrders: orders.length,
      assignedOrders: optimizedAssignments.length,
      averageETA: calculateAverageETA(optimizedAssignments),
      cacheHits: useCache ? (routeCache ? routeCache.size : 0) : 0 // simple metric
    }
  };
}

/**
 * Helper to calculate average ETA
 */
function calculateAverageETA(assignments) {
  if (assignments.length === 0) return 0;
  const totalETA = assignments.reduce((sum, a) => sum + (a.eta || 0), 0);
  return Math.round(totalETA / assignments.length);
}

// Export the main function and utilities
module.exports = {
  optimizeDelivery,
  // Re-export utilities for advanced usage
  assignDriversToOrders,
  calculateRouteAndETA,
  validateInputs,
  InputValidationError,
  loadDrivers,
  loadOrders,
  loadRoadGraph,
  deepClone,
  // For advanced use: full path calc + MinHeap utility
  calculateShortestPath,
  MinHeap: require('./utils/minHeap')
};

// For direct execution (small working demo for phase 1 greedy)
if (require.main === module) {
  console.log('=== Route Optimisation Engine Demo (Phase 1: Greedy Assignment) ===');
  
  // Sample input with new fields
  const sampleInputs = {
    drivers: [
      { id: 'd1', name: 'Alice', currentLocation: 'depot', capacity: 100, shiftEndTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() },
      { id: 'd2', name: 'Bob', currentLocation: 'locB', capacity: 50, shiftEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() }
    ],
    orders: [
      { id: 'o1', destination: 'locA', priority: 1, size: 20, deadlineTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
      { id: 'o2', destination: 'locC', priority: 2, size: 30, deadlineTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }
    ],
    graph: {
      depot: { locA: 10, locB: 25, locC: 40 },
      locA: { depot: 10, locB: 15, locC: 30 },
      locB: { depot: 25, locA: 15, locC: 20 },
      locC: { depot: 40, locA: 30, locB: 20 }
    }
  };

  try {
    // Demo with caching enabled
    const result = optimizeDelivery(sampleInputs, { useCache: true });
    console.log('Assignments (with cache):', JSON.stringify(result.assignments.map(a => ({
      driver: a.driver.id,
      order: a.order.id,
      score: a.assignmentScore.toFixed(2),
      distance: a.distance,
      route: a.route,  // full path now
      eta: a.eta
    })), null, 2));
    console.log('Summary (cache hits):', result.summary);
    console.log('Demo complete! (See tests/ for more cases)');
  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}