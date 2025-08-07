import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import UmrohHomePage from "./components/UmrohHomePage";
import AgentRegistrationForm from "./components/AgentRegistrationForm";
import SignInPage from "./components/SignInPage";
import BookingForm from "./components/BookingForm";
import BookingSelection from "./components/BookingSelection";
import BookingFormPersonal from "./components/BookingFormPersonal";
import BookingFormGroup from "./components/BookingFormGroup";
import DashboardPage from "./components/DashboardPage";
import routes from "tempo-routes";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<UmrohHomePage />} />
          <Route path="/register" element={<AgentRegistrationForm />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/booking" element={<BookingSelection />} />
          <Route path="/booking/personal" element={<BookingFormPersonal />} />
          <Route path="/booking/group" element={<BookingFormGroup />} />
          <Route path="/booking/old" element={<BookingForm />} />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
