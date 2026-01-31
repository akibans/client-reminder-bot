import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AddClient from "./pages/AddClient";
import Clients from "./pages/Clients";
import CreateReminder from "./pages/CreateReminder";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/add-client" element={<AddClient />} />
        <Route path="/create-reminder" element={<CreateReminder />} />
      </Routes>
    </Router>
  );
}

export default App;
