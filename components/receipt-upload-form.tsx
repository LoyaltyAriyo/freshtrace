"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Upload, ImageIcon, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type UploadState = "idle" | "uploading" | "error"

export function ReceiptUploadForm() {
  const [state, setState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(file: File | undefined) {
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setState("error")
      setErrorMsg("Invalid file type. Please upload an image (JPG, PNG, HEIC).")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setState("error")
      setErrorMsg("File is too large. Maximum size is 10MB.")
      return
    }

    setState("uploading")
    setProgress(25)
    setErrorMsg("")

    try {
      const formData = new FormData()
      formData.append("receipt", file)

      setProgress(50)

      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      })

      setProgress(80)

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Upload failed")
      }

      const data = await response.json()

      setProgress(100)

      setTimeout(() => {
        router.push(`/scan/review?receiptId=${data.receiptId}`)
      }, 300)
    } catch (error) {
      setState("error")
      setProgress(0)
      setErrorMsg(error instanceof Error ? error.message : "Upload failed")
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Scan Receipt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload or capture a receipt photo to automatically extract items
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4 text-primary" />
              Capture Photo
            </CardTitle>
            <CardDescription>Take a photo of your receipt using your camera</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                fileRef.current?.setAttribute("capture", "environment")
                fileRef.current?.click()
              }}
              disabled={state === "uploading"}
            >
              <Camera className="mr-2 h-4 w-4" />
              Open Camera
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-primary" />
              Upload Image
            </CardTitle>
            <CardDescription>Select a receipt photo from your gallery or files</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                fileRef.current?.removeAttribute("capture")
                fileRef.current?.click()
              }}
              disabled={state === "uploading"}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </CardContent>
        </Card>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          state === "uploading" && "pointer-events-none opacity-60"
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag and drop a receipt image here</p>
        <p className="text-xs text-muted-foreground">Supports JPG, PNG, HEIC up to 10MB</p>
      </div>

      {state === "uploading" && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-foreground">Processing receipt...</p>
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{Math.round(progress)}%</span>
          </CardContent>
        </Card>
      )}

      {state === "error" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{errorMsg}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Please try again with a different image
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setState("idle")
                setErrorMsg("")
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Upload receipt image"
      />
    </div>
  )
}