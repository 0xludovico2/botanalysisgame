"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useWeb3 } from "@/components/web3-provider"
import { Gift, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RewardsPanelProps {
  onClose?: () => void
  totalScore: number
  onClaimed?: () => void
}

export default function RewardsPanel({ onClose, totalScore, onClaimed }: RewardsPanelProps) {
  const { claimTokens, isConnected, getPlayerPoints, hasClaimedTokens, getTimeUntilNextClaim } = useWeb3()
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0)

  // Calculate token amount based on score (1 point = 1 token)
  const tokenAmount = totalScore

  const handleClaim = async () => {
    if (!isConnected) {
      setClaimError("Please connect your wallet first")
      return
    }

    setIsClaiming(true)
    setClaimError(null)

    try {
      // Check if already claimed
      const alreadyClaimed = await hasClaimedTokens()
      if (alreadyClaimed) {
        const timeLeft = await getTimeUntilNextClaim()
        setTimeUntilNextClaim(timeLeft)

        if (timeLeft > 0) {
          const hoursLeft = Math.floor(timeLeft / 3600)
          const minutesLeft = Math.floor((timeLeft % 3600) / 60)
          setClaimError(`You've already claimed tokens. Try again in ${hoursLeft}h ${minutesLeft}m`)
          setIsClaiming(false)
          return
        }
      }

      // Attempt to claim tokens
      const success = await claimTokens()

      if (success) {
        setClaimSuccess(true)
        // Call the onClaimed callback after a short delay to allow the user to see the success message
        setTimeout(() => {
          if (onClaimed) {
            onClaimed()
          }
        }, 2000)
      } else {
        setClaimError("Failed to claim tokens. Please try again later.")
      }
    } catch (error) {
      setClaimError("An error occurred while claiming tokens")
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-t-lg">
          <CardTitle className="text-center text-white">
            <span className="flex items-center justify-center gap-2">
              <Gift className="h-5 w-5 text-yellow-400" />
              Claim Your $BOT Rewards
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-lg mb-2">
              Your Score: <span className="text-cyan-400 font-bold">{totalScore}</span>
            </p>
            <p className="text-sm text-gray-400 mb-4">You've earned tokens based on your gameplay!</p>

            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <p className="text-2xl font-bold text-cyan-400 mb-2">{tokenAmount} $BOT</p>
              <p className="text-xs text-gray-400">Available to claim</p>
            </div>
          </div>

          {claimSuccess ? (
            <Alert className="bg-green-900/30 border-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400">
                Tokens claimed successfully! Check your wallet.
              </AlertDescription>
            </Alert>
          ) : claimError ? (
            <Alert className="bg-red-900/30 border-red-700">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">{claimError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-between p-4 bg-gray-900 border-t border-gray-800">
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-400 hover:bg-gray-800">
            Close
          </Button>

          <Button
            onClick={handleClaim}
            disabled={isClaiming || claimSuccess || totalScore === 0}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
          >
            {isClaiming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : claimSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Claimed
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Claim Tokens
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

