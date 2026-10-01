export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-[24px] border border-line bg-surface p-6 shadow-card sm:p-8 ${className}`}>
      {children}
    </div>
  )
}
