import axios from "axios";

const API = axios.create({ baseURL: "http://127.0.0.1:5000/api" });

// Add a request interceptor to attach the JWT token
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);

export const getClients = (params) => API.get("/clients", { params });
export const createClient = (data) => API.post("/clients", data);
export const deleteClient = (id) => API.delete(`/clients/${id}`);

export const getReminders = (params) => API.get("/reminders", { params });
export const createReminder = (data) => API.post("/reminders", data);
export const updateReminder = (id, data) => API.put(`/reminders/${id}`, data);
export const deleteRemindersBulk = (ids) => API.post("/reminders/bulk-delete", { ids });
export const deleteReminder = (id) => API.delete(`/reminders/${id}`);
export const retryReminder = (id) => API.post(`/reminders/${id}/retry`);

export const getStats = () => API.get("/stats");
