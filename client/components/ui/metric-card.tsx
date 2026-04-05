type MetricCardProps = {
  title: string
  value: number | string
  description?: string
  icon?: React.ReactNode
}

export default function MetricCard({
  title,
  value,
  description,
  icon
}: MetricCardProps) {
  return (
    <div className="rounded-2xl shadow-md p-4 bg-white border flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h2 className="text-2xl font-bold">{value}</h2>
        {description && (
          <p className="text-xs text-gray-400">{description}</p>
        )}
      </div>

      {icon && (
        <div className="text-gray-400 text-2xl">
          {icon}
        </div>
      )}
    </div>
  )
}