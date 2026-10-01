import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const PAGE_META = {
  '/admin/create-product': { title: 'Create product', subtitle: 'Add a new product to your catalog' },
  '/admin/orders': { title: 'Orders', subtitle: 'Manage incoming customer orders' },
  '/admin/profile': { title: 'Profile', subtitle: 'Manage customer contact details' },
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] ?? { title: 'FlowBoard' }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={pathname === '/admin/create-product' || pathname === '/admin/profile' ? 'font-[Poppins]' : undefined}>
          <Topbar title={meta.title} subtitle={meta.subtitle} />
        </div>
        <main className="flex-1 overflow-y-auto bg-lifted px-4 pb-24 pt-5 sm:p-7 lg:p-8 xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
