import api from "./apiClient";

const BASE = "/dashboard/layout";

export const getLayout = async () => {
  try {
    const resp = await api.get(BASE);
    return resp.data || [];
  } catch (err) {
    console.error("getLayout error", err);
    return [];
  }
};

export const saveLayout = async (layout) => {
  try {
    const resp = await api.put(BASE, { layout });
    return resp.data || [];
  } catch (err) {
    console.error("saveLayout error", err);
    throw err;
  }
};

export default { getLayout, saveLayout };
