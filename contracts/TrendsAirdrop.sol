// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TrendsSharesV1} from "./TrendsSharesV1.sol";

contract TrendsAirdrop {
    using SafeERC20 for IERC20;

    error ClaimEnded();
    error NotCreator();
    error NotShareHolder();
    error InvalidProof();
    error NoVestedAmount();
    error NoClaimableAmount();
    error OnlyClaimOnceAllowed();

    IERC20 public immutable trendsToken;
    bytes32 public immutable merkleRoot;

    TrendsSharesV1 private immutable trendsShare;

    // Vesting configuration
    uint256 public immutable vestingBlocks;

    // Airdrop configuration
    uint256 public claimed;
    uint256 public maxToClaim;

    // Vesting structure
    struct Vesting {
        uint256 amount70;
        uint256 amount30;
        uint256 startBlock70;
        uint256 startBlock30;
        uint256 claimedAmount;
    }

    mapping(address => Vesting) public vesting;

    // Events
    event Vesting70Started(address indexed user, uint256 amount);
    event Vesting30Started(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(
        TrendsSharesV1 _trendsShare,
        address _trendsToken,
        bytes32 _merkleRoot,
        uint256 _maxToClaim,
        uint256 _vestingPeriod,
        uint256 _blockPerPeriod
    ) {
        trendsToken = IERC20(_trendsToken);
        merkleRoot = _merkleRoot;
        trendsShare = _trendsShare;
        maxToClaim = _maxToClaim;
        vestingBlocks = _vestingPeriod * _blockPerPeriod;
    }

    function claim70(bytes32[] calldata proof, uint256 amount, bytes32 subject) external {
        if (claimed >= maxToClaim) revert ClaimEnded();
        if (trendsShare.sharesCreator(subject) != msg.sender) revert NotCreator();

        // Verify the Merkle proof
        bytes32 node = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verify(proof, merkleRoot, node)) revert InvalidProof();

        // Initialize or update vesting
        Vesting storage v = vesting[msg.sender];
        if (v.amount70 != 0) revert OnlyClaimOnceAllowed();

        amount = amount * 70 / 100;
        // Claim the rest if reaching maxToClaim
        if ((amount) + claimed > maxToClaim) {
            amount = maxToClaim - claimed;
        }
        v.amount70 = amount;
        v.startBlock70 = block.number;

        claimed += amount;

        emit Vesting70Started(msg.sender, amount);
    }

    function claim30(
        bytes32 subject,
        bytes32[] calldata creatorProof,
        uint256 creatorAmount,
        address holder,
        bytes32[] calldata holderProof,
        uint256 holderAmount
    )
    external {
        if (claimed >= maxToClaim) revert ClaimEnded();
        if (trendsShare.sharesCreator(subject) != msg.sender) revert NotCreator();
        if (trendsShare.sharesBalance(subject, holder) == 0) revert NotShareHolder();

        // Verify the Creator Merkle proof
        bytes32 node = keccak256(abi.encodePacked(msg.sender, creatorAmount));
        if (!MerkleProof.verify(creatorProof, merkleRoot, node)) revert InvalidProof();

        // Verify the Holder Merkle proof
        node = keccak256(abi.encodePacked(holder, holderAmount));
        if (!MerkleProof.verify(holderProof, merkleRoot, node)) revert InvalidProof();

        // Initialize or update vesting
        Vesting storage v = vesting[msg.sender];
        if (v.amount30 != 0) revert OnlyClaimOnceAllowed();

        creatorAmount = creatorAmount * 30 / 100;

        // Claim the rest if reaching maxToClaim
        if (creatorAmount + claimed > maxToClaim) {
            creatorAmount = maxToClaim - claimed;
        }
        v.amount30 = creatorAmount;
        v.startBlock30 = block.number;

        claimed += creatorAmount;

        emit Vesting30Started(msg.sender, creatorAmount);
    }

    function claimable(address recipient) external view returns (uint256) {
        Vesting memory v = vesting[recipient];
        if (v.amount70 == 0 && v.amount30 == 0) return 0;
        uint256 blocksSince70Start = block.number - v.startBlock70;
        uint256 vested70Amount = min(v.amount70, (v.amount70 * blocksSince70Start) / vestingBlocks);

        uint256 blocksSince30Start = block.number - v.startBlock30;
        uint256 vested30Amount = min(v.amount30, (v.amount30 * blocksSince30Start) / vestingBlocks);

        return vested70Amount + vested30Amount - v.claimedAmount;
    }

    function claimVestedAirdrop() external {
        Vesting storage v = vesting[msg.sender];
        if (v.amount70 == 0 && v.amount30 == 0) revert NoVestedAmount();

        uint256 blocksSince70Start = block.number - v.startBlock70;
        uint256 vested70Amount = min(v.amount70, (v.amount70 * blocksSince70Start) / vestingBlocks);

        uint256 blocksSince30Start = block.number - v.startBlock30;
        uint256 vested30Amount = min(v.amount30, (v.amount30 * blocksSince30Start) / vestingBlocks);

        uint claimableAmount = vested70Amount + vested30Amount - v.claimedAmount;

        if (claimableAmount == 0) revert NoClaimableAmount();

        v.claimedAmount += claimableAmount;
        trendsToken.safeTransfer(msg.sender, claimableAmount);

        emit Claimed(msg.sender, claimableAmount);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? b : a;
    }
}
