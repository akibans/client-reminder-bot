import axios from "axios";

const API = axios.create({ baseURL: "http://127.0.0.1:5000/api" });

export const getClients = (params) => API.get("/clients", { params });
export const createClient = (data) => API.post("/clients", data);
export const deleteClient = (id) => API.delete(`/clients/${id}`);

export const getReminders = (params) => API.get("/reminders", { params });
export const createReminder = (data) => API.post("/reminders", data);
export const updateReminder = (id, data) => API.put(`/reminders/${id}`, data);
export const deleteRemindersBulk = (ids) => API.post("/reminders/bulk-delete", { ids });
export const deleteReminder = (id) => API.delete(`/reminders/${id}`);

export const getStats = () => API.get("/stats");
