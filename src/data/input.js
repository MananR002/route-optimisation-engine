/**
 * Input handling utilities for delivery data.
 * Accepts JSON inputs for drivers, orders, and road graph.
 * Ensures immutability by deep-copying inputs; no silent defaults for critical fields.
 */

/**
 * Deep clone for immutability (prevents original input mutation).
 * Uses JSON method for simplicity (assumes plain JSON-serializable data).
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Load and prepare drivers from JSON input.
 * Critical: capacity required (enforced in validator); no defaults there.
 * @param {Array} drivers - Array of driver objects (will be cloned)
 * @returns {Array} - Prepared drivers (immutable copy)
 */
function loadDrivers(drivers) {
  if (!Array.isArray(drivers)) {
    throw new Error('Drivers must be an array');
  }
  
  // Deep clone to ensure immutability
  const clonedDrivers = deepClone(drivers);
  
  return clonedDrivers.map((driver, index) => ({
    id: driver.id || `driver-${index + 1}`,
    name: driver.name || `Driver ${index + 1}`,
    currentLocation: driver.currentLocation || 'depot',
    // capacity: NO default - strictly required and validated upstream
    availability: driver.availability !== undefined ? driver.availability : true,
    ...driver // spread after to preserve original values
  }));
}

/**
 * Load and prepare orders from JSON input.
 * Critical: destination required (enforced in validator); no defaults there.
 * @param {Array} orders - Array of order objects (will be cloned)
 * @returns {Array} - Prepared orders (immutable copy)
 */
function loadOrders(orders) {
  if (!Array.isArray(orders)) {
    throw new Error('Orders must be an array');
  }
  
  // Deep clone to ensure immutability
  const clonedOrders = deepClone(orders);
  
  return clonedOrders.map((order, index) => ({
    id: order.id || `order-${index + 1}`,
    // destination: NO default - strictly required and validated upstream
    priority: order.priority || 1,
    size: order.size || 10, // e.g., package size (non-critical)
    deadline: order.deadline || null,
    ...order // spread after to preserve original values
  }));
}

/**
 * Load and prepare road network graph from JSON input.
 * Graph can be adjacency list: { node: { neighbor: distance, ... } }
 * No mutation; deep clone for immutability. Structure validated upstream.
 * @param {Object} graph - Road network graph object (will be cloned)
 * @returns {Object} - Validated immutable graph copy
 */
function loadRoadGraph(graph) {
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
    throw new Error('Graph must be a non-array object');
  }
  
  // Deep clone to ensure immutability (prevents modifying original)
  const clonedGraph = deepClone(graph);
  
  // Ensure depot exists if missing (non-critical convenience, but no mutation of original)
  if (!clonedGraph.depot) {
    clonedGraph.depot = {};
  }
  
  return clonedGraph;
}

module.exports = {
  loadDrivers,
  loadOrders,
  loadRoadGraph,
  deepClone // export for testing/reuse
};