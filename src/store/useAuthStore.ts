import { create } from 'zustand';
import axios from 'axios';

interface AuthFormData {
  name: string; email: string; username: string; dob: string;
  village: string; city: string; state: string; country: string;
  password: string; confirmPassword: string;
}

interface AuthState {
  formData: AuthFormData;
  updateField: (field: keyof AuthFormData, value: string) => void;
  resetForm: () => void;
  user: any | null; 
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  
  // ADDED TO INTERFACE
  login: (credentials: { identity: string; password: string }) => Promise<any>;
  checkAuth: () => Promise<void>;
  setAuth: (user: any) => void;
  logout: () => void;
}

// 1. Fixed Base URL (Removed /v1 based on your backend routes)
const API_BASE_URL = "http://localhost:8080/v1"; 

export const useAuthStore = create<AuthState>((set) => ({
  formData: {
    name: '', email: '', username: '', dob: '', village: '',
    city: '', state: '', country: 'India', password: '', confirmPassword: '',
  },
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,

  updateField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),

  resetForm: () => set({ 
    formData: { name: '', email: '', username: '', dob: '', village: '', 
                city: '', state: '', country: 'India', password: '', confirmPassword: '' } 
  }),

  setAuth: (user) => set({ user, isAuthenticated: true, isCheckingAuth: false }),

  // 2. Updated Login to match backend logic
  login: async (credentials) => {
    try {
      // Endpoint changed to /logiN-IT to match backend router
      const response = await axios.post(`${API_BASE_URL}/logiN-IT`, credentials);
      
      // Backend returns data directly, not inside a 'success' boolean
      if (response.data.token) {
        const { token, ...userData } = response.data;
        localStorage.setItem("token", token);
        set({ user: userData, isAuthenticated: true, isCheckingAuth: false });
      }
      return response.data;
    } catch (error: any) {
      // Backend uses 'msg' for errors (e.g., res.status(400).json({ msg: "..." }))
      throw error.response?.data?.msg || "Login failed";
    }
  },

  // 3. Updated checkAuth to match backend logic
  checkAuth: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return;
      }

      // Endpoint changed to /me to match backend router
      const response = await axios.get(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Backend returns { success: true, user: ... } for getMe
      if (response.data.success) {
        set({ user: response.data.user, isAuthenticated: true, isCheckingAuth: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
      localStorage.removeItem("token");
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, isAuthenticated: false });
  }
}));