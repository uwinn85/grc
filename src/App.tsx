import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicHandler from '@/pages/PublicHandler';
import ManageTag from '@/pages/ManageTag';
import AdminDashboard from '@/pages/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Endpoint universal yang di-flash ke chip NFC & dicetak di QR Code */}
        <Route path="/t/:tagId" element={<PublicHandler />} />

        {/* CMS Konfigurasi Merchant */}
        <Route path="/manage/:tagId" element={<ManageTag />} />

        {/* Dashboard Monitoring Inventaris */}
        <Route path="/dashboard" element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
