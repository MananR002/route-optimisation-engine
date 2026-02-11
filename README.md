# Route Optimisation Engine

A Node.js utility library that helps optimize delivery planning. It takes drivers, delivery orders, and a road network graph as input and returns basic driver-to-order assignments along with fastest route and ETA estimates.

## Features
- Accepts JSON input for drivers (incl. shiftEndTime), orders (incl. deadlineTime), and road network graph
- Phase 1: Distance-aware greedy assignment (nearest driver by shortest path, capacity-aware, score based on dist+prio)
- Real shortest-path distance/ETA calc (Dijkstra-based)
- Strict input validation + immutability
- Unit tests + working demo

## Installation
```bash
npm install route-optimisation-engine
```
Or clone and use locally:
```bash
git clone <repo>
cd route-optimisation-engine
npm install
```

## Quick Start

### Basic Usage
```javascript
const { optimizeDelivery } = require('route-optimisation-engine');

// Sample input JSON (includes new fields: shiftEndTime, deadlineTime)
const inputs = {
  drivers: [
    { id: 'd1', name: 'Alice', currentLocation: 'depot', capacity: 100, shiftEndTime: '2024-12-31T18:00:00Z' },
    { id: 'd2', name: 'Bob', currentLocation: 'depot', capacity: 80, shiftEndTime: '2024-12-31T17:00:00Z' }
  ],
  orders: [
    { id: 'o1', destination: 'locA', priority: 1, size: 20, deadlineTime: '2024-12-31T16:00:00Z' },
    { id: 'o2', destination: 'locB', priority: 2, size: 15, deadlineTime: '2024-12-31T15:00:00Z' }
  ],
  graph: {
    depot: { locA: 10, locB: 25 },
    locA: { depot: 10, locB: 15 },
    locB: { depot: 25, locA: 15 }
  }
};

try {
  const result = optimizeDelivery(inputs);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Optimization failed:', error.message);
}
```

### Expected Output Structure
```json
{
  "assignments": [
    {
      "driver": { ... },
      "order": { ... },
      "assignmentScore": 1.0,
      "route": ["depot", "locA"],
      "distance": 10,
      "eta": 20,
      "estimatedArrival": "..."
    }
  ],
  "summary": {
    "totalDrivers": 2,
    "totalOrders": 2,
    "assignedOrders": 2,
    "averageETA": 20
  }
}
```

## File Structure
- `src/index.js` - Main entry point and optimizeDelivery function
- `src/data/input.js` - Input loading and preparation (with deep cloning for immutability)
- `src/utils/validator.js` - Strict input validation (throws consistent `InputValidationError`)
- `src/utils/optimizer.js` - Basic assignment and route calculation
- `tests/input-validation.test.js` - Unit tests for reliability and edge cases

## Input Reliability Improvements
- **Consistent error handling**: All validation now throws `InputValidationError` immediately (no error collection).
- **No silent defaults for critical fields**: Driver `capacity` and order `destination` are strictly required (errors if missing/invalid). Graph structure rigorously validated.
- **Immutability**: Inputs and outputs are deep-cloned to prevent mutation of original data.
- **Graph validation**: Enforces connections, non-negative distances, and basic connectivity.

## Next Steps
- Implement advanced routing algorithms (Dijkstra, etc.)
- Add real-time optimization
- Support for constraints like time windows, capacities
- Visualization tools
- Expand test coverage and benchmarks

## Development
```bash
# Install deps (incl. Jest for tests)
npm install

# Run tests (covers invalid inputs, graph edges, immutability)
npm test

# Run example
node src/index.js

# (Future) Build
npm run build
```

For algorithm details, see upcoming updates.
