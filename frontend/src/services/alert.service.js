import api from "./apiClient";

const BASE = "/alert";

/**
 * Lấy tất cả quy tắc cảnh báo của User hiện tại
 * Gọi API: GET /alert/all
 */
export const getRules = async () => {
  try {
    console.log("Fetching all rules via /alert/all");
    
    const resp = await api.get(`${BASE}/all`);
    
    console.log(`Fetched ${resp.data?.length || 0} rules`);
    return resp.data || [];
  } catch (err) {
    console.error("getRules error:", err);
    // Trả về mảng rỗng để không làm crash giao diện
    return [];
  }
};

/**
 * Get alert rules for a specific device
 */
export const getRulesByDevice = async (deviceId) => {
  if (!deviceId) throw new Error("Device ID is required");
  try {
    const resp = await api.get(`${BASE}/${deviceId}`);
    return resp.data || [];
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
};

/**
 * Create a new alert rule
 */
export const createRule = async (payload) => {
  try {
    const resp = await api.post(BASE, payload);
    return resp.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to create rule");
  }
};

/**
 * Update an alert rule
 */
export const updateRule = async (ruleId, payload) => {
  if (!ruleId) throw new Error("Rule ID is required");
  try {
    const resp = await api.put(`${BASE}/${ruleId}`, payload);
    return resp.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to update rule");
  }
};

/**
 * Delete an alert rule
 */
export const deleteRule = async (ruleId) => {
  if (!ruleId) throw new Error("Rule ID is required");
  try {
    const resp = await api.delete(`${BASE}/${ruleId}`);
    return resp.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to delete rule");
  }
};

export default {
  getRules,
  getRulesByDevice,
  createRule,
  updateRule,
  deleteRule,
};