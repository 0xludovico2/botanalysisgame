"use client"

import { useState, useEffect } from "react"
import { ExternalLink, X, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TxNotificationProps {
  txHash: string
  onClose: () => void
}

export default function TxNotification({ txHash, onClose }: TxNotificationProps) {
  const [visible, setVisible] = useState(true)

  // Auto-hide after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // Allow fade out animation
    }, 10000)

    return () => {
      clearTimeout(timer)
    }
  }, [onClose])

  const txUrl = `https://basescan.org/tx/${txHash}`

  const openTxLink = () => {
    window.open(txUrl, "_blank")
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ maxWidth: "90vw" }}
    >
      <Alert className="bg-green-900/80 border-green-700 shadow-lg backdrop-blur-sm">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
          <div className="flex-1">
            <AlertDescription className="text-green-100">
              <div className="flex flex-col">
                <span className="font-medium">Transaction submitted!</span>
                <button
                  onClick={openTxLink}
                  className="text-xs text-green-300 hover:text-green-100 mt-1 flex items-center"
                >
                  View on Basescan
                  <ExternalLink className="h-3 w-3 ml-1" />
                </button>
              </div>
            </AlertDescription>
          </div>
          <button onClick={onClose} className="ml-2 text-green-300 hover:text-green-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </Alert>
    </div>
  )
}

