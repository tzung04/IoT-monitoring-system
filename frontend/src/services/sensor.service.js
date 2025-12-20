import api from "./apiClient";

const DATA_BASE = "/data";
const HISTORY_BASE = "/history";

/**
 * Get historical sensor data for a device
 * @param {number} deviceId - Device ID
 * @param {number} hours - Number of hours to retrieve (default: 24)
 * @returns {Promise<Object>} { device, timeRange, dataPoints, data: [...] }
 */
export const getDeviceData = async (deviceId, hours = 24) => {
  if (!deviceId) {
    const error = new Error("Device ID is required");
    console.error("getDeviceData error: Device ID is required");
    throw error;
  }

  try {
    console.log(`Calling GET /data/device/${deviceId}?hours=${hours}`);
    const resp = await api.get(`${DATA_BASE}/device/${deviceId}`, {
      params: { hours },
    });
    console.log(`getDeviceData(${deviceId}, ${hours}h) response:`, resp.data);

    if (!resp.data) {
      throw new Error("Invalid response from server: missing data");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to fetch device data";
    console.error(`getDeviceData(${deviceId}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Get latest sensor data for a device
 * @param {number} deviceId - Device ID
 * @returns {Promise<Object>} { latest_data, device }
 */
export const getLatestData = async (deviceId) => {
  if (!deviceId) {
    const error = new Error("Device ID is required");
    console.error("getLatestData error: Device ID is required");
    throw error;
  }

  try {
    console.log(`Calling GET /data/device/${deviceId}/latest`);
    const resp = await api.get(`${DATA_BASE}/device/${deviceId}/latest`);
    console.log(`getLatestData(${deviceId}) response:`, resp.data);

    if (!resp.data) {
      throw new Error("Invalid response from server: missing data");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to fetch latest data";
    console.error(`getLatestData(${deviceId}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Get full sensor data history for a device
 * @param {number} deviceId - Device ID (optional, if null fetches all devices)
 * @param {string} fromDate - Start date (ISO format, optional)
 * @param {string} toDate - End date (ISO format, optional)
 * @returns {Promise<Array>} Array of sensor data points { timestamp, metric_type, value, device_id }
 */
export const getSensorHistory = async (deviceId = null, fromDate = null, toDate = null) => {
  try {
    const params = {};
    if (deviceId) params.device_id = deviceId;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    console.log(`Calling GET /history/sensor with params:`, params);
    const resp = await api.get(`${HISTORY_BASE}/sensor`, { params });
    console.log("getSensorHistory response:", resp.data);

    if (!resp.data) {
      throw new Error("Invalid response from server: missing data");
    }

    // Ensure it's an array
    return Array.isArray(resp.data) ? resp.data : [];
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to fetch sensor history";
    console.error("getSensorHistory error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Get alert event history
 * @param {number} deviceId - Device ID (optional, if null fetches all devices)
 * @param {string} fromDate - Start date (ISO format, optional)
 * @param {string} toDate - End date (ISO format, optional)
 * @returns {Promise<Array>} Array of alert events { timestamp, alert_rule_id, triggered_at, message }
 */
export const getAlertHistory = async (deviceId = null, fromDate = null, toDate = null) => {
  try {
    const params = {};
    if (deviceId) params.device_id = deviceId;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    console.log(`Calling GET /history/alerts with params:`, params);
    const resp = await api.get(`${HISTORY_BASE}/alerts`, { params });
    console.log("getAlertHistory response:", resp.data);

    if (!resp.data) {
      throw new Error("Invalid response from server: missing data");
    }

    // Ensure it's an array
    return Array.isArray(resp.data) ? resp.data : [];
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to fetch alert history";
    console.error("getAlertHistory error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

export default {
  getDeviceData,
  getLatestData,
  getSensorHistory,
  getAlertHistory,
};
