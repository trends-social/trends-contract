// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TrendsLPFarm {
    using SafeERC20 for IERC20;

    IERC20 public lpToken; // The LP token
    IERC20 public trendsToken; // The TRENDS token

    struct Reward {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
    }

    struct Stake {
        uint256 amount;
        uint256 rewardDebt;
    }

    Reward[] public rewards;
    mapping(address => Stake) public stakes;
    uint256 public totalStaked;
    uint256 public accTrendsPerShare; // Accumulated TRENDS tokens per share

    constructor(address _lpToken, address _trendsToken) {
        lpToken = IERC20(_lpToken);
        trendsToken = IERC20(_trendsToken);
    }

    function addReward(uint256 amount, uint256 duration) external {
        trendsToken.safeTransferFrom(msg.sender, address(this), amount);
        updatePool();
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        rewards.push(Reward(amount, startTime, endTime));
    }

    function updatePool() public {
        if (totalStaked == 0) return;

        for (uint256 i = 0; i < rewards.length; i++) {
            Reward storage reward = rewards[i];
            if (block.timestamp >= reward.endTime) continue;

            uint256 multiplier = block.timestamp - reward.startTime;
            uint256 trendsReward = (reward.amount * multiplier) / (reward.endTime - reward.startTime);
            accTrendsPerShare += (trendsReward * 1e12) / totalStaked;
            reward.startTime = block.timestamp;
        }
    }

    function stake(uint256 amount) external {
        updatePool();
        Stake storage stake = stakes[msg.sender];
        if (stake.amount > 0) {
            uint256 pending = ((stake.amount * accTrendsPerShare) / 1e12) - stake.rewardDebt;
            if (pending > 0) {
                trendsToken.safeTransfer(msg.sender, pending);
            }
        }
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
        stake.amount += amount;
        stake.rewardDebt = (stake.amount * accTrendsPerShare) / 1e12;
        totalStaked += amount;
    }

    function unstake(uint256 amount) external {
        updatePool();
        Stake storage stake = stakes[msg.sender];
        require(stake.amount >= amount, "Insufficient staked amount");
        uint256 pending = ((stake.amount * accTrendsPerShare) / 1e12) - stake.rewardDebt;
        if (pending > 0) {
            trendsToken.safeTransfer(msg.sender, pending);
        }
        lpToken.safeTransfer(msg.sender, amount);
        stake.amount -= amount;
        stake.rewardDebt = (stake.amount * accTrendsPerShare) / 1e12;
        totalStaked -= amount;
    }

    function pendingRewards(address user) external view returns (uint256) {
        Stake storage stake = stakes[user];
        uint256 _accTrendsPerShare = accTrendsPerShare;
        if (stake.amount > 0) {
            for (uint256 i = 0; i < rewards.length; i++) {
                Reward storage reward = rewards[i];
                if (block.timestamp >= reward.endTime) continue;
                uint256 multiplier = block.timestamp - reward.startTime;
                uint256 trendsReward = (reward.amount * multiplier) / (reward.endTime - reward.startTime);
                _accTrendsPerShare += (trendsReward * 1e12) / totalStaked;
            }
        }
        return (stake.amount * _accTrendsPerShare / 1e12) - stake.rewardDebt;
    }
}
