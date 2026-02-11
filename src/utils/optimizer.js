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
 * Helper: Compute shortest path (distance + full route path) using Dijkstra on graph.
 * Supports optional routeCache (Map) for hits on repeated (start,end) pairs.
 * Uses MinHeap PQ for O((V + E) log V) performance.
 * Assumes non-negative weights; handles unreachable explicitly.
 * Path reconstruction via predecessor tracking.
 * @param {Object} graph - Adjacency list
 * @param {string} start - Start node
 * @param {string} end - End node
 * @param {Map|null} [routeCache=null] - Optional cache: key='start:end', value={distance, path}
 * @returns {Object} - { distance: number, path: string[] } (distance=Infinity, path=[] if unreachable)
 */
function calculateShortestPath(graph, start, end, routeCache = null) {
  // Cache hit? (key format: 'start:end')
  if (routeCache) {
    const cacheKey = `${start}:${end}`;
    const cached = routeCache.get(cacheKey);
    if (cached) {
      return cached; // Reuse {distance, path}
    }
  }

  if (start === end) {
    const result = { distance: 0, path: [start] };
    if (routeCache) routeCache.set(`${start}:${end}`, result);
    return result;
  }
  if (!graph[start] || !graph[end]) {
    const result = { distance: Infinity, path: [] };
    if (routeCache) routeCache.set(`${start}:${end}`, result);
    return result;
  }

  const MinHeap = require('./minHeap'); // Lazy import for clean structure
  const heap = new MinHeap();

  // Dijkstra with prev tracking + MinHeap PQ
  const distances = {};
  const previous = {};
  const visited = new Set();
  Object.keys(graph).forEach(node => { 
    distances[node] = Infinity; 
    previous[node] = null;
  });
  distances[start] = 0;
  heap.insert(start, 0); // Start with priority=dist

  while (!heap.isEmpty()) {
    const minItem = heap.extractMin();
    const current = minItem.node;
    const currentDist = minItem.priority;
    
    // Skip outdated entries (from re-inserts/decreaseKey)
    if (visited.has(current) || currentDist > distances[current]) continue;
    visited.add(current);

    // Update neighbors via edges
    if (graph[current]) {
      Object.entries(graph[current]).forEach(([neighbor, weight]) => {
        if (visited.has(neighbor)) return;
        const newDist = currentDist + weight;
        if (newDist < distances[neighbor]) {
          distances[neighbor] = newDist;
          previous[neighbor] = current;
          heap.decreaseKey(neighbor, newDist); // Re-insert or update
        }
      });
    }
  }

  // Reconstruct path if reachable
  let distance = distances[end];
  let path = [];
  if (distance !== Infinity) {
    let current = end;
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
    // Validate path starts at 'start'
    if (path[0] !== start) {
      const result = { distance: Infinity, path: [] };
      if (routeCache) routeCache.set(`${start}:${end}`, result);
      return result;
    }
  } else {
    distance = Infinity;
    path = [];
  }
  const result = { distance, path };
  if (routeCache) routeCache.set(`${start}:${end}`, result); // Cache for future hits
  return result;
}

// Backward compat wrapper (returns just distance for existing calls; no cache)
function calculateShortestDistance(graph, start, end) {
  const result = calculateShortestPath(graph, start, end);
  return result.distance;
}

/**
 * Distance-aware greedy assignment (phase 1).
 * @param {Array} drivers - Prepared drivers (mutable for availability marking)
 * @param {Array} orders - Prepared orders
 * @param {Object} graph - Road network graph
 * @param {Map|null} [routeCache=null] - Optional shared cache for paths
 * @returns {Array} - Assignments [{driver, order, assignmentScore, distance}]
 */
function assignDriversToOrders(drivers, orders, graph, routeCache = null) {
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
      const pathResult = calculateShortestPath(graph, start, end, routeCache);
      const distance = pathResult.distance;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestDriver = driver;
        bestIndex = i;
        // Store full path for this best candidate (for assignment)
        bestDriver._tempPath = pathResult.path; // temp for selection
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
        distance: bestDistance,
        route: bestDriver._tempPath || [bestDriver.currentLocation || 'depot', order.destination] // full path
      });

      // Mark unavailable and reduce capacity (for multi-order sim)
      bestDriver.availability = false;
      bestDriver.capacity -= (order.size || 0); // respect capacity
      delete bestDriver._tempPath; // cleanup
    }
    // Else: no suitable driver (skip; unreachable handled by Infinity)
  }

  return assignments;
}

/**
 * Calculate fastest route and ETA using the graph (now uses full shortest path + reconstruction).
 * Supports optional routeCache.
 * Explicitly handles unreachable routes (distance=0, route=[], isUnreachable flag).
 * @param {Object} driver - Driver object
 * @param {Object} order - Order object
 * @param {Object} graph - Road network graph
 * @param {Map|null} [routeCache=null] - Optional shared cache
 * @returns {Object} - { route: Array, distance: number, eta: number, isUnreachable?: boolean }
 */
function calculateRouteAndETA(driver, order, graph, routeCache = null) {
  const start = driver.currentLocation || 'depot';
  const end = order.destination;
  
  // Use full path result (reuses enhanced Dijkstra; cache if provided)
  const pathResult = calculateShortestPath(graph, start, end, routeCache);
  const distance = pathResult.distance;
  const speedKmh = 30; // average speed assumption
  const etaMinutes = distance !== Infinity ? Math.round((distance / speedKmh) * 60) : 0;
  
  // Full reconstructed route path from Dijkstra
  const route = pathResult.path.length > 0 ? pathResult.path : [];
  const isUnreachable = distance === Infinity;
  
  if (isUnreachable) {
    console.warn(`Warning: No route from ${start} to ${end} (unreachable in graph)`);
  }
  
  return {
    route,
    distance: distance !== Infinity ? distance : 0,
    eta: etaMinutes,
    isUnreachable,
    estimatedArrival: new Date(Date.now() + etaMinutes * 60 * 1000).toISOString()
  };
}

module.exports = {
  assignDriversToOrders,
  calculateRouteAndETA,
  calculateShortestDistance, // export for testing (compat)
  calculateShortestPath // full path version
};