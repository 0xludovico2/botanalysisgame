const { ethers } = require("hardhat")

async function main() {
  const BOT_TOKEN_ADDRESS = "0x174fD685E17233BE891d24BB5940D4C0601e3cE7"

  console.log("Deploying SnakeGameSimple contract...")

  // Deploy the contract
  const SnakeGameSimple = await ethers.getContractFactory("SnakeGameSimple")
  const snakeGameSimple = await SnakeGameSimple.deploy(BOT_TOKEN_ADDRESS)

  await snakeGameSimple.deployed()

  console.log("SnakeGameSimple deployed to:", snakeGameSimple.address)
  console.log("Using BOT token at:", BOT_TOKEN_ADDRESS)

  console.log("Verifying contract on Etherscan...")
  console.log("npx hardhat verify --network base", snakeGameSimple.address, BOT_TOKEN_ADDRESS)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

