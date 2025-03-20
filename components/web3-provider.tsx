"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import SnakeGameSimpleABI from "../app/contracts/SnakeGameSimple.json"
import BotTokenABI from "../app/contracts/BotAnalysisToken.json"
import { useOnboard } from "./web3-onboard-client"
import TxNotification from "./tx-notification"

const GAME_CONTRACT_ADDRESS = "0x0cb40EFDa684775cF8c3396402C4919708a22C2B"
const BOT_TOKEN_ADDRESS = "0x174fD685E17233BE891d24BB5940D4C0601e3cE7"
const BASE_MAINNET_CHAIN_ID = "0x2105"

// Utility function for exponential backoff retry
const retry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 1000, backoff = 2): Promise<T> => {
  try {
    return await fn()
  } catch (error: any) {
    // Check if it's a rate limit error (429)
    const isRateLimit = error?.code === -32603 && error?.message?.includes("429")

    // If it's a rate limit error and there are retries left
    if (isRateLimit && retries > 0) {
      console.log(`Rate limit reached. Retrying in ${delay}ms... (${retries} attempts remaining)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return retry(fn, retries - 1, delay * backoff, backoff)
    }

    // If it's not a rate limit error or no retries left, propagate the error
    throw error
  }
}

type Transaction = {
  hash: string
  description: string
  timestamp: number
}

type Web3ContextType = {
  account: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  claimTokens: () => Promise<boolean>
  getPlayerPoints: () => Promise<number>
  hasClaimedTokens: () => Promise<boolean>
  recordGamePoints: (points: number) => Promise<boolean>
  getTimeUntilNextClaim: () => Promise<number>
  tokenBalance: string
  isConnected: boolean
  isCorrectNetwork: boolean
  switchToBaseMainnetNetwork: () => Promise<void>
  isInitialized: boolean
  isMobile: boolean
  transactions: Transaction[]
  dismissTransaction: (hash: string) => void
}

const defaultContext: Web3ContextType = {
  account: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  claimTokens: async () => false,
  getPlayerPoints: async () => 0,
  hasClaimedTokens: async () => false,
  recordGamePoints: async () => false,
  getTimeUntilNextClaim: async () => 0,
  tokenBalance: "0",
  isConnected: false,
  isCorrectNetwork: false,
  switchToBaseMainnetNetwork: async () => {},
  isInitialized: false,
  isMobile: false,
  transactions: [],
  dismissTransaction: () => {},
}

const Web3Context = createContext<Web3ContextType>(defaultContext)

export function Web3Provider({ children }: { children: ReactNode }) {
  const { onboard, isInitialized, isMobile } = useOnboard()

  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [gameContract, setGameContract] = useState<ethers.Contract | null>(null)
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null)
  const [tokenBalance, setTokenBalance] = useState("0")
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [wallets, setWallets] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Check if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Subscribe to wallet connection events
  useEffect(() => {
    if (!isClient || !onboard || !isInitialized) return

    const walletsSub = onboard.state.select("wallets")
    const { unsubscribe } = walletsSub.subscribe((newWallets: any[]) => {
      if (newWallets.length === 0) {
        setAccount(null)
        setProvider(null)
        setIsCorrectNetwork(false)
        return
      }

      setWallets(newWallets)

      if (newWallets[0] && newWallets[0].accounts && newWallets[0].accounts.length > 0) {
        setAccount(newWallets[0].accounts[0].address)

        // Check if connected to Base Mainnet
        const chainId = newWallets[0].chains[0]?.id
        const isOnBaseMainnet = chainId === BASE_MAINNET_CHAIN_ID
        setIsCorrectNetwork(isOnBaseMainnet)

        // Create ethers provider
        if (newWallets[0].provider) {
          try {
            const ethersProvider = new ethers.BrowserProvider(newWallets[0].provider, "any")
            setProvider(ethersProvider)
          } catch (error) {
            console.error("Error creating ethers provider:", error)
          }
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [onboard, isInitialized, isClient])

  // Initialize contracts when provider and account are available
  useEffect(() => {
    if (!isClient || !provider || !account || !isCorrectNetwork) return

    const initContracts = async () => {
      try {
        await initializeContracts()
      } catch (error) {
        console.error("Failed to initialize contracts:", error)
      }
    }

    initContracts()
  }, [provider, account, isCorrectNetwork, isClient])

  // Update token balance when contracts or account change
  useEffect(() => {
    if (!isClient || !tokenContract || !account || !isCorrectNetwork) return

    const fetchBalance = async () => {
      try {
        await updateTokenBalance()
      } catch (error) {
        console.error("Failed to update token balance:", error)
      }
    }

    fetchBalance()

    // Set interval to update balance periodically
    const intervalId = setInterval(fetchBalance, 10000) // Every 10 seconds

    return () => clearInterval(intervalId)
  }, [tokenContract, account, isCorrectNetwork, isClient])

  // Initialize contracts
  const initializeContracts = async () => {
    if (!provider || !account) return

    try {
      // Get signer safely
      let signer
      try {
        signer = await provider.getSigner()
      } catch (signerError) {
        console.error("Error getting signer:", signerError)
        throw new Error("Could not get signer")
      }

      // Initialize game contract with error handling
      try {
        const game = new ethers.Contract(GAME_CONTRACT_ADDRESS, SnakeGameSimpleABI.abi || SnakeGameSimpleABI, signer)
        setGameContract(game)
      } catch (gameError) {
        console.error("Error initializing game contract:", gameError)
        throw new Error("Error initializing game contract")
      }

      // Initialize token contract with error handling
      try {
        const token = new ethers.Contract(BOT_TOKEN_ADDRESS, BotTokenABI.abi || BotTokenABI, signer)
        setTokenContract(token)
      } catch (tokenError) {
        console.error("Error initializing token contract:", tokenError)
        throw new Error("Error initializing token contract")
      }
    } catch (error) {
      console.error("Error initializing contracts:", error instanceof Error ? error.message : "Unknown error")
    }
  }

  // Add transaction to the list
  const addTransaction = (hash: string, description: string) => {
    const newTx = {
      hash,
      description,
      timestamp: Date.now(),
    }

    setTransactions((prev) => [newTx, ...prev].slice(0, 5)) // Keep only the 5 most recent transactions
  }

  // Dismiss transaction notification
  const dismissTransaction = (hash: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.hash !== hash))
  }

  // Update token balance
  const updateTokenBalance = async () => {
    if (!tokenContract || !account) return

    try {
      const balance = await tokenContract.balanceOf(account)
      const formattedBalance = ethers.formatEther(balance)
      setTokenBalance(formattedBalance)
    } catch (error) {
      console.error("Error getting token balance:", error)
      // Set a default value instead of failing
      setTokenBalance("0")
    }
  }

  // Connect wallet using web3-onboard
  const connectWallet = async () => {
    if (!isClient || !onboard || !isInitialized) {
      console.error("Web3-onboard not initialized")
      return
    }

    try {
      const connectedWallets = await onboard.connectWallet()

      if (connectedWallets.length > 0) {
        // Check if connected to Base Mainnet
        const chainId = connectedWallets[0].chains[0]?.id
        if (chainId !== BASE_MAINNET_CHAIN_ID) {
          await switchToBaseMainnetNetwork()
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
    }
  }

  // Disconnect wallet
  const disconnectWallet = async () => {
    if (!isClient || !onboard || !isInitialized || wallets.length === 0) return

    try {
      await onboard.disconnectWallet({ label: wallets[0].label })
      setAccount(null)
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    }
  }

  // Switch to Base Mainnet network
  const switchToBaseMainnetNetwork = async () => {
    if (!isClient || !onboard || !isInitialized || wallets.length === 0) return

    try {
      await onboard.setChain({ chainId: BASE_MAINNET_CHAIN_ID })
    } catch (error) {
      console.error("Error switching to Base Mainnet:", error)
    }
  }

  // Claim tokens
  const claimTokens = async () => {
    if (!isClient || !gameContract || !account) return false

    try {
      // Use retry system
      const tx = await retry(
        async () => {
          // Configure gas options to avoid issues
          const gasEstimate = await gameContract.claimTokens.estimateGas()
          const gasLimit = Math.floor(Number(gasEstimate) * 1.2) // 20% extra

          return gameContract.claimTokens({
            gasLimit: gasLimit,
          })
        },
        3,
        2000,
      )

      // Add transaction to notifications
      addTransaction(tx.hash, "Claim $BOT Tokens")

      // Show waiting message
      await tx.wait()

      updateTokenBalance()
      return true
    } catch (error: any) {
      // Improve error message for user
      console.error("Error claiming tokens:", error)

      // Provide more descriptive error messages
      if (error?.code === -32603 && error?.message?.includes("429")) {
        console.error("Network is congested. Please wait a few minutes and try again.")
      } else if (error?.message?.includes("insufficient funds")) {
        console.error("You don't have enough ETH to pay for the transaction.")
      } else if (error?.message?.includes("user rejected")) {
        console.error("Transaction rejected by user.")
      }

      return false
    }
  }

  // Check if player has claimed tokens
  const hasClaimedTokens = async () => {
    if (!isClient || !gameContract || !account) return false

    try {
      // Try to get time until next claim
      const timeUntilNext = await gameContract.timeUntilNextClaim(account)

      // Check if the contract has the canClaimTokens function
      let canClaim = false
      try {
        canClaim = await gameContract.canClaimTokens(account)
      } catch (funcError) {
        console.error("Error checking canClaimTokens:", funcError)
        // Alternative logic if the function doesn't exist
        const points = await gameContract.playerPoints(account)
        canClaim = Number(points) > 0 && Number(timeUntilNext) === 0
      }

      return !canClaim
    } catch (error) {
      console.error("Error checking if player can claim tokens:", error)
      return false
    }
  }

  // Get time until next claim
  const getTimeUntilNextClaim = async () => {
    if (!isClient || !gameContract || !account) return 0

    try {
      const timeUntilNext = await gameContract.timeUntilNextClaim(account)
      return Number(timeUntilNext)
    } catch (error) {
      console.error("Error getting time until next claim:", error)
      return 0
    }
  }

  // Get player points
  const getPlayerPoints = async () => {
    if (!isClient || !gameContract || !account) return 0

    try {
      const points = await gameContract.playerPoints(account)
      return Number(ethers.formatUnits(points, 0))
    } catch (error) {
      console.error("Error getting player points:", error)
      return 0
    }
  }

  // Record game points directly to contract
  const recordGamePoints = async (points: number) => {
    if (!isClient || !gameContract || !account) {
      console.log("Cannot record points: missing client, contract or account")
      return false
    }

    try {
      // Use recordPoints function from the new contract
      const tx = await gameContract.recordPoints(points)

      // Add transaction to notifications
      addTransaction(tx.hash, `Record ${points} Game Points`)

      await tx.wait()
      return true
    } catch (error) {
      console.error("Error recording points on contract:", error)

      // Save points locally as fallback
      const userKey = `snake_${account}_contractPoints`
      localStorage.setItem(userKey, points.toString())

      return false
    }
  }

  // If we're not on the client, return the default context
  if (!isClient) {
    return <Web3Context.Provider value={defaultContext}>{children}</Web3Context.Provider>
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        connectWallet,
        disconnectWallet,
        claimTokens,
        getPlayerPoints,
        hasClaimedTokens,
        recordGamePoints,
        getTimeUntilNextClaim,
        tokenBalance,
        isConnected: !!account,
        isCorrectNetwork,
        switchToBaseMainnetNetwork,
        isInitialized,
        isMobile,
        transactions,
        dismissTransaction,
      }}
    >
      {children}
      {transactions.map((tx) => (
        <TxNotification key={tx.hash} txHash={tx.hash} onClose={() => dismissTransaction(tx.hash)} />
      ))}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => useContext(Web3Context)

