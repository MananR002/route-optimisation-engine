/**
 * Basic optimization utilities for driver-to-order assignments.
 * For now, implements simple greedy matching. Advanced algorithms to be added later.
 */

/**
 * Simple greedy assignment of drivers to orders based on proximity (mocked).
 * @param {Array} drivers - Prepared drivers
 * @param {Array} orders - Prepared orders
 * @param {Object} graph - Road network graph
 * @returns {Array} - Assignments {driver, order}
 */
function assignDriversToOrders(drivers, orders, graph) {
  // Simple assignment: match available drivers to orders in order
  // In future, use graph distances for better matching
  const availableDrivers = drivers.filter(d => d.availability);
  const assignments = [];
  
  // Limit assignments to min of drivers and orders
  const numAssignments = Math.min(availableDrivers.length, orders.length);
  
  for (let i = 0; i < numAssignments; i++) {
    assignments.push({
      driver: availableDrivers[i],
      order: orders[i],
      assignmentScore: 1.0 // placeholder, can be distance-based later
    });
  }
  
  return assignments;
}

/**
 * Calculate fastest route and ETA using the graph (mock implementation for now).
 * In future steps, implement Dijkstra or A* for real shortest path.
 * @param {Object} driver - Driver object
 * @param {Object} order - Order object
 * @param {Object} graph - Road network graph
 * @returns {Object} - { route: Array, distance: number, eta: number }
 */
function calculateRouteAndETA(driver, order, graph) {
  const start = driver.currentLocation || 'depot';
  const end = order.destination;
  
  // Mock route calculation - in real impl, use graph to find path
  // For now, simple mock based on string hash or fixed values
  const mockDistance = calculateMockDistance(start, end, graph);
  const mockSpeed = 30; // km/h average
  const etaMinutes = Math.round((mockDistance / mockSpeed) * 60);
  
  // Mock route: just start to end for simplicity
  const route = [start, end];
  
  return {
    route,
    distance: mockDistance,
    eta: etaMinutes,
    estimatedArrival: new Date(Date.now() + etaMinutes * 60 * 1000).toISOString()
  };
}

/**
 * Mock distance calculator using graph or fallback.
 */
function calculateMockDistance(start, end, graph) {
  // Try to use graph if connections exist
  if (graph[start] && graph[start][end] !== undefined) {
    return graph[start][end];
  }
  if (graph[end] && graph[end][start] !== undefined) {
    return graph[end][start];
  }
  
  // Fallback: simple hash-based mock distance
  const hash = (str) => str.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.max(5, (hash(start) + hash(end)) % 50 + 10); // 10-60 km mock
}

module.exports = {
  assignDriversToOrders,
  calculateRouteAndETA
};