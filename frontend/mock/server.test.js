const request = require('supertest');
const WebSocket = require('ws');
const http = require('http');

// Set longer timeout for WebSocket tests
jest.setTimeout(10000);

// Create server for testing
const express = require('express');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Import our API routes and WebSocket handlers
require('./server')(app, wss); // Pass app and wss to the server module

describe('Mock IoT API', () => {
  let api;
  const PORT = 5001; // Use a different port for testing
  
  beforeAll((done) => {
    server.listen(PORT, () => {
      api = request(`http://localhost:${PORT}`);
      done();
    });
  });
  
  afterAll((done) => {
    server.close(done);
  });

  describe('REST API', () => {
    test('GET / returns API info', async () => {
      const response = await api.get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Mock IoT API');
      expect(response.body).toHaveProperty('websocket');
      expect(response.body).toHaveProperty('endpoints');
    });

    test('GET /api/devices returns list of devices', async () => {
      const response = await api.get('/api/devices');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('GET /api/devices/:id returns a single device', async () => {
      const response = await api.get('/api/devices/1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('lastSeen');
    });

    test('POST /api/devices creates a new device', async () => {
      const newDevice = {
        name: 'Test Device',
        type: 'temperature',
        location: 'Test Room'
      };

      const response = await api
        .post('/api/devices')
        .send(newDevice);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newDevice.name);
      expect(response.body.type).toBe(newDevice.type);
      expect(response.body.location).toBe(newDevice.location);
    });

    test('PATCH /api/devices/:id updates a device', async () => {
      const update = {
        name: 'Updated Device',
        status: 'maintenance'
      };

      const response = await api
        .patch('/api/devices/1')
        .send(update);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(update.name);
      expect(response.body.status).toBe(update.status);
    });

    test('DELETE /api/devices/:id removes a device', async () => {
      const response = await api
        .delete('/api/devices/2');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify device is gone
      const getResponse = await api.get('/api/devices/2');
      expect(getResponse.status).toBe(404);
    });
  });

  describe('WebSocket API', () => {
    let ws;
    const messages = [];
    
    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${PORT}`);
      ws.on('open', () => done());
      
      // Collect all messages for testing
      ws.on('message', (data) => {
        messages.push(JSON.parse(data));
      });
    });

    afterEach((done) => {
      messages.length = 0; // Clear messages array
      ws.on('close', () => done());
      ws.close();
    });

    test('Receives initial device statuses', (done) => {
      // Wait for a short time to collect messages
      setTimeout(() => {
        const statusMessages = messages.filter(m => m.type === 'device_status');
        expect(statusMessages.length).toBe(2); // We expect 2 devices
        
        statusMessages.forEach(message => {
          expect(message.data).toHaveProperty('id');
          expect(message.data).toHaveProperty('status');
          expect(message.data).toHaveProperty('lastSeen');
        });
        
        done();
      }, 1000);
    });

    test('Receives sensor data updates', (done) => {
      // Wait for sensor data update (sent every 5s)
      setTimeout(() => {
        const sensorData = messages.find(m => m.type === 'sensor_data');
        expect(sensorData).toBeTruthy();
        expect(sensorData.data).toHaveProperty('deviceId');
        expect(sensorData.data).toHaveProperty('type');
        expect(sensorData.data).toHaveProperty('value');
        expect(sensorData.data).toHaveProperty('unit');
        expect(sensorData.data).toHaveProperty('timestamp');
        done();
      }, 6000);
    });
  });
});