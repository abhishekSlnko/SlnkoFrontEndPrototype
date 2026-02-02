import { create } from 'zustand';
import axios from 'axios';

interface AuthFormData {
  name: string;
  email: string;
  username: string;
  dob: string;
  village: string;
  city: string;
  state: string;
  country: string;
  password: string;
  confirmPassword: string;
}

interface AuthState {
  // --- Form Data (Existing) ---
  formData: AuthFormData;
  updateField: (field: keyof AuthFormData, value: string) => void;
  resetForm: () => void;

  // --- Auth Logic (New) ---
  user: any | null; 
  isAuthenticated: boolean;
  isCheckingAuth: boolean; // To show a loader while getMe is running
  
  // This function calls the getMe API
  checkAuth: () => Promise<void>;
  setAuth: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  formData: {
    name: '', email: '', username: '', dob: '', village: '',
    city: '', state: '', country: 'India', password: '', confirmPassword: '',
  },
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true, // Start as true so app knows we are checking

  updateField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),

  resetForm: () => set({ formData: { /* empty fields */ } as any }),

  setAuth: (user) => set({ user, isAuthenticated: true, isCheckingAuth: false }),

  // THE REFRESH LOGIC (getMe)
  checkAuth: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return;
      }

      // Hit the getMe controller your senior mentioned
      const response = await axios.get("YOUR_BACKEND_URL/api/auth/getMe", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        set({ user: response.data.user, isAuthenticated: true, isCheckingAuth: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
      localStorage.removeItem("token"); // Token was invalid/expired
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, isAuthenticated: false });
  }
}));