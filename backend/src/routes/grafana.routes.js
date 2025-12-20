import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import grafanaVerifyMiddleware from '../middleware/grafanaVerify.middleware.js';

const router = express.Router();

/**
 * Route này sẽ proxy requests tới Grafana
 * 
 * Flow:
 * 1. Request đến /grafana/d/... hoặc /grafana/d-solo/...
 * 2. grafanaVerifyMiddleware verify hash
 * 3. Nếu OK → proxy sang Grafana container
 * 4. Nếu FAIL → return 403
 */

// Verify middleware cho tất cả Grafana routes
router.use(grafanaVerifyMiddleware);

// Proxy sang Grafana
router.use('/', createProxyMiddleware({
  target: process.env.GRAFANA_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/grafana': '' // Remove /grafana prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log request
    console.log(`Proxying to Grafana: ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ message: 'Grafana proxy error' });
  }
}));

export default router;