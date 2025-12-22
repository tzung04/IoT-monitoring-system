import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Grid,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { trackEvent } from "../observability/faro";
import placeService from "../services/place.service";

const ITEMS_PER_PAGE = 5;

const PlaceManagementPage = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
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
      console.error("Error loading places:", err);
      setError("Không thể tải danh sách vị trí");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Tên vị trí là bắt buộc";
    } else if (form.name.length < 3) {
      errors.name = "Tên phải có ít nhất 3 ký tự";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFilterChange = (e) => {
    const next = { ...filters, [e.target.name]: e.target.value };
    setFilters(next);
    trackEvent("place_filter_applied", {
      field: e.target.name,
      value: e.target.value ? String(e.target.value).slice(0, 50) : "",
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const created = await placeService.createPlace({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });

      if (created && created.id) {
        setPlaces([...places, created]);
        setCurrentPage(1); // Reset to first page
        trackEvent("place_added", { id: created.id });
        setToast({
          open: true,
          message: `Đã thêm vị trí "${created.name}"`,
          severity: "success",
        });
      }
      setForm({ name: "", description: "" });
      setFormErrors({});
    } catch (err) {
      console.error("Add place error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Không thể thêm vị trí";
      setError(errorMsg);
      setToast({
        open: true,
        message: errorMsg,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa vị trí này?")) return;
    try {
      await placeService.deletePlace(id);
      setPlaces((d) => d.filter((x) => x.id !== id));
      trackEvent("place_deleted", { id });
      setToast({ open: true, message: "Đã xóa vị trí", severity: "success" });
    } catch (err) {
      console.error("Delete place error:", err);
      setError("Xóa không thành công");
      setToast({ open: true, message: "Xóa vị trí thất bại", severity: "error" });
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const query = filters.search.trim().toLowerCase();
      if (!query) return true;
      return (
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        String(p.id).includes(query)
      );
    });
  }, [places, filters]);

  const totalPages = Math.ceil(filteredPlaces.length / ITEMS_PER_PAGE);
  const paginatedPlaces = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlaces.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPlaces, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Quản lý Vị trí
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Tạo và quản lý các vị trí (địa điểm) cho thiết bị của bạn
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Form thêm vị trí */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Thêm Vị trí Mới
                </Typography>

                <Stack component="form" spacing={1.5} onSubmit={handleAdd}>
                  <TextField
                    label="Tên vị trí *"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                    placeholder="VD: Phòng khách"
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                  />

                  <TextField
                    label="Mô tả (tuỳ chọn)"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                    placeholder="VD: Tầng 1, phòng khách chính"
                    multiline
                    rows={3}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 0.5 }}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? "⏳ Đang thêm..." : "Thêm Vị trí"}
                  </Button>

                  {error && (
                    <Box
                      sx={{
                        background: "#ffebee",
                        p: 1.5,
                        borderRadius: 1,
                        border: "1px solid #ffcdd2",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#c62828" }}>
                        ⚠️ {error}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Danh sách vị trí */}
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              {/* Search bar */}
              <TextField
                name="search"
                placeholder="🔍 Tìm kiếm theo tên, mô tả hoặc ID..."
                value={filters.search}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Place list */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  maxHeight: "1000px",
                  overflowY: "auto",
                }}
              >
                {loading ? (
                  <Typography sx={{ textAlign: "center", py: 4, color: "textSecondary" }}>
                    ⏳ Đang tải vị trí...
                  </Typography>
                ) : filteredPlaces.length === 0 ? (
                  <Card sx={{ p: 3, textAlign: "center" }}>
                    <Typography color="textSecondary">
                      📭 Không có vị trí nào. Hãy thêm vị trí đầu tiên của bạn!
                    </Typography>
                  </Card>
                ) : (
                  paginatedPlaces.map((place) => (
                    <Card
                      key={place.id}
                      sx={{
                        p: 2,
                        border: "2px solid #f0f0f0",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "#667eea",
                          boxShadow: "0 4px 12px rgba(102,126,234,0.15)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {place.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
                            ID: {place.id}
                          </Typography>

                          {place.description && (
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                              {place.description}
                            </Typography>
                          )}

                          <Typography variant="caption" color="textSecondary">
                            Tạo lúc:{" "}
                            {place.created_at
                              ? new Date(place.created_at).toLocaleString("vi-VN")
                              : "N/A"}
                          </Typography>
                        </Box>

                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(place.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Card>
                  ))
                )}
              </Box>

              {/* Pagination */}
              {!loading && filteredPlaces.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    ← Trước
                  </Button>
                  <Typography variant="body2" sx={{ minWidth: "100px", textAlign: "center" }}>
                    Trang {currentPage} / {totalPages}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Sau →
                  </Button>
                </Box>
              )}

                {/* Stats */}
                {!loading && places.length > 0 && (
                <Box
                    sx={{
                    background: "#f5f7fa",
                    p: 2,
                    borderRadius: 1,
                    display: "flex",
                    justifyContent: "space-around",
                    }}
                >
                    <Box sx={{ textAlign: "center" }}>
                    <Typography variant="body2" color="textSecondary">
                        Tổng số vị trí
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#667eea" }}>
                        {places.length}
                    </Typography>
                    </Box>
                </Box>
                )}
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PlaceManagementPage;
