"use client"

import { useAuth } from "@/components/farcaster-auth-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Info, Loader2, RefreshCcw } from "lucide-react"
import { useState, useEffect } from "react"
import QRCode from "react-qr-code"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginScreen() {
  const { isLoading, setUser, appClient } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [channelToken, setChannelToken] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      )
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [statusCheckInterval, timeoutId])

  const handleSignIn = async () => {
    if (!appClient) {
      setError("Authentication client not initialized. Please try again later.")
      return
    }

    setSigningIn(true)
    setError(null)
    setDebugInfo(null)
    setCheckCount(0)
    setStatusMessage("Creating authentication channel...")

    try {
      const currentUrl = window.location.origin
      const createChannelResponse = await appClient.createChannel({
        siweUri: currentUrl,
        domain: window.location.host,
        callbackUrl: currentUrl,
      })

      setDebugInfo(`Channel created: ${JSON.stringify(createChannelResponse).substring(0, 100)}...`)

      let token = null
      if (createChannelResponse?.data?.channelToken) {
        token = createChannelResponse.data.channelToken
      } else if (createChannelResponse?.channelToken) {
        token = createChannelResponse.channelToken
      }

      if (!token) {
        throw new Error("Failed to create authentication channel")
      }

      setChannelToken(token)

      let qrUrl
      let deepLink

      if (createChannelResponse.data?.url) {
        qrUrl = createChannelResponse.data.url
        deepLink = createChannelResponse.data.url
      } else if (createChannelResponse.url) {
        qrUrl = createChannelResponse.url
        deepLink = createChannelResponse.url
      } else {
        qrUrl = `https://client.warpcast.com/deeplinks/auth-token?token=${token}`
        deepLink = `https://client.warpcast.com/deeplinks/auth-token?token=${token}`
      }

      setQrCodeUrl(qrUrl)

      if (isMobile) {
        setStatusMessage("Click the button below to open Farcaster")
        setTimeout(() => {
          window.location.href = deepLink
        }, 1500)
      } else {
        setStatusMessage("Scan the QR code with your Farcaster app")
      }

      let completed = false
      const intervalId = setInterval(async () => {
        try {
          if (!appClient || !token) {
            clearInterval(intervalId)
            return
          }

          setCheckCount((prev) => prev + 1)
          const statusResponse = await appClient.status({ channelToken: token })

          setDebugInfo(`Check #${checkCount + 1}: ${JSON.stringify(statusResponse).substring(0, 100)}...`)

          const isCompleted = statusResponse?.data?.state === "completed" || statusResponse?.state === "completed"

          if (isCompleted) {
            clearInterval(intervalId)
            completed = true

            const userData = statusResponse.data || statusResponse

            const newUser = {
              fid: userData.fid ? userData.fid.toString() : "unknown",
              username: userData.username || "farcaster_user",
              displayName: userData.displayName,
              pfpUrl: userData.pfpUrl,
              bio: userData.bio,
              isAuthenticated: true,
            }

            localStorage.setItem("farcasterUser", JSON.stringify(newUser))
            setUser(newUser)

            setStatusMessage("Authentication successful!")
            setTimeout(() => {
              setSigningIn(false)
              setQrCodeUrl(null)
              setChannelToken(null)
              setStatusMessage(null)
              setDebugInfo(null)
            }, 1000)
          }
        } catch (error) {
          console.error("Error checking status:", error)
          setDebugInfo(`Error in check #${checkCount + 1}: ${error}`)
        }
      }, 2000)

      setStatusCheckInterval(intervalId)

      const timeout = setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId)
          if (!completed) {
            setError("Authentication timed out. Please try again.")
            setSigningIn(false)
            setQrCodeUrl(null)
          }
        }
      }, 120000)

      setTimeoutId(timeout)
    } catch (error: any) {
      console.error("Error signing in:", error)
      setError(error.message || "Failed to sign in with Farcaster. Please try again.")
      setSigningIn(false)
      setQrCodeUrl(null)
      setChannelToken(null)
      setStatusMessage(null)
      setDebugInfo(`Error: ${error.message || "Unknown"}`)
    }
  }

  const openFarcasterApp = () => {
    if (qrCodeUrl) {
      window.location.href = qrCodeUrl
    }
  }

  return (
    <Card className="w-full max-w-md bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-center">Play to earn.</CardTitle>
        <CardDescription className="text-center">Connect your Farcaster account to play</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full overflow-hidden">
          <img src="/images/farcaster-logo.png" alt="Farcaster Logo" className="w-full h-full object-cover" />
        </div>

        {qrCodeUrl && !isMobile && (
          <div className="bg-white p-4 rounded-lg">
            <QRCode value={qrCodeUrl} size={200} />
            <p className="text-center text-black mt-2 text-sm">Scan with Farcaster app</p>
          </div>
        )}

        {qrCodeUrl && isMobile && (
          <div className="w-full">
            <Button
              onClick={openFarcasterApp}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              Open Farcaster App
            </Button>
            <p className="text-center text-sm mt-2 text-gray-400">Click the button above to open the Farcaster app</p>
          </div>
        )}

        {!qrCodeUrl && (
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">Authentication Required</h3>
            <p className="text-sm text-gray-400">
              You need to connect your Farcaster account to play the game. This ensures one game per account.
            </p>
            {statusMessage && <p className="text-sm text-blue-400 mt-2">{statusMessage}</p>}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {debugInfo && checkCount > 5 && (
          <Alert className="mt-4 bg-gray-900 border-gray-700 text-xs">
            <Info className="h-4 w-4" />
            <AlertDescription className="font-mono break-all">
              Status: {checkCount} checks
              <br />
              {debugInfo}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4">
        {!qrCodeUrl && (
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSignIn}
            disabled={signingIn || !appClient}
          >
            {signingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>Connect with Farcaster</>
            )}
          </Button>
        )}

        {qrCodeUrl && (
          <Button variant="outline" onClick={handleSignIn} className="w-full flex items-center justify-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Restart connection
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

