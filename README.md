# Route Optimisation Engine

A Node.js utility library that helps optimize delivery planning. It takes drivers, delivery orders, and a road network graph as input and returns basic driver-to-order assignments along with fastest route and ETA estimates.

## Features
- Accepts JSON input for drivers, orders, and road network graph
- Basic greedy driver-to-order assignment
- Mock route calculation and ETA estimation (ready for advanced algorithms)
- Input validation
- Simple and extensible structure

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

// Sample input JSON
const inputs = {
  drivers: [
    { id: 'd1', name: 'Alice', currentLocation: 'depot', capacity: 100 },
    { id: 'd2', name: 'Bob', currentLocation: 'depot', capacity: 80 }
  ],
  orders: [
    { id: 'o1', destination: 'locA', priority: 1, size: 20 },
    { id: 'o2', destination: 'locB', priority: 2, size: 15 }
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
