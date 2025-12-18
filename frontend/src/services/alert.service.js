import api from "./apiClient";

const BASE = "/alerts";

/**
 * Create a new alert rule for a device
 * @param {Object} payload - Alert rule data { device_id, metric_type, condition, threshold, email_to, is_enabled }
 * @returns {Promise<Object>} Created alert rule object
 */
export const createAlert = async (payload) => {
  if (!payload || !payload.device_id || !payload.metric_type) {
    const error = new Error("Device ID and metric type are required");
    console.error("createAlert error: Missing required fields", { provided: payload });
    throw error;
  }

  try {
    console.log("Calling POST /alerts with:", payload);
    const resp = await api.post(BASE, payload);
    console.log("createAlert response:", resp.data);

    if (!resp.data || !resp.data.id) {
      throw new Error("Invalid response from server: missing alert ID");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Failed to create alert rule";
    console.error("createAlert error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Get all alert rules for a specific device
 * @param {number} deviceId - Device ID
 * @returns {Promise<Array>} Array of alert rules
 */
export const getAlertsByDevice = async (deviceId) => {
  if (!deviceId) {
    const error = new Error("Device ID is required");
    console.error("getAlertsByDevice error: Device ID is required");
    throw error;
  }

  try {
    console.log(`Calling GET /alerts/${deviceId}`);
    const resp = await api.get(`${BASE}/${deviceId}`);
    console.log(`getAlertsByDevice(${deviceId}) response:`, resp.data);
    return resp.data || [];
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Failed to fetch alert rules";
    console.error(`getAlertsByDevice(${deviceId}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Update an alert rule
 * @param {number} ruleId - Alert rule ID
 * @param {Object} payload - Update data { metric_type, condition, threshold, email_to, is_enabled }
 * @returns {Promise<Object>} Updated alert rule object
 */
export const updateAlert = async (ruleId, payload) => {
  if (!ruleId) {
    const error = new Error("Alert rule ID is required");
    console.error("updateAlert error: Alert rule ID is required");
    throw error;
  }

  try {
    console.log(`Calling PUT /alerts/${ruleId} with:`, payload);
    const resp = await api.put(`${BASE}/${ruleId}`, payload);
    console.log(`updateAlert(${ruleId}) response:`, resp.data);

    if (!resp.data || !resp.data.id) {
      throw new Error("Invalid response from server: missing alert data");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Failed to update alert rule";
    console.error(`updateAlert(${ruleId}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Delete an alert rule
 * @param {number} ruleId - Alert rule ID
 * @returns {Promise<Object>} Response with message
 */
export const deleteAlert = async (ruleId) => {
  if (!ruleId) {
    const error = new Error("Alert rule ID is required");
    console.error("deleteAlert error: Alert rule ID is required");
    throw error;
  }

  try {
    console.log(`Calling DELETE /alerts/${ruleId}`);
    const resp = await api.delete(`${BASE}/${ruleId}`);
    console.log(`deleteAlert(${ruleId}) response:`, resp.data);

    if (!resp.data || !resp.data.message) {
      throw new Error("Invalid response from server: missing message");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Failed to delete alert rule";
    console.error(`deleteAlert(${ruleId}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

export default {
  createAlert,
  getAlertsByDevice,
  updateAlert,
  deleteAlert,
};
