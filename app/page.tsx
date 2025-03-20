"use client"

import { useAuth } from "@/components/farcaster-auth-provider"
import LoginScreen from "@/components/login-screen"
import SnakeGame from "@/components/snake-game"
import UserProfile from "@/components/user-profile"
import WalletConnect from "@/components/wallet-connect"
import { Web3Provider } from "@/components/web3-provider"

export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="animate-spin h-8 w-8 border-4 border-t-primary rounded-full"></div>
        <p className="mt-4">Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="flex items-center gap-3 mb-6">
        <img src="/images/robot-logo.webp" alt="Bot Logo" className="w-10 h-10" />
        <h1 className="text-3xl font-bold">$Bot Analysis Game</h1>
      </div>

      {!user ? (
        <LoginScreen />
      ) : (
        <Web3Provider>
          <UserProfile />
          <div className="w-full max-w-md flex flex-col items-center">
            <WalletConnect />
            <SnakeGame />
          </div>
        </Web3Provider>
      )}
    </main>
  )
}

