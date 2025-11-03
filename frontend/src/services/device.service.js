import api from "./apiClient";

// Devices API wrapper
const BASE = "/devices"; // Remove duplicate /api since it's in the baseURL

export const getDevices = async () => {
	try {
		const resp = await api.get(BASE);
		return resp.data;
	} catch (err) {
		// Fallback: return empty array on error
		console.error("getDevices error", err);
		return [];
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
	createDevice,
	deleteDevice,
};
