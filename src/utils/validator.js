/**
 * Input validation utilities for the route optimization library.
 */

/**
 * Validate the input data for drivers, orders, and graph.
 * @param {Object} inputs - { drivers, orders, graph }
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateInputs(inputs) {
  const errors = [];
  
  if (!inputs || typeof inputs !== 'object') {
    errors.push('Inputs must be an object');
    return { valid: false, errors };
  }
  
  const { drivers, orders, graph } = inputs;
  
  // Validate drivers
  if (!Array.isArray(drivers) || drivers.length === 0) {
    errors.push('Drivers must be a non-empty array');
  } else {
    drivers.forEach((driver, index) => {
      if (!driver || typeof driver !== 'object') {
        errors.push(`Driver at index ${index} must be an object`);
      } else if (!driver.id && !driver.name) {
        // Allow but warn
      }
    });
  }
  
  // Validate orders
  if (!Array.isArray(orders) || orders.length === 0) {
    errors.push('Orders must be a non-empty array');
  } else {
    orders.forEach((order, index) => {
      if (!order || typeof order !== 'object') {
        errors.push(`Order at index ${index} must be an object`);
      } else if (!order.destination) {
        errors.push(`Order at index ${index} must have a destination`);
      }
    });
  }
  
  // Validate graph
  if (!graph || typeof graph !== 'object' || Object.keys(graph).length === 0) {
    errors.push('Graph must be a non-empty object representing road network');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateInputs
};