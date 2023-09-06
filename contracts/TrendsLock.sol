// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract TrendsLock {
    using SafeERC20 for IERC20;

    error InvalidTime();
    error NoVestedAmount();
    error Ended();
    error TransferAccExists();
    error TransferAmountGt0();

    struct LockVar {
        uint256 amount;
        uint256 startTime;
        uint256 claimedAmount;
    }

    mapping(address => LockVar) public locks;

    IERC20 public immutable TRENDS;
    uint256 public immutable START_TIME;
    uint256 public immutable END_TIME;

    constructor(IERC20 _trends, address _team, uint256 _amount, uint256 _startTime, uint128 _endTime) {
        if (_startTime >= _endTime) revert InvalidTime();
        TRENDS = _trends;
        START_TIME = _startTime;
        END_TIME = _endTime;
        locks[_team] = LockVar(_amount, _startTime, 0);
    }

    function claim() external {
        uint256 claimableAmount = _getClaimableAmount(msg.sender);
        locks[msg.sender].claimedAmount += claimableAmount;
        TRENDS.safeTransfer(msg.sender, claimableAmount);
    }

    function transfer(address to, uint256 amount) external {
        LockVar storage sendLockVar = locks[msg.sender];
        if (block.timestamp >= END_TIME) revert Ended();
        if (locks[to].amount > 0) revert TransferAccExists();
        if (amount == 0) revert TransferAmountGt0();
        // start time gt block timestamp
        if (block.timestamp < sendLockVar.startTime) {
            sendLockVar.amount -= amount;
            locks[to] = LockVar(amount, sendLockVar.startTime, 0);
            return;
        }
        uint256 claimableAmount = _getClaimableAmount(msg.sender);
        sendLockVar.amount = sendLockVar.amount - (sendLockVar.claimedAmount + claimableAmount) - amount;
        sendLockVar.startTime = block.timestamp;
        sendLockVar.claimedAmount = 0;
        locks[to] = LockVar(amount, sendLockVar.startTime, 0);
        TRENDS.safeTransfer(msg.sender, claimableAmount);
    }

    function getClaimableAmount(address account) external view returns (uint256) {
        return _getClaimableAmount(account);
    }

    function _getClaimableAmount(address account) internal view returns (uint256) {
        LockVar memory lockVar = locks[account];
        if (lockVar.amount == 0) revert NoVestedAmount();
        uint256 unlockAmount = Math.min(lockVar.amount, (lockVar.amount * (block.timestamp - lockVar.startTime)) / (END_TIME - lockVar.startTime));
        uint256 claimableAmount = unlockAmount - lockVar.claimedAmount;
        return claimableAmount;
    }
}
