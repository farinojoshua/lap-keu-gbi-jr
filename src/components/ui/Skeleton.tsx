export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonCard({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SkeletonTableRow({ cols }: { cols: number }) {
  return (
    <tr className="border-t">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50">
          {Array.from({ length: cols }, (_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-4 w-3/4" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  );
}
