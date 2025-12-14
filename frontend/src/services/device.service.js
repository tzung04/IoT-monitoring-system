import api from "./apiClient";

// Devices API wrapper
const BASE = "/devices"; // /api prefix is handled by baseURL

export const getDevices = async () => {
  try {
    const resp = await api.get(BASE);
    return resp.data;
  } catch (err) {
    console.error("getDevices error", err);
    return [];
  }
};

export const getDevice = async (id) => {
  if (!id) return null;
  try {
    const resp = await api.get(`${BASE}/${id}`);
    return resp.data;
  } catch (err) {
    console.error("getDevice error", err);
    return null;
  }
};

export const createDevice = async (device) => {
  try {
    const resp = await api.post(BASE, device);
    return resp.data;
  } catch (err) {
    console.error("createDevice error", err);
    throw err;
  }
};

export const updateDevice = async (id, payload) => {
  try {
    const resp = await api.patch(`${BASE}/${id}`, payload);
    return resp.data;
  } catch (err) {
    console.error("updateDevice error", err);
    throw err;
  }
};

export const deleteDevice = async (id) => {
  try {
    const resp = await api.delete(`${BASE}/${id}`);
    return resp.data;
  } catch (err) {
    console.error("deleteDevice error", err);
    throw err;
  }
};

export default {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
};
