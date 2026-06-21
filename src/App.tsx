import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Waitlist from "@/pages/Waitlist";
import Quota from "@/pages/Quota";
import Dispatch from "@/pages/Dispatch";
import Settings from "@/pages/Settings";
import { useAppStore } from "@/store/appStore";

export default function App() {
  const fetchAll = useAppStore(s => s.fetchAll);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/quota" element={<Quota />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
