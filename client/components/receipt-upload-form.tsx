"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Upload, ImageIcon, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"

type UploadState = "idle" | "uploading" | "error"

export function ReceiptUploadForm() {
  const [state, setState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isWebcamSupported, setIsWebcamSupported] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setIsWebcamSupported(false)
      return
    }

    const hasMedia =
      !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    const isHttps = protocol === "https:"
    const isSecure = isHttps || isLocalhost

    if (!hasMedia || !isSecure) {
      setIsWebcamSupported(false)
    } else {
      setIsWebcamSupported(true)
    }

    return () => {
      stopWebcam()
      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsWebcamActive(false)
  }

  async function startWebcam() {
    if (!isWebcamSupported) {
      setCameraError("Camera not supported in this browser. Please upload a file instead.")
      return
    }

    setCameraError(null)

    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setIsWebcamActive(true)

      // Attach stream to video element on next frame, after it mounts
      requestAnimationFrame(() => {
        const video = videoRef.current
        if (!video) return

        video.srcObject = stream

        const play = () => {
          video
            .play()
            .catch(() => {
              // ignore play errors (e.g., autoplay restrictions)
            })
        }

        if (video.readyState >= 2) {
          play()
          return
        }

        const handleLoaded = () => {
          video.removeEventListener("loadedmetadata", handleLoaded)
          play()
        }

        video.addEventListener("loadedmetadata", handleLoaded)
      })
    } catch (error: unknown) {
      stopWebcam()

      const err = error as DOMException
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow access in your browser settings.")
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setCameraError("No camera detected on this device.")
      } else {
        setCameraError("Failed to start camera. Please try again or use file upload.")
      }
    }
  }

  async function captureWebcamPhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Failed to capture image. Please try again.")
      return
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas")
    }

    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext("2d")
    if (!context) {
      setCameraError("Failed to capture image. Please try again.")
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.9)
    )

    if (!blob) {
      setCameraError("Failed to capture image. Please try again.")
      return
    }

    stopWebcam()

    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }

    const url = URL.createObjectURL(blob)
    setCapturedImage({ blob, url })
    setCameraError(null)
  }

  async function handleUploadCaptured() {
    if (!capturedImage) {
      setCameraError("No captured image to upload.")
      return
    }

    const file = new File([capturedImage.blob], "receipt-webcam.jpg", { type: "image/jpeg" })
    await handleFile(file)
  }

  function handleRetake() {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    setCameraError(null)
    startWebcam()
  }

  function handleCancelWebcam() {
    stopWebcam()
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    setCameraError(null)
  }

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
        {isMobile || !isWebcamSupported ? (
          <Card className="transition-all hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4 text-primary" />
                Capture Photo
              </CardTitle>
              <CardDescription>Take a photo of your receipt using your camera</CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="receipt-camera-input" className="block">
                <Button className="w-full" disabled={state === "uploading"}>
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
              </label>
            </CardContent>
          </Card>
        ) : (
          <Card className="transition-all hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4 text-primary" />
                Use Webcam
              </CardTitle>
              <CardDescription>Use your computer&apos;s camera to capture a receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={startWebcam}
                disabled={state === "uploading" || !isWebcamSupported}
              >
                <Camera className="mr-2 h-4 w-4" />
                Use Webcam
              </Button>
              {!isWebcamSupported && (
                <p className="text-xs text-muted-foreground">
                  Camera not supported in this browser. Please upload a file instead.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="transition-all hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-primary" />
              Upload Image
            </CardTitle>
            <CardDescription>Select a receipt photo from your gallery or files</CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="receipt-file-input" className="block">
              <Button variant="outline" className="w-full" disabled={state === "uploading"}>
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {!isMobile && (isWebcamActive || capturedImage) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {capturedImage ? "Captured Photo" : "Webcam Preview"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-80 rounded-lg bg-black object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedImage.url}
                alt="Captured receipt preview"
                className="w-full max-h-80 rounded-lg bg-muted object-contain"
              />
            )}
            {cameraError && (
              <p className="text-xs text-destructive" aria-live="polite">
                {cameraError}
              </p>
            )}
          </CardContent>
          <CardContent className="flex gap-2 border-t pt-4">
            {!capturedImage ? (
              <>
                <Button
                  className="flex-1"
                  onClick={captureWebcamPhoto}
                  disabled={state === "uploading"}
                >
                  Capture Photo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelWebcam}
                  disabled={state === "uploading"}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="flex-1"
                  onClick={handleUploadCaptured}
                  disabled={state === "uploading"}
                >
                  Upload Photo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRetake}
                  disabled={state === "uploading"}
                >
                  Retake
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleCancelWebcam}
                  disabled={state === "uploading"}
                >
                  Cancel
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
        id="receipt-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Capture receipt photo"
      />

      <input
        id="receipt-file-input"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Upload receipt image"
      />
    </div>
  )
}
