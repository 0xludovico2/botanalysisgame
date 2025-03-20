"use client"

import { useEffect, useState } from "react"
import Onboard from "@web3-onboard/core"
import injectedModule from "@web3-onboard/injected-wallets"
import walletConnectModule from "@web3-onboard/walletconnect"
import coinbaseModule from "@web3-onboard/coinbase"

const BASE_MAINNET_CHAIN_ID = "0x2105"
const BASE_MAINNET_RPC_URL = "https://mainnet.base.org"

let onboard: any = null

const isMobileDevice = () => {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function useOnboard() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Verificar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
    const mobile = isMobileDevice()
    setIsMobile(mobile)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const initOnboard = async () => {
      if (!onboard) {
        try {
          // Inicializar módulos de billeteras
          const injected = injectedModule()

          // Configurar WalletConnect v2
          const walletConnect = walletConnectModule({
            projectId: "a30e5119f4d21c1bb018ab9db630026d", // Project ID real proporcionado
            dappUrl: typeof window !== "undefined" ? window.location.href : "https://yourapp.com",
          })

          // Configurar Coinbase Wallet
          const coinbase = coinbaseModule()

          // En móviles solo usar WalletConnect, en desktop mostrar todas las opciones
          const wallets = isMobile ? [walletConnect] : [injected, walletConnect, coinbase]

          onboard = Onboard({
            wallets,
            chains: [
              {
                id: BASE_MAINNET_CHAIN_ID,
                token: "ETH",
                label: "Base Mainnet",
                rpcUrl: BASE_MAINNET_RPC_URL,
              },
            ],
            appMetadata: {
              name: "Snake Game with Rewards",
              icon: "/images/robot-logo.webp",
              logo: "/images/robot-logo.webp",
              description: "A fun snake game with Farcaster authentication and token rewards",
              recommendedInjectedWallets: [
                { name: "MetaMask", url: "https://metamask.io" },
                { name: "Coinbase", url: "https://wallet.coinbase.com/" },
              ],
            },
            // Configuración válida para connect
            connect: {
              showSidebar: true,
              disableClose: false,
            },
          })

          setIsInitialized(true)
        } catch (error) {
          console.error("Error initializing web3-onboard:", error)
        }
      } else {
        setIsInitialized(true)
      }
    }

    initOnboard()
  }, [isClient, isMobile])

  return { onboard, isInitialized, isMobile }
}

