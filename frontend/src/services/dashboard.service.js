import api from "./apiClient";

const dashboardService = {
  // Lấy Grafana embed URL
  getDashboardUrl: async () => {
    try {
      const response = await api.get('/dashboard/url');
      return response.data;
    } catch (error) {
      console.error('Get dashboard URL error:', error);
      throw error;
    }
  },

  // Lấy single panel URL cho device cụ thể
  getPanelUrl: async (deviceId, panelId = 2, timeRange = '24h') => {
    try {
      const response = await api.get('/dashboard/panel', {
        params: { deviceId, panelId, timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Get panel URL error:', error);
      throw error;
    }
  },

  // Lấy overview data cho tất cả devices
  getOverview: async () => {
    try {
      const response = await api.get('/data/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get overview error:', error);
      throw error;
    }
  }
};

export default dashboardService;