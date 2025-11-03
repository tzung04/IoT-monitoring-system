const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.MOCK_PORT || 5000;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies
app.use(bodyParser.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// In-memory store
let devices = [
  { 
    id: 1, 
    name: 'Demo Sensor 1', 
    type: 'temperature',
    status: 'online',
    location: 'Room A',
    lastSeen: new Date().toISOString(),
    config: {
      interval: 30,
      threshold: 25
    }
  },
  { 
    id: 2, 
    name: 'Gateway 1', 
    type: 'gateway',
    status: 'online',
    location: 'Floor 1',
    lastSeen: new Date().toISOString(),
    config: {
      mode: 'active',
      range: 100
    }
  },
];

let nextId = devices.length + 1;

// Broadcast to all WebSocket clients
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to mock WebSocket');
  
  // Send initial device statuses
  devices.forEach(device => {
    ws.send(JSON.stringify({
      type: 'device_status',
      data: {
        id: device.id,
        status: device.status,
        lastSeen: device.lastSeen
      }
    }));
  });

  // Simulate sensor data every 5s for temperature sensors
  const interval = setInterval(() => {
    const tempSensors = devices.filter(d => d.type === 'temperature');
    tempSensors.forEach(sensor => {
      const value = 20 + Math.random() * 10; // Random temp between 20-30°C
      ws.send(JSON.stringify({
        type: 'sensor_data',
        data: {
          deviceId: sensor.id,
          type: 'temperature',
          value: value.toFixed(1),
          unit: '°C',
          timestamp: new Date().toISOString()
        }
      }));
    });
  }, 5000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected from mock WebSocket');
  });
});

// REST endpoints
app.get('/api/devices', (req, res) => {
  res.json(devices);
});

app.get('/api/devices/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const device = devices.find(d => d.id === id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

app.post('/api/devices', (req, res) => {
  const { name, type, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  
  const newDevice = { 
    id: nextId++, 
    name, 
    type: type || 'unknown',
    location: location || '',
    status: 'offline',
    lastSeen: new Date().toISOString(),
    config: {}
  };
  
  devices.push(newDevice);
  
  // Broadcast new device
  broadcast({
    type: 'device_added',
    data: newDevice
  });
  
  res.status(201).json(newDevice);
});

app.patch('/api/devices/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Device not found' });
  
  const device = devices[idx];
  const updated = { ...device, ...req.body };
  devices[idx] = updated;
  
  broadcast({
    type: 'device_updated',
    data: updated
  });
  
  res.json(updated);
});

app.delete('/api/devices/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Device not found' });
  
  const deleted = devices[idx];
  devices.splice(idx, 1);
  
  broadcast({
    type: 'device_deleted',
    data: { id }
  });
  
  res.json({ success: true });
});

app.get('/', (req, res) => res.json({ 
  message: 'Mock IoT API', 
  websocket: `ws://localhost:${PORT}`,
  endpoints: {
    devices: '/api/devices',
    deviceById: '/api/devices/:id'
  }
}));

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET    /api/devices');
  console.log('  POST   /api/devices');
  console.log('  GET    /api/devices/:id');
  console.log('  PATCH  /api/devices/:id');
  console.log('  DELETE /api/devices/:id');
});
