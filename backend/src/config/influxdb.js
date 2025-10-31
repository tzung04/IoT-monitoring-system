import { InfluxDB, Point } from '@influxdata/influxdb-client';

const url = process.env.INFLUX_URL || 'http://localhost:8086';
const token = process.env.INFLUX_TOKEN || 'my-super-secret-auth-token';
const org = process.env.INFLUX_ORG || 'iot_org';
const bucket = process.env.INFLUX_BUCKET || 'iot_data';

let influxDB;
let writeApi;
let queryApi;

export const initInfluxDB = async () => {
  try {
    influxDB = new InfluxDB({ url, token });
    writeApi = influxDB.getWriteApi(org, bucket);
    queryApi = influxDB.getQueryApi(org);
    
    // Set default tags
    writeApi.useDefaultTags({ app: 'iot-monitoring' });
    
    console.log('✅ InfluxDB client initialized');
  } catch (error) {
    console.error('❌ InfluxDB initialization error:', error);
    throw error;
  }
};

export const writeSensorData = async (deviceId, sensorType, value, tags = {}) => {
  try {
    const point = new Point('sensor_data')
      .tag('device_id', deviceId)
      .tag('sensor_type', sensorType)
      .floatField('value', value);
    
    // Add additional tags
    Object.keys(tags).forEach(key => {
      point.tag(key, tags[key]);
    });
    
    writeApi.writePoint(point);
    await writeApi.flush();
    
    return true;
  } catch (error) {
    console.error('❌ Error writing to InfluxDB:', error);
    throw error;
  }
};

export const querySensorData = async (deviceId, sensorType, timeRange = '-1h') => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${timeRange})
        |> filter(fn: (r) => r._measurement == "sensor_data")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> filter(fn: (r) => r.sensor_type == "${sensorType}")
    `;
    
    const result = [];
    
    return new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          result.push({
            time: o._time,
            value: o._value,
            deviceId: o.device_id,
            sensorType: o.sensor_type
          });
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(result);
        },
      });
    });
  } catch (error) {
    console.error('❌ Error querying InfluxDB:', error);
    throw error;
  }
};

export const getWriteApi = () => writeApi;
export const getQueryApi = () => queryApi;

export default influxDB;