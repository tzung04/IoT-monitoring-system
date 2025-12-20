import api from "./apiClient";

// Devices API wrapper
const BASE = "/devices"; // /api prefix is handled by baseURL

/**
 * Get all devices for the current user
 * @returns {Promise<Array>} Array of device objects
 */
export const getDevices = async () => {
  try {
    console.log("Calling GET /devices");
    const resp = await api.get(BASE);
    console.log("getDevices response:", resp.data);
    return resp.data;
  } catch (err) {
    console.error("getDevices error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

/**
 * Get a specific device by ID
 * @param {number} id - Device ID
 * @returns {Promise<Object>} Device object
 */
export const getDevice = async (id) => {
  if (!id) {
    const error = new Error("Device ID is required");
    console.error("getDevice error: Device ID is required");
    throw error;
  }

  try {
    console.log(`Calling GET /devices/${id}`);
    const resp = await api.get(`${BASE}/${id}`);
    console.log(`getDevice(${id}) response:`, resp.data);
    return resp.data;
  } catch (err) {
    console.error(`getDevice(${id}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

/**
 * Create a new device
 * @param {Object} device - Device data { name, mac_address, place_id }
 * @returns {Promise<Object>} Created device object
 */
export const createDevice = async (device) => {
  if (!device || !device.name || !device.mac_address) {
    const error = new Error("Name and MAC address are required");
    console.error("createDevice error: Missing required fields", {
      provided: device,
    });
    throw error;
  }

  try {
    console.log("Calling POST /devices with:", device);
    const resp = await api.post(BASE, device);
    console.log("createDevice response:", resp.data);

    if (!resp.data || !resp.data.id) {
      throw new Error("Invalid response from server: missing device ID");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Failed to create device";
    console.error("createDevice error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Update device information
 * @param {number} id - Device ID
 * @param {Object} payload - Update data { name, place_id, is_active, topic }
 * @returns {Promise<Object>} Updated device object
 */
export const updateDevice = async (id, payload) => {
  if (!id) {
    const error = new Error("Device ID is required");
    console.error("updateDevice error: Device ID is required");
    throw error;
  }

  try {
    console.log(`Calling PUT /devices/${id} with:`, payload);
    const resp = await api.put(`${BASE}/${id}`, payload);
    console.log(`updateDevice(${id}) response:`, resp.data);

    if (!resp.data || !resp.data.id) {
      throw new Error("Invalid response from server: missing device data");
    }

    return resp.data;
  } catch (err) {
    console.error(`updateDevice(${id}) - Full error object:`, err);
    console.error(`updateDevice(${id}) - Response:`, err.response);
    console.error(`updateDevice(${id}) - Response data:`, err.response?.data);
    
    const errorMsg =
      err.response?.data?.details ||
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Failed to update device";
    
    console.error(`updateDevice(${id}) - Final error message:`, errorMsg);
    console.error(`updateDevice(${id}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

/**
 * Delete a device
 * @param {number} id - Device ID
 * @returns {Promise<Object>} Response with message
 */
export const deleteDevice = async (id) => {
  if (!id) {
    const error = new Error("Device ID is required");
    console.error("deleteDevice error: Device ID is required");
    throw error;
  }

  try {
    console.log(`Calling DELETE /devices/${id}`);
    const resp = await api.delete(`${BASE}/${id}`);
    console.log(`deleteDevice(${id}) response:`, resp.data);

    if (!resp.data || !resp.data.message) {
      throw new Error("Invalid response from server: missing message");
    }

    return resp.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Failed to delete device";
    console.error(`deleteDevice(${id}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

export default {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
};
