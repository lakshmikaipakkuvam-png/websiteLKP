export default function Topbar({ title, subtitle }) {
  return (
    <header className="border-b border-line bg-canvas px-4 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7 lg:px-9 xl:px-10">
      <h1 className="max-w-full break-words text-2xl font-bold leading-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 max-w-3xl text-sm text-muted sm:text-base">{subtitle}</p>
      ) : null}
    </header>
  )
}
