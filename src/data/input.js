/**
 * Input handling utilities for delivery data.
 * Accepts JSON inputs for drivers, orders, and road graph.
 */

/**
 * Load and prepare drivers from JSON input.
 * @param {Array} drivers - Array of driver objects
 * @returns {Array} - Prepared drivers with defaults
 */
function loadDrivers(drivers) {
  if (!Array.isArray(drivers)) {
    throw new Error('Drivers must be an array');
  }
  
  return drivers.map((driver, index) => ({
    id: driver.id || `driver-${index + 1}`,
    name: driver.name || `Driver ${index + 1}`,
    currentLocation: driver.currentLocation || 'depot',
    capacity: driver.capacity || 100, // e.g., in kg or packages
    availability: driver.availability !== undefined ? driver.availability : true,
    ...driver // allow additional properties
  }));
}

/**
 * Load and prepare orders from JSON input.
 * @param {Array} orders - Array of order objects
 * @returns {Array} - Prepared orders with defaults
 */
function loadOrders(orders) {
  if (!Array.isArray(orders)) {
    throw new Error('Orders must be an array');
  }
  
  return orders.map((order, index) => ({
    id: order.id || `order-${index + 1}`,
    destination: order.destination || `location-${index + 1}`,
    priority: order.priority || 1,
    size: order.size || 10, // e.g., package size
    deadline: order.deadline || null,
    ...order // allow additional properties
  }));
}

/**
 * Load and prepare road network graph from JSON input.
 * Graph can be adjacency list: { node: { neighbor: distance, ... } }
 * @param {Object} graph - Road network graph object
 * @returns {Object} - Validated graph
 */
function loadRoadGraph(graph) {
  if (!graph || typeof graph !== 'object') {
    throw new Error('Graph must be an object');
  }
  
  // Basic validation: ensure it's a graph structure
  const nodes = Object.keys(graph);
  if (nodes.length === 0) {
    throw new Error('Graph must contain nodes');
  }
  
  // Add default depot if not present
  if (!graph.depot) {
    graph.depot = {}; // empty connections
  }
  
  return graph;
}

module.exports = {
  loadDrivers,
  loadOrders,
  loadRoadGraph
};