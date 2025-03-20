"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createAppClient } from "@farcaster/auth-client"

type User = {
  fid: string
  username: string
  displayName?: string
  pfpUrl?: string
  bio?: string
  isAuthenticated: boolean
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  logout: () => void
  setUser: (user: User | null) => void
  appClient: any
}

const initialUser: User | null = null

const AuthContext = createContext<AuthContextType>({
  user: initialUser,
  isLoading: true,
  logout: () => {},
  setUser: () => {},
  appClient: null,
})

export function FarcasterAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(true)
  const [appClient, setAppClient] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const client = createAppClient({
          relay: "https://relay.farcaster.xyz",
          ethereum: undefined,
          timeout: 60000,
          domain: window.location.host,
          siweUri: window.location.origin,
        })
        setAppClient(client)
      } catch (error) {
        console.error("Error initializing Farcaster AppClient:", error)
      }
    }
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem("farcasterUser")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Failed to parse stored user", error)
        localStorage.removeItem("farcasterUser")
      }
    }
    setIsLoading(false)
  }, [])

  const logout = () => {
    setUser(null)
    localStorage.removeItem("farcasterUser")
  }

  return <AuthContext.Provider value={{ user, isLoading, logout, setUser, appClient }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

