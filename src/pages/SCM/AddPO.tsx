import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useState } from "react";
import ADDPO from "../../component/Forms/Add_Po";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/joy";
import { toast } from "react-toastify";
import { useChangeIsLockedMutation } from "../../redux/purchasesSlice";

function Add_Purchase() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [Islocked, setIsLocked] = useState(false);
  const [Id, setId] = useState("");

  const [changeIsLocked, { isLoading: lockLoading }] =
    useChangeIsLockedMutation();

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  };

  const handleToggleLock = async () => {
    try {
      if (!Id) {
        toast.error("Purchase Order id not found.");
        return;
      }

      const nextLocked = !Islocked;

      await changeIsLocked({
        id: Id,
        data: nextLocked,
      }).unwrap();

      setIsLocked(nextLocked);
      toast.success(
        nextLocked ? "PO locked successfully" : "PO unlocked successfully"
      );
    } catch (error) {
      console.log("ChangeIsLocked error:", error);
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to update lock status."
      );
    }
  };

  console.log({Id})

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar />

        <MainHeader title="SCM" sticky>
          <Box display="flex" gap={1}>
            {user?.name === "IT Team" ||
            user?.department === "admin" ||
            (user?.department === "Accounts" &&
              (user?.name === "Deepak Kumar Maurya" ||
                user?.name === "Gagan Tayal" ||
                user?.name === "Ajay Singh" ||
                user?.name === "Sachin Raghav" ||
                user?.name === "Anamika Poonia" ||
                user?.name === "Meena Verma" ||
                user?.name === "Kailash Chand" ||
                user?.name === "Chandan Singh")) ||
            (user?.department === "Accounts" &&
              user?.name === "Sujan Maharjan") ||
            user?.name === "Guddu Rani Dubey" ||
            user?.name === "Naresh Kumar" ||
            user?.name === "Prachi Singh" ||
            user?.role === "purchase" ||
            (user?.role === "manager" && user?.name === "Naresh Kumar") ||
            (user?.role === "visitor" &&
              (user?.name === "Sanjiv Kumar" ||
                user?.name === "Sushant Ranjan Dubey")) ||
            (user?.department === "CAM" && user?.name === "Shantanu Sameer") ? (
              <Button
                size="sm"
                onClick={() => navigate("/purchase-order")}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                Purchase Order
              </Button>
            ) : null}

            {user?.name === "IT Team" ||
            user?.department === "admin" ||
            user?.name === "Guddu Rani Dubey" ||
            user?.name === "Naresh Kumar" ||
            user?.name === "Prachi Singh" ||
            user?.role === "purchase" ||
            (user?.role === "manager" && user?.name === "Naresh Kumar") ||
            user?.department === "Logistic" ? (
              <Button
                size="sm"
                onClick={() => navigate(`/logistics`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                Logistics
              </Button>
            ) : null}

            {(user?.department === "SCM" ||
              user?.department === "Accounts" ||
              user?.department === "superadmin" ||
              user?.department === "admin") && (
              <Button
                size="sm"
                onClick={() => navigate(`/vendors`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              >
                Vendors
              </Button>
            )}

            {user?.name === "IT Team" ||
            user?.department === "admin" ||
            (user?.department === "Accounts" &&
              (user?.name === "Deepak Kumar Maurya" ||
                user?.name === "Gagan Tayal" ||
                user?.name === "Ajay Singh" ||
                user?.name === "Sachin Raghav" ||
                user?.name === "Anamika Poonia" ||
                user?.name === "Meena Verma" ||
                user?.name === "Kailash Chand" ||
                user?.name === "Chandan Singh")) ||
            (user?.department === "Accounts" &&
              user?.name === "Sujan Maharjan") ||
            user?.name === "Guddu Rani Dubey" ||
            user?.name === "Naresh Kumar" ||
            user?.name === "Prachi Singh" ||
            user?.role === "purchase" ||
            (user?.role === "manager" && user?.name === "Naresh Kumar") ? (
              <Button
                size="sm"
                onClick={() => navigate(`/vendor_bill`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                Vendor Bill
              </Button>
            ) : null}
          </Box>
        </MainHeader>

        <SubHeader
          title="Purchase Order"
          isBackEnabled={true}
          sticky
          rightSlot={
            <Button
              variant="outlined"
              size="sm"
              onClick={handleToggleLock}
              disabled={lockLoading}
              sx={{
                color: "#3366a3",
                borderColor: "#3366a3",
                backgroundColor: "transparent",
                "--Button-hoverBg": "#e0e0e0",
                "--Button-hoverBorderColor": "#3366a3",
                "&:hover": { color: "#3366a3" },
                height: "28px",
              }}
            >
              {lockLoading ? "Please wait..." : Islocked ? "Unlock" : "Lock"}
            </Button>
          }
        />

        <Box
          component="main"
          className="MainContent"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            mt: "108px",
            p: "16px",
            px: "24px",
          }}
        >
          <ADDPO setId={setId} setIsLocked={setIsLocked} />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default Add_Purchase;
