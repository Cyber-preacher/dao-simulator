export default function Debug() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tailwind Debug</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-red-500 text-white rounded-lg">Box 1</div>
        <div className="p-6 bg-green-500 text-white rounded-lg">Box 2</div>
        <div className="p-6 bg-blue-500 text-white rounded-lg">Box 3</div>
      </div>
      <p className="text-sm text-muted-foreground">If these are stacked in one column on a wide window, Tailwind isn’t applying.</p>
    </div>
  );
}
