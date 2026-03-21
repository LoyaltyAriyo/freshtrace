import { ManualEntryForm } from "@/components/manual-entry-form"

export default function ManualEntryPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manual Entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a food item that is not on a receipt
        </p>
      </div>
      <ManualEntryForm />
    </div>
  )
}
