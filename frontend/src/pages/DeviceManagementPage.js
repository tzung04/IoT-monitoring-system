import React, { useEffect, useState } from "react";
import deviceService from "../services/device.service";

const DeviceManagementPage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", location: "" });
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await deviceService.getDevices();
    setDevices(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("Tên thiết bị là bắt buộc");
      return;
    }
    try {
      const created = await deviceService.createDevice(form);
      // If backend returns created item, append; otherwise reload
      if (created && created.id) {
        setDevices((d) => [...d, created]);
      } else {
        await load();
      }
      setForm({ name: "", type: "", location: "" });
    } catch (err) {
      console.error('Add device error:', err);
      setError(err.response?.data?.error || "Không thể thêm thiết bị");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
    try {
      await deviceService.deleteDevice(id);
      setDevices((d) => d.filter((x) => x.id !== id));
    } catch (err) {
      setError("Xóa không thành công");
    }
  };

  return (
    <div>
      <h2>Device Management</h2>

      <section style={{ marginBottom: 20 }}>
        <h3>Thêm thiết bị</h3>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input 
            name="name" 
            placeholder="Tên thiết bị" 
            value={form.name} 
            onChange={handleChange} 
            style={{ padding: '8px' }}
          />
          <select 
            name="type" 
            value={form.type} 
            onChange={handleChange}
            style={{ padding: '8px' }}
          >
            <option value="">Chọn loại thiết bị</option>
            <option value="temperature">Cảm biến nhiệt độ</option>
            <option value="gateway">Gateway</option>
          </select>
          <input 
            name="location" 
            placeholder="Vị trí" 
            value={form.location} 
            onChange={handleChange}
            style={{ padding: '8px' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>Thêm</button>
        </form>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      </section>

      <section>
        <h3>Danh sách thiết bị</h3>
        {loading ? (
          <div>Loading...</div>
        ) : devices.length === 0 ? (
          <div>Chưa có thiết bị nào.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>ID</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Name</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Type</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Location</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Status</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td style={{ padding: "8px" }}>{d.id}</td>
                  <td style={{ padding: "8px" }}>{d.name}</td>
                  <td style={{ padding: "8px" }}>{d.type}</td>
                  <td style={{ padding: "8px" }}>{d.location}</td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ 
                      color: d.status === 'online' ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}>
                      {d.status || 'offline'}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <button 
                      onClick={() => handleDelete(d.id)} 
                      style={{ 
                        color: "white", 
                        backgroundColor: "#ff4444",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default DeviceManagementPage;
