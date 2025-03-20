// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SnakeGameSimple is Ownable {
    // Token contract
    IERC20 public botToken;
    
    // Maximum tokens a player can claim
    uint256 public constant MAX_PLAYER_TOKENS = 1000;
    
    // Cooldown period between claims (24 hours)
    uint256 public constant CLAIM_COOLDOWN = 24 hours;
    
    // Player data
    mapping(address => uint256) public playerPoints;
    mapping(address => uint256) public lastClaimTime;
    
    // Events
    event PointsRecorded(address indexed player, uint256 points);
    event TokensClaimed(address indexed player, uint256 amount);
    
    constructor(address _botToken) Ownable(msg.sender) {
        botToken = IERC20(_botToken);
    }
    
    /**
     * @dev Record points for a player
     * @param points The number of points to record
     */
    function recordPoints(uint256 points) external {
        playerPoints[msg.sender] = points;
        emit PointsRecorded(msg.sender, points);
    }
    
    /**
     * @dev Check if a player can claim tokens
     * @param player The address of the player
     * @return Whether the player can claim tokens
     */
    function canClaimTokens(address player) public view returns (bool) {
        return playerPoints[player] > 0 && 
               (lastClaimTime[player] == 0 || 
                block.timestamp >= lastClaimTime[player] + CLAIM_COOLDOWN);
    }
    
    /**
     * @dev Get time until next claim is available
     * @param player The address of the player
     * @return Seconds until next claim (0 if can claim now)
     */
    function timeUntilNextClaim(address player) public view returns (uint256) {
        if (lastClaimTime[player] == 0) return 0;
        
        uint256 nextClaimTime = lastClaimTime[player] + CLAIM_COOLDOWN;
        if (block.timestamp >= nextClaimTime) return 0;
        
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @dev Claim tokens based on recorded points
     */
    function claimTokens() external {
        require(canClaimTokens(msg.sender), "Cannot claim tokens yet");
        
        uint256 points = playerPoints[msg.sender];
        require(points > 0, "No points to claim");
        
        // Cap at MAX_PLAYER_TOKENS
        uint256 tokenAmount = points > MAX_PLAYER_TOKENS ? MAX_PLAYER_TOKENS : points;
        
        // Update claim time
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Reset points after claiming
        playerPoints[msg.sender] = 0;
        
        // Transfer tokens
        require(botToken.transfer(msg.sender, tokenAmount * 10**18), "Token transfer failed");
        
        emit TokensClaimed(msg.sender, tokenAmount);
    }
    
    /**
     * @dev Reset claim status for a player (admin only)
     * @param player The address of the player
     */
    function resetClaimStatus(address player) external onlyOwner {
        lastClaimTime[player] = 0;
    }
    
    /**
     * @dev Set player points directly (admin only)
     * @param player The address of the player
     * @param points The number of points to set
     */
    function setPlayerPoints(address player, uint256 points) external onlyOwner {
        playerPoints[player] = points;
        emit PointsRecorded(player, points);
    }
    
    /**
     * @dev Withdraw tokens from the contract (admin only)
     * @param amount The amount of tokens to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(botToken.transfer(owner(), amount), "Token transfer failed");
    }
}

