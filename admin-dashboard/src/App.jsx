import { Navigate, Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import CreateProduct from './pages/CreateProduct'
import AdminReviews from './pages/AdminReviews'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import UserOrdering from './pages/UserOrdering'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UserOrdering />} />
      <Route element={<AppLayout />}>
        <Route path="/admin" element={<Navigate to="/admin/create-product" replace />} />
        <Route path="/admin/create-product" element={<CreateProduct />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/profile" element={<Profile />} />
      </Route>
      <Route path="/create-product" element={<Navigate to="/admin/create-product" replace />} />
      <Route path="/reviews" element={<Navigate to="/admin/reviews" replace />} />
      <Route path="/orders" element={<Navigate to="/admin/orders" replace />} />
      <Route path="/profile" element={<Navigate to="/admin/profile" replace />} />
    </Routes>
  )
}
