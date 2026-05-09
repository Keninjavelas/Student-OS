import { createSlice } from "@reduxjs/toolkit";

let nextId = 1;

const STORAGE_KEY = "student-os-notifications";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50))); } catch {}
}

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    items: load(),   // { id, type, title, message, read, timestamp, link }
    unreadCount: load().filter(n => !n.read).length,
  },
  reducers: {
    pushNotification(state, action) {
      const item = {
        id: nextId++,
        type: action.payload.type ?? "info",   // info | success | warning | error
        title: action.payload.title,
        message: action.payload.message ?? "",
        read: false,
        timestamp: new Date().toISOString(),
        link: action.payload.link ?? null,
      };
      state.items.unshift(item);
      state.unreadCount = state.items.filter(n => !n.read).length;
      save(state.items);
    },
    markRead(state, action) {
      const item = state.items.find(n => n.id === action.payload);
      if (item) item.read = true;
      state.unreadCount = state.items.filter(n => !n.read).length;
      save(state.items);
    },
    markAllRead(state) {
      state.items.forEach(n => { n.read = true; });
      state.unreadCount = 0;
      save(state.items);
    },
    removeNotification(state, action) {
      state.items = state.items.filter(n => n.id !== action.payload);
      state.unreadCount = state.items.filter(n => !n.read).length;
      save(state.items);
    },
    clearAll(state) {
      state.items = [];
      state.unreadCount = 0;
      save([]);
    },
  },
});

export const { pushNotification, markRead, markAllRead, removeNotification, clearAll } = notificationSlice.actions;
export default notificationSlice.reducer;
