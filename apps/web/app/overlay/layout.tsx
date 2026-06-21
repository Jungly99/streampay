export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body, #__next { background: transparent !important; background-color: transparent !important; }
      `}</style>
      {children}
    </>
  )
}
