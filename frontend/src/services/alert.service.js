import api from "./apiClient";

const BASE = "/alert";

/**
 * Get all alert rules by fetching rules for each device
 * Since backend only has GET /:deviceId, we need to fetch for all devices
 * @param {Array} devices - Array of device objects
 * @returns {Promise<Array>} Array of all alert rules
 */
export const getRules = async (devices = []) => {
  try {
    if (!devices || devices.length === 0) {
      console.log("No devices provided, returning empty rules");
      return [];
    }

    console.log(`Fetching rules for ${devices.length} devices`);
    
    // Fetch rules for each device in parallel
    const promises = devices.map(device => 
      api.get(`${BASE}/${device.id}`)
        .then(resp => resp.data || [])
        .catch(err => {
          // 404 is expected when device has no rules - not an error
          if (err.response?.status === 404) {
            console.log(`Device ${device.id} has no rules (404)`);
            return [];
          }
          // Log other errors but don't fail the whole operation
          console.warn(`Error fetching rules for device ${device.id}:`, err.message);
          return [];
        })
    );
    
    const results = await Promise.all(promises);
    
    // Flatten the array of arrays into a single array
    const allRules = results.flat();
    
    console.log(`Fetched ${allRules.length} total rules from ${devices.length} devices`);
    return allRules;
  } catch (err) {
    console.error("getRules error:", err);
    return [];
  }
};

/**
 * Get alert rules for a specific device
 * @param {number} deviceId - Device ID
 * @returns {Promise<Array>} Array of alert rules
 */
export const getRulesByDevice = async (deviceId) => {
  if (!deviceId) {
    throw new Error("Device ID is required");
  }

  try {
    console.log(`Calling GET /alerts/${deviceId}`);
    const resp = await api.get(`${BASE}/${deviceId}`);
    console.log(`getRulesByDevice(${deviceId}) response:`, resp.data);
    return resp.data || [];
  } catch (err) {
    // 404 is expected when device has no rules
    if (err.response?.status === 404) {
      console.log(`Device ${deviceId} has no rules (404)`);
      return [];
    }
    console.error(`getRulesByDevice(${deviceId}) error:`, err);
    throw new Error(err.response?.data?.message || "Failed to fetch alert rules");
  }
};

/**
 * Create a new alert rule
 * @param {Object} payload - { name, deviceId, type, condition, threshold, severity }
 * @returns {Promise<Object>} Created alert rule
 */
export const createRule = async (payload) => {
  try {
    console.log("Calling POST /alerts with:", payload);
    const resp = await api.post(BASE, payload);
    console.log("createRule response:", resp.data);
    return resp.data;
  } catch (err) {
    console.error("createRule error:", err);
    throw new Error(err.response?.data?.message || "Failed to create alert rule");
  }
};

/**
 * Update an alert rule
 * @param {number} ruleId - Rule ID
 * @param {Object} payload - Update data
 * @returns {Promise<Object>} Updated alert rule
 */
export const updateRule = async (ruleId, payload) => {
  if (!ruleId) {
    throw new Error("Rule ID is required");
  }

  try {
    console.log(`Calling PUT /alerts/${ruleId} with:`, payload);
    const resp = await api.put(`${BASE}/${ruleId}`, payload);
    console.log(`updateRule(${ruleId}) response:`, resp.data);
    return resp.data;
  } catch (err) {
    console.error(`updateRule(${ruleId}) error:`, err);
    throw new Error(err.response?.data?.message || "Failed to update alert rule");
  }
};

/**
 * Delete an alert rule
 * @param {number} ruleId - Rule ID
 * @returns {Promise<Object>} Response with message
 */
export const deleteRule = async (ruleId) => {
  if (!ruleId) {
    throw new Error("Rule ID is required");
  }

  try {
    console.log(`Calling DELETE /alerts/${ruleId}`);
    const resp = await api.delete(`${BASE}/${ruleId}`);
    console.log(`deleteRule(${ruleId}) response:`, resp.data);
    return resp.data;
  } catch (err) {
    console.error(`deleteRule(${ruleId}) error:`, err);
    throw new Error(err.response?.data?.message || "Failed to delete alert rule");
  }
};

export default {
  getRules,
  getRulesByDevice,
  createRule,
  updateRule,
  deleteRule,
};