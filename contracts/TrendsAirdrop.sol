// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TrendsSharesV1.sol";


contract TrendsAirdrop {
    using SafeERC20 for IERC20;

    IERC20 public trendsToken;
    bytes32 public merkleRoot;

    TrendsSharesV1 private trendsShare;

    // Vesting configuration
    uint256 public constant VESTING_PERIOD = 30 days;
    uint256 public constant BLOCKS_PER_DAY = 6500; // Approximation

    // Airdrop configuration
    uint256 public deadline;
    uint256 public constant MAX_CLAIMABLE_ADDRESSES = 5000;
    uint256 public claimedAddressesCount;

    // Vesting structure
    struct Vesting {
        uint256 amount;
        uint256 startBlock;
        uint256 claimedAmount;
    }

    mapping(address => Vesting) public vesting;

    // Events
    event VestingStarted(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(TrendsSharesV1 _trendsShare, address _trendsToken, bytes32 _merkleRoot, uint256 _deadline) {
        trendsToken = IERC20(_trendsToken);
        merkleRoot = _merkleRoot;
        deadline = _deadline;
        trendsShare = _trendsShare;
    }

    function claim(bytes32[] calldata proof, bytes32 chatroomId, uint256 amount) external {
        require(block.timestamp < deadline, "Claim period has ended");
        require(trendsShare.sharesBalance(chatroomId, msg.sender) > 0, "Must hold a share of chatroom");
        require(claimedAddressesCount < MAX_CLAIMABLE_ADDRESSES, "Max claims reached");

        // Verify the Merkle proof
        bytes32 node = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(proof, merkleRoot, node), "Invalid proof");

        // Initialize or update vesting
        Vesting storage v = vesting[msg.sender];
        v.amount += amount;
        v.startBlock = block.number;

        claimedAddressesCount++;

        emit VestingStarted(msg.sender, amount);
    }

    function claimVestedAirdrop() external {
        Vesting storage v = vesting[msg.sender];
        require(v.amount > 0, "No vested amount");

        uint256 blocksSinceStart = block.number - v.startBlock;
        uint256 vestedAmount = (v.amount * blocksSinceStart) / (BLOCKS_PER_DAY * VESTING_PERIOD / 1 days);

        uint256 claimableAmount = vestedAmount - v.claimedAmount;
        require(claimableAmount > 0, "No claimable amount");

        v.claimedAmount += claimableAmount;

        trendsToken.safeTransfer(msg.sender, claimableAmount);

        emit Claimed(msg.sender, claimableAmount);
    }
}