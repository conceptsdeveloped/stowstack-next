export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <span className="animate-pulse text-2xl font-bold tracking-tight text-white">
          StowStack
        </span>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        </div>
      </div>
    </div>
  );
}
