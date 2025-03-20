"use client"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/components/web3-provider"
import { useAuth } from "@/components/farcaster-auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, AlertTriangle, Info, Loader2, Smartphone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function WalletConnect() {
  const { user } = useAuth()
  const {
    account,
    connectWallet,
    disconnectWallet,
    checkFarcasterLinkStatus,
    isConnected,
    isCorrectNetwork,
    switchToBaseSepoliaNetwork,
    tokenBalance,
    isFarcasterLinked,
    isInitialized,
    isMobile,
  } = useWeb3()

  const [isChecking, setIsChecking] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Check if account is already linked
  useEffect(() => {
    if (isConnected && user && user.fid) {
      checkLinkStatus()
    }
  }, [isConnected, user, isCorrectNetwork])

  // Check link status
  const checkLinkStatus = async () => {
    if (!user || !user.fid || !isConnected || !isCorrectNetwork) return

    setIsChecking(true)
    try {
      await checkFarcasterLinkStatus(user.fid)
    } catch (error) {
      console.error("Error checking link status:", error)
    } finally {
      setIsChecking(false)
    }
  }

  // Handle wallet connection
  const handleConnectWallet = async () => {
    if (!isInitialized) {
      return
    }

    setIsConnecting(true)
    try {
      await connectWallet()
    } catch (error) {
      console.error("Error connecting wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Handle network switching
  const handleSwitchNetwork = async () => {
    if (!isInitialized) {
      return
    }

    setIsSwitching(true)
    try {
      await switchToBaseSepoliaNetwork()
    } catch (error) {
      console.error("Error switching network:", error)
    } finally {
      setIsSwitching(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <Card className="w-full max-w-md bg-gray-800 border-gray-700 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Connection
          {isMobile && <Smartphone className="h-4 w-4 text-blue-400" />}
        </CardTitle>
        <CardDescription>Connect your wallet to claim rewards based on your game points</CardDescription>
      </CardHeader>
      <CardContent>
        {!isInitialized ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-400">Initializing wallet connection...</p>
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-400">
              {isMobile
                ? "Connect your wallet to claim tokens. You'll be redirected to your wallet app."
                : "Connect your wallet to claim tokens based on your game points."}
            </p>
            <Button onClick={handleConnectWallet} className="w-full" disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {isMobile && <Smartphone className="mr-2 h-4 w-4" />}
                  Connect Wallet
                </>
              )}
            </Button>

            {isMobile && (
              <Alert className="bg-gray-700 border-gray-600 mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    You'll be redirected to your wallet app. Return to this app after connecting.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : !isCorrectNetwork ? (
          <div className="flex flex-col items-center gap-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are not connected to Base Sepolia Testnet. Please switch networks to continue.
              </AlertDescription>
            </Alert>
            <Button onClick={handleSwitchNetwork} className="w-full" disabled={isSwitching}>
              {isSwitching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                "Switch to Base Sepolia"
              )}
            </Button>

            {isMobile && (
              <Alert className="bg-gray-700 border-gray-600 mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    You'll be redirected to your wallet app. Return to this app after switching networks.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Connected Account</span>
                <span className="text-sm font-mono">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">$Bot Balance</span>
                <span className="text-sm font-mono">{Number.parseFloat(tokenBalance).toFixed(2)} $Bot</span>
              </div>
            </div>

            {isConnected && (
              <Alert className="bg-gray-700 border-gray-600 mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">To claim tokens, your wallet must be linked to your Farcaster account.</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      {isConnected && isInitialized && (
        <CardFooter>
          <Button variant="outline" onClick={disconnectWallet} className="w-full">
            Disconnect Wallet
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

