import api from "./apiClient";

// Places API wrapper
const BASE = "/places"; // /api prefix is handled by baseURL

/**
 * Get all places for the current user
 * @returns {Promise<Array>} Array of place objects
 */
const getPlaces = async () => {
  try {
    console.log("Calling GET /places");
    const resp = await api.get(BASE);
    console.log("getPlaces response:", resp.data);
    return resp.data.data || resp.data;
  } catch (err) {
    console.error("getPlaces error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

/**
 * Get a specific place by ID
 * @param {number} id - Place ID
 * @returns {Promise<Object>} Place object
 */
const getPlace = async (id) => {
  if (!id) {
    const error = new Error("Place ID is required");
    console.error("getPlace error: Place ID is required");
    throw error;
  }

  try {
    console.log(`Calling GET /places/${id}`);
    const resp = await api.get(`${BASE}/${id}`);
    console.log(`getPlace(${id}) response:`, resp.data);
    return resp.data;
  } catch (err) {
    console.error(`getPlace(${id}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

/**
 * Create a new place
 * @param {Object} payload - Place data (name, description)
 * @returns {Promise<Object>} Created place object
 */
const createPlace = async (payload) => {
  try {
    console.log("Calling POST /places with payload:", payload);
    const resp = await api.post(BASE, payload);
    console.log("createPlace response:", resp.data);
    return resp.data.data || resp.data;
  } catch (err) {
    console.error("createPlace error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

/**
 * Update a place
 * @param {number} id - Place ID
 * @param {Object} payload - Updated place data
 * @returns {Promise<Object>} Updated place object
 */
const updatePlace = async (id, payload) => {
  if (!id) {
    const error = new Error("Place ID is required");
    console.error("updatePlace error: Place ID is required");
    throw error;
  }

  try {
    console.log(`Calling PUT /places/${id} with payload:`, payload);
    const resp = await api.put(`${BASE}/${id}`, payload);
    console.log(`updatePlace(${id}) response:`, resp.data);
    return resp.data.data || resp.data;
  } catch (err) {
    console.error(`updatePlace(${id}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

/**
 * Delete a place
 * @param {number} id - Place ID
 * @returns {Promise<Object>} Response data
 */
const deletePlace = async (id) => {
  if (!id) {
    const error = new Error("Place ID is required");
    console.error("deletePlace error: Place ID is required");
    throw error;
  }

  try {
    console.log(`Calling DELETE /places/${id}`);
    const resp = await api.delete(`${BASE}/${id}`);
    console.log(`deletePlace(${id}) response:`, resp.data);
    return resp.data;
  } catch (err) {
    console.error(`deletePlace(${id}) error:`, {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

const placeService = {
  getPlaces,
  getPlace,
  createPlace,
  updatePlace,
  deletePlace,
};

export default placeService;
