/**
 * Basic optimization utilities for driver-to-order assignments.
 * Phase 1: Distance-aware greedy algorithm.
 * - For each order, assign nearest available driver (by shortest path in graph).
 * - Respect driver capacity >= order size.
 * - Mark assigned driver unavailable (for subsequent orders).
 * - Assignment score = distance + (10 / priority)  [lower score better: favors close + high-priority].
 * Note: shiftEndTime/deadlineTime included in data but not enforced in phase 1 (future).
 */

/**
 * Helper: Compute shortest path distance between start and end using Dijkstra on graph.
 * Assumes non-negative weights; returns Infinity if unreachable.
 * @param {Object} graph - Adjacency list
 * @param {string} start - Start node
 * @param {string} end - End node
 * @returns {number} - Shortest distance or Infinity
 */
function calculateShortestDistance(graph, start, end) {
  if (start === end) return 0;
  if (!graph[start] || !graph[end]) return Infinity;

  // Dijkstra's algorithm (simple priority queue impl for small graphs)
  const distances = {};
  const visited = new Set();
  Object.keys(graph).forEach(node => { distances[node] = Infinity; });
  distances[start] = 0;

  // Simple loop-based Dijkstra (no heap for brevity)
  for (let i = 0; i < Object.keys(graph).length; i++) {
    // Find unvisited node with smallest distance
    let minDist = Infinity;
    let current = null;
    Object.keys(distances).forEach(node => {
      if (!visited.has(node) && distances[node] < minDist) {
        minDist = distances[node];
        current = node;
      }
    });
    if (current === null || minDist === Infinity) break;
    visited.add(current);

    // Update neighbors
    if (graph[current]) {
      Object.entries(graph[current]).forEach(([neighbor, weight]) => {
        if (!visited.has(neighbor)) {
          const newDist = minDist + weight;
          if (newDist < distances[neighbor]) {
            distances[neighbor] = newDist;
          }
        }
      });
    }
  }
  return distances[end] !== Infinity ? distances[end] : Infinity; // fallback if needed
}

/**
 * Distance-aware greedy assignment (phase 1).
 * @param {Array} drivers - Prepared drivers (mutable for availability marking)
 * @param {Array} orders - Prepared orders
 * @param {Object} graph - Road network graph
 * @returns {Array} - Assignments [{driver, order, assignmentScore, distance}]
 */
function assignDriversToOrders(drivers, orders, graph) {
  // Work on copy to avoid mutating input (immutability)
  const availableDrivers = [...drivers].map(d => ({ ...d })); // shallow clone drivers
  const assignments = [];

  // Process orders in input order (can sort by priority in future)
  for (const order of orders) {
    let bestDriver = null;
    let bestDistance = Infinity;
    let bestIndex = -1;

    // Find nearest available driver that fits capacity
    for (let i = 0; i < availableDrivers.length; i++) {
      const driver = availableDrivers[i];
      if (!driver.availability || driver.capacity < (order.size || 0)) continue;

      const start = driver.currentLocation || 'depot';
      const end = order.destination;
      const distance = calculateShortestDistance(graph, start, end);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestDriver = driver;
        bestIndex = i;
      }
    }

    if (bestDriver && bestDistance !== Infinity) {
      // Assign
      const priority = order.priority || 1;
      // Score: distance + (10 / priority) - lower better (favors short dist + high prio)
      const assignmentScore = bestDistance + (10 / priority);

      assignments.push({
        driver: bestDriver,
        order: order,
        assignmentScore,
        distance: bestDistance
      });

      // Mark unavailable and reduce capacity (for multi-order sim)
      bestDriver.availability = false;
      bestDriver.capacity -= (order.size || 0); // respect capacity
    }
    // Else: no suitable driver for this order (skip for phase 1)
  }

  return assignments;
}

/**
 * Calculate fastest route and ETA using the graph (now uses real shortest path).
 * @param {Object} driver - Driver object
 * @param {Object} order - Order object
 * @param {Object} graph - Road network graph
 * @returns {Object} - { route: Array, distance: number, eta: number }
 */
function calculateRouteAndETA(driver, order, graph) {
  const start = driver.currentLocation || 'depot';
  const end = order.destination;
  
  // Use real shortest distance (reuses phase 1 helper)
  const distance = calculateShortestDistance(graph, start, end);
  const speedKmh = 30; // average speed assumption
  const etaMinutes = distance !== Infinity ? Math.round((distance / speedKmh) * 60) : 0;
  
  // Simple route (start -> end; can expand to full path later)
  const route = distance !== Infinity ? [start, end] : [];
  
  return {
    route,
    distance: distance !== Infinity ? distance : 0,
    eta: etaMinutes,
    estimatedArrival: new Date(Date.now() + etaMinutes * 60 * 1000).toISOString()
  };
}

module.exports = {
  assignDriversToOrders,
  calculateRouteAndETA,
  calculateShortestDistance // export for testing
};