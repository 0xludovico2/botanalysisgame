"use client"

import { useAuth } from "@/components/farcaster-auth-provider"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function UserProfile() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 bg-gray-800 p-2 rounded-full shadow-md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full overflow-hidden">
          {user.pfpUrl ? (
            <img
              src={user.pfpUrl || "/placeholder.svg"}
              alt={user.displayName || user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <img src="/images/robot-logo.webp" alt="Bot Logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <span className="text-sm font-medium">{user.displayName || user.username}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 rounded-full">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}

