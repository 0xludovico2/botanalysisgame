"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Play, Gift, Dices } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/farcaster-auth-provider"
import { useWeb3 } from "@/components/web3-provider"
import RewardsPanel from "@/components/rewards-panel"

// Eliminar comentarios innecesarios y dejar solo las constantes
const GRID_SIZE = 20
const CELL_SIZE = 20
const INITIAL_SPEED = 150
const MAX_SPEED = 80
const SPEED_DECREASE_RATE = 0.98
const INITIAL_SNAKE = [{ x: 10, y: 10 }]
const MAX_SCORE = 1000
const DEFAULT_MAX_PLAYS_PER_DAY = 3
const VIP_MAX_PLAYS_PER_DAY = 5
const VIP_USERS: string[] = ["vlady"]

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"
type Position = { x: number; y: number }
type GameMode = "normal" | "practice"

export default function SnakeGame() {
  const { user } = useAuth()
  const { isConnected, recordGamePoints } = useWeb3()

  const userId = user?.fid || "guest"
  const username = user?.username || ""

  // Determine maximum plays per day based on user
  const MAX_PLAYS_PER_DAY = VIP_USERS.includes(username) ? VIP_MAX_PLAYS_PER_DAY : DEFAULT_MAX_PLAYS_PER_DAY

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [food, setFood] = useState<Position>({ x: 5, y: 5 })
  const [direction, setDirection] = useState<Direction>("RIGHT")
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0) // Accumulated score
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [playsToday, setPlaysToday] = useState(0)
  const [scoreRate, setScoreRate] = useState(1)
  const [pointsRecorded, setPointsRecorded] = useState(false)
  const [recordingPoints, setRecordingPoints] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [allLivesUsed, setAllLivesUsed] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>("normal")
  const [rewardsClaimed, setRewardsClaimed] = useState(false)
  const directionRef = useRef(direction)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const [foodImage, setFoodImage] = useState<HTMLImageElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoadingLives, setIsLoadingLives] = useState(false)

  // Update the localStorage key to include the user's ID
  // Load game state from localStorage
  useEffect(() => {
    if (!userId) return

    const userKey = `snake_${userId}_`
    const storedPlays = localStorage.getItem(`${userKey}playsToday`)
    const storedDate = localStorage.getItem(`${userKey}playsDate`)
    const storedTotalScore = localStorage.getItem(`${userKey}totalScore`) || "0"
    const storedPointsRecorded = localStorage.getItem(`${userKey}pointsRecorded`) === "true"
    const storedRewardsClaimed = localStorage.getItem(`${userKey}rewardsClaimed`) === "true"
    const currentDate = new Date().toDateString()

    if (storedDate === currentDate && storedPlays) {
      setPlaysToday(Number.parseInt(storedPlays))
      setTotalScore(Number.parseInt(storedTotalScore))
      setPointsRecorded(storedPointsRecorded)
      setRewardsClaimed(storedRewardsClaimed)
    } else {
      // Reset plays and date for a new day
      localStorage.setItem(`${userKey}playsDate`, currentDate)
      localStorage.setItem(`${userKey}playsToday`, "0")
      localStorage.setItem(`${userKey}pointsRecorded`, "false")
      localStorage.setItem(`${userKey}rewardsClaimed`, "false")
      setPlaysToday(0)
      setPointsRecorded(false)
      setRewardsClaimed(false)
      // Don't reset total score when day changes
    }

    // Check if all lives are used
    const noMoreLives =
      storedDate === currentDate && storedPlays ? Number.parseInt(storedPlays) >= MAX_PLAYS_PER_DAY : false
    setAllLivesUsed(noMoreLives)
  }, [userId, MAX_PLAYS_PER_DAY])

  // Update localStorage when plays change
  useEffect(() => {
    if (!userId) return

    const userKey = `snake_${userId}_`
    localStorage.setItem(`${userKey}playsToday`, playsToday.toString())
    localStorage.setItem(`${userKey}totalScore`, totalScore.toString())
    localStorage.setItem(`${userKey}pointsRecorded`, pointsRecorded.toString())
    localStorage.setItem(`${userKey}rewardsClaimed`, rewardsClaimed.toString())

    // Check if all lives are used
    const noMoreLives = playsToday >= MAX_PLAYS_PER_DAY
    setAllLivesUsed(noMoreLives)

    // Show rewards when lives are used up or max points reached
    // Only show rewards when max points are reached (not when lives are used up)
    if (totalScore >= MAX_SCORE) {
      setShowRewards(true)
    }
  }, [playsToday, totalScore, MAX_PLAYS_PER_DAY, userId, isConnected, pointsRecorded])

  // Function to record points to the contract
  const recordPointsToContract = async (points: number): Promise<boolean> => {
    if (!isConnected || points <= 0) return false

    setRecordingPoints(true)
    try {
      const success = await recordGamePoints(points)
      setPointsRecorded(success)

      // If points were recorded successfully, reset the counter
      if (success) {
        const userKey = `snake_${userId}_`
        localStorage.setItem(`${userKey}pointsRecorded`, "true")

        // Show rewards panel after successful recording
        setShowRewards(true)
      }

      return success
    } catch (error) {
      console.error("Error recording total points:", error)
      // Set pointsRecorded to true anyway to allow claiming rewards
      setPointsRecorded(true)
      return true
    } finally {
      setRecordingPoints(false)
    }
  }

  // Load the BOT logo for food
  useEffect(() => {
    const img = new Image()
    img.src = "/images/robot-logo.webp"
    img.onload = () => {
      setFoodImage(img)
    }
    img.crossOrigin = "anonymous"
  }, [])

  // Detect if user is on a mobile device
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

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    // Make sure food doesn't spawn on snake
    const isOnSnake = snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y)
    if (isOnSnake) {
      return generateFood()
    }
    return newFood
  }, [snake])

  // Draw game on canvas
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid lines for better visibility
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 0.5

    // Draw vertical grid lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE)
      ctx.stroke()
    }

    // Draw horizontal grid lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE)
      ctx.stroke()
    }

    // Draw snake with gradient colors
    snake.forEach((segment, index) => {
      // Calculate color based on position in snake
      const isHead = index === 0

      if (isHead) {
        // Draw head with a different color and slight glow
        ctx.fillStyle = gameMode === "practice" ? "#10b981" : "#3b82f6"
        ctx.shadowColor = gameMode === "practice" ? "rgba(16, 185, 129, 0.7)" : "rgba(59, 130, 246, 0.7)"
        ctx.shadowBlur = 10
      } else {
        // Body segments with gradient from head color to tail color
        const gradientPosition = index / snake.length

        if (gameMode === "practice") {
          // Green gradient for practice mode
          const r = Math.floor(16 + gradientPosition * (34 - 16))
          const g = Math.floor(185 + gradientPosition * (197 - 185))
          const b = Math.floor(129 + gradientPosition * (141 - 129))
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        } else {
          // Blue gradient for normal mode
          const r = Math.floor(59 + gradientPosition * (96 - 59))
          const g = Math.floor(130 + gradientPosition * (165 - 130))
          const b = Math.floor(246 + gradientPosition * (250 - 246))
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        }

        ctx.shadowBlur = 0
      }

      // Draw rounded rectangle for each segment
      const radius = isHead ? 8 : 4
      const x = segment.x * CELL_SIZE
      const y = segment.y * CELL_SIZE

      // Draw rounded rectangle for snake segment
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.arcTo(x + CELL_SIZE, y, x + CELL_SIZE, y + CELL_SIZE, radius)
      ctx.arcTo(x + CELL_SIZE, y + CELL_SIZE, x, y + CELL_SIZE, radius)
      ctx.arcTo(x, y + CELL_SIZE, x, y, radius)
      ctx.arcTo(x, y, x + CELL_SIZE, y, radius)
      ctx.closePath()
      ctx.fill()

      // Add a slight border
      ctx.strokeStyle = isHead ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.2)"
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw food (BOT logo)
    if (foodImage) {
      const x = food.x * CELL_SIZE
      const y = food.y * CELL_SIZE

      // Add a subtle glow effect behind the food
      ctx.shadowColor = "rgba(255, 215, 0, 0.6)"
      ctx.shadowBlur = 15

      // Draw a circle behind the BOT logo
      ctx.beginPath()
      ctx.fillStyle = "rgba(255, 215, 0, 0.2)"
      ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      // Reset shadow for the image
      ctx.shadowBlur = 0

      // Draw the BOT logo
      ctx.drawImage(foodImage, x, y, CELL_SIZE, CELL_SIZE)

      // Add a pulsing animation
      const pulseSize = 1 + Math.sin(Date.now() / 300) * 0.1
      ctx.drawImage(
        foodImage,
        x - (CELL_SIZE * pulseSize - CELL_SIZE) / 2,
        y - (CELL_SIZE * pulseSize - CELL_SIZE) / 2,
        CELL_SIZE * pulseSize,
        CELL_SIZE * pulseSize,
      )
    } else {
      // Fallback if image isn't loaded
      ctx.fillStyle = "#f87171"
      ctx.beginPath()
      const centerX = food.x * CELL_SIZE + CELL_SIZE / 2
      const centerY = food.y * CELL_SIZE + CELL_SIZE / 2
      ctx.arc(centerX, centerY, CELL_SIZE / 2, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Draw practice mode indicator
    if (gameMode === "practice") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, 80, 20)
      ctx.fillStyle = "#10b981"
      ctx.font = "12px Arial"
      ctx.fillText("PRACTICE", 10, 15)
    }

    // Draw score in the top right corner
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(canvas.width - 70, 0, 70, 20)
    ctx.fillStyle = "#ffffff"
    ctx.font = "12px Arial"
    ctx.fillText(`Score: ${score}`, canvas.width - 65, 15)
  }, [snake, food, foodImage, gameMode, score])

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameOver || !gameStarted) return

    // Move snake
    const head = { ...snake[0] }
    switch (directionRef.current) {
      case "UP":
        head.y -= 1
        break
      case "DOWN":
        head.y += 1
        break
      case "LEFT":
        head.x -= 1
        break
      case "RIGHT":
        head.x += 1
        break
    }

    // Check if snake hit the wall
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameOver(true)
      saveHighScore()
      return
    }

    // Check if snake hit itself
    if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
      setGameOver(true)
      saveHighScore()
      return
    }

    // Create new snake
    const newSnake = [head, ...snake]

    // Check if snake ate food
    if (head.x === food.x && head.y === food.y) {
      // Increase score
      const newScoreRate = Math.min(10, scoreRate + 0.5)
      setScoreRate(newScoreRate)
      setScore(Math.min(MAX_SCORE, score + Math.ceil(10 * newScoreRate)))

      // Increase speed
      setSpeed((prevSpeed) => Math.max(MAX_SPEED, prevSpeed * SPEED_DECREASE_RATE))

      // Generate new food
      setFood(generateFood())
    } else {
      // Remove tail
      newSnake.pop()
    }

    setSnake(newSnake)
  }, [snake, food, gameOver, gameStarted, score, generateFood, scoreRate])

  // Save high score and accumulate points
  const saveHighScore = async () => {
    if (!userId) return

    const userKey = `snake_${userId}_`
    const currentHighScore = localStorage.getItem(`${userKey}highScore`) || "0"

    if (score > Number.parseInt(currentHighScore)) {
      localStorage.setItem(`${userKey}highScore`, score.toString())
    }

    // Only accumulate points in normal mode
    if (gameMode === "normal") {
      // Accumulate points up to the maximum
      const newTotalScore = Math.min(MAX_SCORE, totalScore + score)
      setTotalScore(newTotalScore)
      localStorage.setItem(`${userKey}totalScore`, newTotalScore.toString())

      // Check if this was the last life and we should record points
      const newPlaysCount = playsToday
      const noMoreLives = newPlaysCount >= MAX_PLAYS_PER_DAY

      // Only record points when game is over AND all lives are used up AND points haven't been recorded yet
      if (noMoreLives && !pointsRecorded && isConnected && newTotalScore > 0) {
        // Don't show rewards panel yet - wait until points are recorded
        setShowRewards(false)
        recordPointsToContract().then(() => {
          // Only show rewards panel after points are successfully recorded
          if (pointsRecorded) {
            setShowRewards(true)
          }
        })
      }
    }
  }

  // Start game loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      drawGame()
      gameLoopRef.current = setTimeout(gameLoop, speed)
    }
    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current)
      }
    }
  }, [gameStarted, gameOver, snake, food, drawGame, gameLoop, speed])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) return

      // Prevent default scrolling behavior for arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case "ArrowUp":
          if (directionRef.current !== "DOWN") {
            setDirection("UP")
            directionRef.current = "UP"
          }
          break
        case "ArrowDown":
          if (directionRef.current !== "UP") {
            setDirection("DOWN")
            directionRef.current = "DOWN"
          }
          break
        case "ArrowLeft":
          if (directionRef.current !== "RIGHT") {
            setDirection("LEFT")
            directionRef.current = "LEFT"
          }
          break
        case "ArrowRight":
          if (directionRef.current !== "LEFT") {
            setDirection("RIGHT")
            directionRef.current = "RIGHT"
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [gameStarted])

  // Start new game
  const startGame = (mode: GameMode = "normal") => {
    // Check if player can play in normal mode (has daily plays left)
    if (mode === "normal" && playsToday >= MAX_PLAYS_PER_DAY) {
      return
    }

    setGameMode(mode)
    setSnake(INITIAL_SNAKE)
    setFood(generateFood())
    setDirection("RIGHT")
    directionRef.current = "RIGHT"
    setGameOver(false)
    setGameStarted(true)
    setScore(0)
    setSpeed(INITIAL_SPEED)
    setScoreRate(1)

    // Only increment plays in normal mode
    if (mode === "normal") {
      // Increment plays immediately to prevent multiple starts
      const newPlaysCount = playsToday + 1
      setPlaysToday(newPlaysCount)

      // Update localStorage immediately
      if (userId) {
        const userKey = `snake_${userId}_`
        localStorage.setItem(`${userKey}playsToday`, newPlaysCount.toString())
      }
    }
  }

  // Handle direction button clicks
  const handleDirectionClick = (newDirection: Direction) => {
    if (!gameStarted) return

    switch (newDirection) {
      case "UP":
        if (directionRef.current !== "DOWN") {
          setDirection("UP")
          directionRef.current = "UP"
        }
        break
      case "DOWN":
        if (directionRef.current !== "UP") {
          setDirection("DOWN")
          directionRef.current = "DOWN"
        }
        break
      case "LEFT":
        if (directionRef.current !== "RIGHT") {
          setDirection("LEFT")
          directionRef.current = "LEFT"
        }
        break
      case "RIGHT":
        if (directionRef.current !== "LEFT") {
          setDirection("RIGHT")
          directionRef.current = "RIGHT"
        }
        break
    }
  }

  // Handle rewards claimed
  const handleRewardsClaimed = () => {
    setRewardsClaimed(true)
    setShowRewards(false)

    // Reset total score after claiming
    setTotalScore(0)
    if (userId) {
      const userKey = `snake_${userId}_`
      localStorage.setItem(`${userKey}totalScore`, "0")
      localStorage.setItem(`${userKey}rewardsClaimed`, "true")
    }
  }

  // Check if player can play
  const canPlay = playsToday < MAX_PLAYS_PER_DAY

  // Determine if user is VIP
  const isVipUser = VIP_USERS.includes(username)

  // Function to show/hide rewards panel
  const toggleRewardsPanel = () => {
    setShowRewards(!showRewards)
  }

  return (
    <>
      <Card className="w-full max-w-md bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-t-lg border-b border-gray-700">
          <CardTitle className="flex justify-between items-center">
            <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Snake Game
            </span>
            <div className="flex items-center gap-2">
              <div className="text-sm font-normal bg-gray-800 px-3 py-1 rounded-full shadow-inner">
                <span>
                  Lives: {playsToday}/{MAX_PLAYS_PER_DAY}
                </span>
                {isVipUser && <span className="ml-2 bg-yellow-600 px-2 py-0.5 rounded-full text-xs">VIP</span>}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6">
          <div className="relative mb-6 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="border border-gray-700 bg-gray-900 rounded-lg"
            />

            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
                {allLivesUsed && rewardsClaimed ? (
                  <div className="flex flex-col items-center gap-3 p-6 bg-gray-800/80 rounded-lg border border-gray-700 shadow-lg">
                    <p className="text-sm text-gray-300 mb-2">All lives used. Practice mode available.</p>
                    <Button
                      onClick={() => startGame("practice")}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                    >
                      <Dices size={16} />
                      Practice Mode
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 bg-gray-800/80 rounded-lg border border-gray-700 shadow-lg">
                    <h3 className="text-xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                      Ready to Play?
                    </h3>
                    <p className="text-sm text-gray-300 mb-2">Collect $BOT tokens and earn rewards!</p>
                    <Button
                      onClick={() => startGame("normal")}
                      disabled={!canPlay}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                    >
                      <Play size={16} />
                      {!canPlay ? "No lives left today" : "Start Game"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 p-6 bg-gray-800/80 rounded-lg border border-gray-700 shadow-lg">
                  <h3 className="text-xl font-bold text-red-400">Game Over!</h3>
                  <p className="text-2xl font-bold mb-2">Score: {score}</p>

                  {gameMode === "normal" && (
                    <p className="text-sm mb-2">
                      Total Accumulated: <span className="text-cyan-400 font-bold">{totalScore}</span>/{MAX_SCORE}
                    </p>
                  )}

                  {gameMode === "practice" ? (
                    <Button
                      onClick={() => startGame("practice")}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                    >
                      <Dices size={16} />
                      Practice Again
                    </Button>
                  ) : allLivesUsed && pointsRecorded ? (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-green-400 mb-2">Points recorded successfully!</p>
                      {rewardsClaimed ? (
                        <Button
                          onClick={() => startGame("practice")}
                          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                        >
                          <Dices size={16} />
                          Practice Mode
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 border-yellow-600 text-yellow-500 hover:bg-yellow-950/30"
                          onClick={toggleRewardsPanel}
                        >
                          <Gift size={16} />
                          Claim Rewards
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      {allLivesUsed && recordingPoints && (
                        <p className="text-sm mb-2 text-blue-400 flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Recording points...
                        </p>
                      )}
                      <Button
                        onClick={() => startGame("normal")}
                        disabled={!canPlay || isLoadingLives}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                      >
                        <Play size={16} />
                        {isLoadingLives ? "Loading..." : !canPlay ? "No lives left today" : "Play Again"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-full mb-4">
            <div className="flex justify-between mb-1">
              <span>Score: {score}</span>
              <span>Rate: {scoreRate.toFixed(1)}x</span>
            </div>
            <Progress value={(score / MAX_SCORE) * 100} className="h-2 bg-gray-700">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${(score / MAX_SCORE) * 100}%` }}
              />
            </Progress>
          </div>

          {gameMode === "normal" && (
            <div className="w-full mb-4">
              <div className="flex justify-between mb-1">
                <span>Total Accumulated:</span>
                <span>
                  {totalScore}/{MAX_SCORE}
                </span>
              </div>
              <Progress value={(totalScore / MAX_SCORE) * 100} className="h-2 bg-gray-700">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${(totalScore / MAX_SCORE) * 100}%` }}
                />
              </Progress>
            </div>
          )}

          {isMobile && (
            <div className="grid grid-cols-3 gap-2 w-36 mt-2">
              <div></div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDirectionClick("UP")}
                disabled={!gameStarted || gameOver}
                className="bg-gray-700 hover:bg-gray-600 border-gray-600"
              >
                <ArrowUp size={16} />
              </Button>
              <div></div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDirectionClick("LEFT")}
                disabled={!gameStarted || gameOver}
                className="bg-gray-700 hover:bg-gray-600 border-gray-600"
              >
                <ArrowLeft size={16} />
              </Button>
              <div></div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDirectionClick("RIGHT")}
                disabled={!gameStarted || gameOver}
                className="bg-gray-700 hover:bg-gray-600 border-gray-600"
              >
                <ArrowRight size={16} />
              </Button>

              <div></div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDirectionClick("DOWN")}
                disabled={!gameStarted || gameOver}
                className="bg-gray-700 hover:bg-gray-600 border-gray-600"
              >
                <ArrowDown size={16} />
              </Button>
              <div></div>
            </div>
          )}
        </CardContent>
      </Card>

      {showRewards && (
        <RewardsPanel onClose={() => setShowRewards(false)} totalScore={totalScore} onClaimed={handleRewardsClaimed} />
      )}
    </>
  )
}

