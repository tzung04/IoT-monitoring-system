import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button,
  IconButton, Tooltip, Snackbar, Alert, Grid, CircularProgress,
  Paper, InputAdornment, Container, Fade
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryIcon from "@mui/icons-material/History";
import placeService from "../services/place.service";

const ITEMS_PER_PAGE = 5;

const PlaceManagementPage = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await placeService.getPlaces();
      setPlaces(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Không thể tải danh sách vị trí");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: "" });
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Tên vị trí là bắt buộc";
    else if (form.name.length < 3) errors.name = "Tên phải có ít nhất 3 ký tự";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const created = await placeService.createPlace({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      if (created) {
        setPlaces([created, ...places]);
        setForm({ name: "", description: "" });
        setToast({ open: true, message: "Thêm vị trí mới thành công!", severity: "success" });
      }
    } catch (err) {
      setError(err.message || "Lỗi khi thêm vị trí");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa vị trí này?")) return;
    try {
      await placeService.deletePlace(id);
      setPlaces((d) => d.filter((x) => x.id !== id));
      setToast({ open: true, message: "Đã xóa vị trí thành công", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Xóa thất bại", severity: "error" });
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const query = filters.search.trim().toLowerCase();
      return !query || p.name?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query);
    });
  }, [places, filters]);

  const totalPages = Math.ceil(filteredPlaces.length / ITEMS_PER_PAGE);
  const paginatedPlaces = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlaces.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPlaces, currentPage]);

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="lg">
        {/* Header Section Center aligned */}
        <Box sx={{ mb: 6, textAlign: "center" }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: "#0f172a", mb: 2, letterSpacing: "-1.5px" }}>
            Quản lý Vị trí
          </Typography>
          <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 400, maxWidth: "600px", mx: "auto" }}>
            Tổ chức hệ thống IoT bằng cách phân loại thiết bị vào các khu vực địa lý hoặc phòng ban cụ thể.
          </Typography>
        </Box>

        <Grid container spacing={5} justifyContent="center">
          {/* Form Side */}
          <Grid item xs={12} lg={4.5}>
            <Card sx={{ 
              borderRadius: 5, 
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
              position: { lg: "sticky" },
              top: 40
            }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
                  <Box sx={{ bgcolor: "primary.main", color: "white", p: 1, borderRadius: 2, display: "flex" }}>
                    <AddLocationAltIcon />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b" }}>Thêm Vị trí</Typography>
                </Stack>

                <Stack component="form" spacing={3} onSubmit={handleAdd}>
                  <TextField
                    label="Tên khu vực / Vị trí"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    fullWidth
                    placeholder="VD: Nhà kho A, Văn phòng tầng 2..."
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#fcfcfc" } }}
                  />

                  <TextField
                    label="Mô tả hoặc Ghi chú"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Thông tin chi tiết về vị trí này để quản lý dễ dàng hơn..."
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#fcfcfc" } }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      borderRadius: 3, 
                      py: 1.8,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)"
                    }}
                  >
                    {loading ? <CircularProgress size={26} color="inherit" /> : "Lưu Vị Trí Mới"}
                  </Button>

                  {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* List Side */}
          <Grid item xs={12} lg={7.5}>
            <Stack spacing={3}>
              {/* Search bar modern style */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 0.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  borderRadius: 4, 
                  border: "1px solid #e2e8f0",
                  bgcolor: "white",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
                }}
              >
                <InputAdornment position="start" sx={{ ml: 2 }}>
                  <SearchIcon sx={{ color: "#94a3b8" }} />
                </InputAdornment>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Tìm kiếm vị trí theo tên hoặc mô tả..."
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  InputProps={{ disableUnderline: true, sx: { py: 1.5, fontSize: "1rem" } }}
                />
              </Paper>

              <Box sx={{ minHeight: "500px" }}>
                {loading && places.length === 0 ? (
                  <Stack alignItems="center" sx={{ py: 15 }}><CircularProgress thickness={4} /></Stack>
                ) : filteredPlaces.length === 0 ? (
                  <Paper sx={{ 
                    p: 10, textAlign: "center", borderRadius: 5, 
                    bgcolor: "white", border: "2px dashed #e2e8f0" 
                  }} elevation={0}>
                    <LocationOnIcon sx={{ fontSize: 60, color: "#cbd5e1", mb: 2 }} />
                    <Typography sx={{ color: "#64748b", fontWeight: 500 }} variant="h6">
                      Không tìm thấy vị trí nào
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2.5}>
                    {paginatedPlaces.map((place, index) => (
                      <Fade in timeout={400 + index * 100} key={place.id}>
                        <Card sx={{ 
                          borderRadius: 4, 
                          border: "1px solid #e2e8f0",
                          transition: "0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": { 
                            transform: "scale(1.02)",
                            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
                            borderColor: "primary.main"
                          }
                        }}>
                          <CardContent sx={{ p: "24px !important" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Stack direction="row" spacing={2.5}>
                                <Box sx={{ 
                                  bgcolor: "#eff6ff", color: "primary.main", 
                                  width: 50, height: 50, borderRadius: 3,
                                  display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                  <LocationOnIcon />
                                </Box>
                                <Box>
                                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}>
                                    {place.name}
                                  </Typography>
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography variant="caption" sx={{ bgcolor: "#f1f5f9", px: 1, py: 0.5, borderRadius: 1, fontWeight: 700, color: "#475569" }}>
                                      ID: #{place.id}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <HistoryIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                                      <Typography variant="caption" color="textSecondary">
                                        {new Date(place.created_at || Date.now()).toLocaleDateString("vi-VN")}
                                      </Typography>
                                    </Stack>
                                  </Stack>
                                </Box>
                              </Stack>
                              
                              <Tooltip title="Xóa vị trí">
                                <IconButton 
                                  onClick={() => handleDelete(place.id)}
                                  sx={{ 
                                    color: "#f43f5e", bgcolor: "#fff1f2", 
                                    "&:hover": { bgcolor: "#ffe4e6", transform: "rotate(10deg)" },
                                    width: 45, height: 45
                                  }}
                                >
                                  <DeleteOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            
                            {place.description && (
                              <Box sx={{ mt: 2, ml: 8.5, p: 2, bgcolor: "#f8fafc", borderRadius: 2, borderLeft: "4px solid #e2e8f0" }}>
                                <Typography variant="body2" color="#475569" sx={{ fontStyle: "italic" }}>
                                  "{place.description}"
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Fade>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Enhanced Pagination */}
              <Box sx={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", 
                p: 3, bgcolor: "white", borderRadius: 4, border: "1px solid #e2e8f0" 
              }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#64748b" }}>
                  Tổng cộng {places.length} vị trí
                </Typography>
                
                {totalPages > 1 && (
                  <Stack direction="row" spacing={1}>
                    <Button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => p - 1)}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                      Trước
                    </Button>
                    <Box sx={{ display: "flex", alignItems: "center", px: 2, bgcolor: "#f1f5f9", borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{currentPage} / {totalPages}</Typography>
                    </Box>
                    <Button 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(p => p + 1)}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                      Sau
                    </Button>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} variant="filled" sx={{ width: "100%", borderRadius: 3, fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlaceManagementPage;