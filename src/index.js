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
 * @param {Object} inputs.drivers - Array of driver objects
 * @param {Object} inputs.orders - Array of order objects
 * @param {Object} inputs.graph - Road network graph
 * @returns {Object} - Optimized assignments with routes and ETAs
 */
function optimizeDelivery(inputs) {
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

  // Perform basic assignment and route calculation
  const assignments = assignDriversToOrders(preparedDrivers, preparedOrders, roadGraph);
  
  // Calculate routes and ETAs for assignments
  const optimizedAssignments = assignments.map(assignment => {
    const routeInfo = calculateRouteAndETA(assignment.driver, assignment.order, roadGraph);
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
      averageETA: calculateAverageETA(optimizedAssignments)
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
      { id: 'd1', name: 'Alice', currentLocation: 'depot', capacity: 100, shiftEndTime: '2024-12-31T18:00:00Z' },
      { id: 'd2', name: 'Bob', currentLocation: 'locB', capacity: 50, shiftEndTime: '2024-12-31T17:00:00Z' }
    ],
    orders: [
      { id: 'o1', destination: 'locA', priority: 1, size: 20, deadlineTime: '2024-12-31T16:00:00Z' },
      { id: 'o2', destination: 'locC', priority: 2, size: 30, deadlineTime: '2024-12-31T15:00:00Z' }
    ],
    graph: {
      depot: { locA: 10, locB: 25, locC: 40 },
      locA: { depot: 10, locB: 15, locC: 30 },
      locB: { depot: 25, locA: 15, locC: 20 },
      locC: { depot: 40, locA: 30, locB: 20 }
    }
  };

  try {
    const result = optimizeDelivery(sampleInputs);
    console.log('Assignments:', JSON.stringify(result.assignments.map(a => ({
      driver: a.driver.id,
      order: a.order.id,
      score: a.assignmentScore.toFixed(2),
      distance: a.distance,
      route: a.route,  // full path now
      eta: a.eta
    })), null, 2));
    console.log('Summary:', result.summary);
    console.log('Demo complete! (See tests/ for more cases)');
  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}