import { NavLink } from 'react-router-dom'
import { IconPlusBox, IconReceipt, IconUser } from './icons'
import { Star } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin/create-product', label: 'Create product', icon: IconPlusBox },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/orders', label: 'Orders', icon: IconReceipt },
  { to: '/admin/profile', label: 'Profile', icon: IconUser },
]

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-none px-5 py-3 text-base font-semibold tracking-tight transition-colors',
          isActive
            ? 'bg-yellow text-ink shadow-pop'
            : 'text-ink/60 hover:bg-ink/[0.05] hover:text-ink',
        ].join(' ')
      }
      end
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-canvas px-4 py-6 xl:w-72 lg:flex">
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-line bg-canvas/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-pop backdrop-blur-md lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 text-center text-xs font-bold transition-colors',
                isActive ? 'text-ink' : 'text-ink/55',
              ].join(' ')
            }
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full">
              <Icon className="h-5 w-5" />
            </span>
            <span className="w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
