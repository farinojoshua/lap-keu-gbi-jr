"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-xl font-semibold text-red-600">Terjadi Kesalahan</h2>
      <p className="text-gray-600">
        {error.message || "Terjadi kesalahan yang tidak terduga"}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Coba Lagi
      </button>
    </div>
  );
}
