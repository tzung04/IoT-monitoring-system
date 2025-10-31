import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import routes
import deviceRoutes from './src/routes/device.routes.js';
import sensorRoutes from './src/routes/sensor.routes.js';
import authRoutes from './src/routes/auth.routes.js';

// Import services
import { initDatabase } from './src/config/database.js';
import { connectMQTT } from './src/services/mqtt.service.js';
import { initInfluxDB } from './src/config/influxdb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sensors', sensorRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'IoT Monitoring System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      devices: '/api/devices',
      sensors: '/api/sensors'
    }
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('📡 New WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('📨 Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });
  
  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connection', 
    message: 'Connected to IoT Monitoring System' 
  }));
});

// Broadcast function for WebSocket
export const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(data));
    }
  });
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize services and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting IoT Monitoring System...');
    
    // Initialize database
    await initDatabase();
    console.log('✅ PostgreSQL connected');
    
    // Initialize InfluxDB
    await initInfluxDB();
    console.log('✅ InfluxDB connected');
    
    // Connect to MQTT
    await connectMQTT();
    console.log('✅ MQTT connected');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📊 API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

startServer();