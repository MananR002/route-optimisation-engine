/**
 * Input validation utilities for the route optimization library.
 * Uses consistent error throwing for reliability. No silent defaults for critical fields.
 */

/**
 * Custom error for input validation failures.
 */
class InputValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputValidationError';
  }
}

/**
 * Validate the input data for drivers, orders, and graph.
 * Throws InputValidationError on any issue for consistent handling.
 * Critical fields (capacity, destination, graph structure) are strictly required - no defaults.
 * @param {Object} inputs - { drivers, orders, graph }
 */
function validateInputs(inputs) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    throw new InputValidationError('Inputs must be a non-array object');
  }

  const { drivers, orders, graph } = inputs;

  // Validate drivers (require capacity - critical, no defaults; id/name required)
  if (!Array.isArray(drivers) || drivers.length === 0) {
    throw new InputValidationError('Drivers must be a non-empty array');
  }
  drivers.forEach((driver, index) => {
    if (!driver || typeof driver !== 'object' || Array.isArray(driver)) {
      throw new InputValidationError(`Driver at index ${index} must be a non-array object`);
    }
    if (!driver.id && !driver.name) {
      throw new InputValidationError(`Driver at index ${index} must have id or name`);
    }
    // Critical field: capacity required (no silent default to 100)
    if (typeof driver.capacity !== 'number' || driver.capacity <= 0) {
      throw new InputValidationError(`Driver at index ${index} must have positive numeric capacity`);
    }
    // New field: shiftEndTime optional, but if present must be ISO string or timestamp
    if (driver.shiftEndTime !== undefined) {
      const endTime = new Date(driver.shiftEndTime);
      if (isNaN(endTime.getTime())) {
        throw new InputValidationError(`Driver at index ${index} shiftEndTime must be valid date string/timestamp`);
      }
    }
  });

  // Validate orders (destination strictly required - critical, no defaults)
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new InputValidationError('Orders must be a non-empty array');
  }
  orders.forEach((order, index) => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) {
      throw new InputValidationError(`Order at index ${index} must be a non-array object`);
    }
    // id optional but destination or id needed
    if (!order.id && !order.destination) {
      throw new InputValidationError(`Order at index ${index} must have id or destination`);
    }
    // Critical field: destination required (no silent default)
    if (typeof order.destination !== 'string' || !order.destination.trim()) {
      throw new InputValidationError(`Order at index ${index} must have a non-empty string destination`);
    }
    // New field: deadlineTime optional, but if present must be valid date
    if (order.deadlineTime !== undefined) {
      const deadline = new Date(order.deadlineTime);
      if (isNaN(deadline.getTime())) {
        throw new InputValidationError(`Order at index ${index} deadlineTime must be valid date string/timestamp`);
      }
    }
  });

  // Validate graph (strict structure check, no empty)
  if (!graph || typeof graph !== 'object' || Array.isArray(graph) || Object.keys(graph).length === 0) {
    throw new InputValidationError('Graph must be a non-empty object representing road network');
  }
  // Check each node has valid connections (object, non-negative distances)
  Object.entries(graph).forEach(([node, connections]) => {
    if (!connections || typeof connections !== 'object' || Array.isArray(connections)) {
      throw new InputValidationError(`Graph node '${node}' must have a connections object`);
    }
    Object.entries(connections).forEach(([neighbor, distance]) => {
      if (typeof distance !== 'number' || distance < 0) {
        throw new InputValidationError(`Invalid distance from '${node}' to '${neighbor}': must be non-negative number`);
      }
    });
  });

  // Edge case: ensure graph has at least one connection
  const hasConnections = Object.values(graph).some(conns => Object.keys(conns).length > 0);
  if (!hasConnections) {
    throw new InputValidationError('Graph must contain at least one connection between nodes');
  }
}

module.exports = {
  validateInputs,
  InputValidationError
};