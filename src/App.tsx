import { useEffect } from "react";
import { SnackbarProvider } from "notistack";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Index from "./routes/index";

// 1. Import your Zustand store
import { useAuthStore } from "./store/useAuthStore"; 

export default function App() {
  // 2. Extract the auth check functions
  const { checkAuth, isCheckingAuth } = useAuthStore();

  // 3. Run the check once when the app starts/refreshes
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 4. While the backend is responding (getMe), show a loading screen
  // This prevents the user from being redirected to /login accidentally
  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#060b1a]">
        <div className="text-white animate-pulse text-lg font-semibold">
          ⌘ ProTrac is loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <SnackbarProvider
        maxSnack={2}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <ToastContainer position="top-right" autoClose={3000} />
        {/* 5. Once check is done, render the routes */}
        <Index />
      </SnackbarProvider>
    </div>
  );
}