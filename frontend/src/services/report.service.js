import api from "./apiClient";

const BASE = "/reports";

export const getSummary = async () => {
  try {
    const resp = await api.get(`${BASE}/summary`);
    return resp.data || null;
  } catch (err) {
    console.error("getSummary error", err);
    return null;
  }
};

export const getSchedule = async () => {
  try {
    const resp = await api.get(`${BASE}/schedule`);
    return resp.data || null;
  } catch (err) {
    console.error("getSchedule error", err);
    return null;
  }
};

export const saveSchedule = async (payload) => {
  try {
    const resp = await api.put(`${BASE}/schedule`, payload);
    return resp.data || null;
  } catch (err) {
    console.error("saveSchedule error", err);
    throw err;
  }
};

export const exportReport = async (format = "csv") => {
  try {
    const resp = await api.post(`${BASE}/export`, { format });
    return resp.data || null;
  } catch (err) {
    console.error("exportReport error", err);
    throw err;
  }
};

export default {
  getSummary,
  getSchedule,
  saveSchedule,
  exportReport,
};
