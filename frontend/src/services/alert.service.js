import api from "./apiClient";

const BASE = "/alerts";
const RULES = `${BASE}/rules`;
const NOTIFICATIONS = `${BASE}/notifications`;

export const getAlerts = async () => {
  try {
    const resp = await api.get(BASE);
    return resp.data || [];
  } catch (err) {
    console.error("getAlerts error", err);
    return [];
  }
};

export const getAlertHistory = async () => {
  try {
    const resp = await api.get(`${BASE}/history`);
    return resp.data || [];
  } catch (err) {
    console.error("getAlertHistory error", err);
    return [];
  }
};

export const getRules = async () => {
  try {
    const resp = await api.get(RULES);
    return resp.data || [];
  } catch (err) {
    console.error("getRules error", err);
    return [];
  }
};

export const createRule = async (payload) => {
  try {
    const resp = await api.post(RULES, payload);
    return resp.data;
  } catch (err) {
    console.error("createRule error", err);
    throw err;
  }
};

export const updateRule = async (id, payload) => {
  try {
    const resp = await api.patch(`${RULES}/${id}`, payload);
    return resp.data;
  } catch (err) {
    console.error("updateRule error", err);
    throw err;
  }
};

export const deleteRule = async (id) => {
  try {
    const resp = await api.delete(`${RULES}/${id}`);
    return resp.data;
  } catch (err) {
    console.error("deleteRule error", err);
    throw err;
  }
};

export const getNotificationConfig = async () => {
  try {
    const resp = await api.get(NOTIFICATIONS);
    return resp.data || {};
  } catch (err) {
    console.error("getNotificationConfig error", err);
    return {};
  }
};

export const updateNotificationConfig = async (payload) => {
  try {
    const resp = await api.put(NOTIFICATIONS, payload);
    return resp.data;
  } catch (err) {
    console.error("updateNotificationConfig error", err);
    throw err;
  }
};

export const sendTestNotification = async () => {
  try {
    const resp = await api.post(`${NOTIFICATIONS}/test`);
    return resp.data;
  } catch (err) {
    console.error("sendTestNotification error", err);
    throw err;
  }
};

export default {
  getAlerts,
  getAlertHistory,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getNotificationConfig,
  updateNotificationConfig,
  sendTestNotification,
};
