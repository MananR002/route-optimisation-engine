/**
 * Route Optimisation Engine
 * A Node.js utility library for delivery planning optimization.
 * 
 * This library helps assign drivers to delivery orders using a road network graph,
 * providing basic assignments, fastest routes, and ETA estimates.
 */

// Import utilities
const { loadDrivers, loadOrders, loadRoadGraph, deepClone } = require('./data/input');
const { assignDriversToOrders, calculateRouteAndETA } = require('./utils/optimizer');
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
  deepClone
};

// For direct execution
if (require.main === module) {
  console.log('Route Optimisation Engine - Run with sample data or import as module');
  // Example usage can be added here later
}