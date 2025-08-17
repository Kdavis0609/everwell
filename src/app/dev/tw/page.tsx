export default function Page() {
  return (
    <div className="space-y-4 p-6">
      <div className="p-4 bg-emerald-500 text-white rounded">If this is green, Tailwind is working.</div>
      <div className="p-4 bg-zinc-950 text-white rounded md:bg-blue-500">Resize window: should turn blue &gt;= md.</div>
      <button className="px-3 py-1 rounded border">Button</button>
      <div className="p-4 bg-__should_fail text-white rounded">This should show a Tailwind warning.</div>
    </div>
  )
}
