// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TrendsSharesV1} from "./TrendsSharesV1.sol";

contract TrendsAirdrop {
    using SafeERC20 for IERC20;

    error ClaimEnded();
    error NotCreator();
    error InvalidProof();
    error NoVestedAmount();
    error NoClaimableAmount();
    error OnlyClaimOnceAllowed();

    IERC20 public immutable trendsToken;
    bytes32 public immutable merkleRoot;

    TrendsSharesV1 private immutable trendsShare;

    // Vesting configuration
    uint256 public immutable vestingPeriod;
    uint256 public immutable blockPerPeriod; // Approximation

    // Airdrop configuration
    uint256 public claimed;
    uint256 public maxToClaim;

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

    constructor(TrendsSharesV1 _trendsShare, address _trendsToken, bytes32 _merkleRoot, uint256 _maxToClaim, uint256 _vestingPeriod, uint256 _blockPerPeriod) {
        trendsToken = IERC20(_trendsToken);
        merkleRoot = _merkleRoot;
        trendsShare = _trendsShare;
        maxToClaim = _maxToClaim;
        vestingPeriod = _vestingPeriod;
        blockPerPeriod = _blockPerPeriod;
    }

    function claim(bytes32[] calldata proof, uint256 amount, bytes32 subject) external {
        if (claimed >= maxToClaim) revert ClaimEnded();
        if (trendsShare.sharesCreator(subject) != msg.sender) revert NotCreator();

        // Verify the Merkle proof
        bytes32 node = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verify(proof, merkleRoot, node)) revert InvalidProof();

        // Initialize or update vesting
        Vesting storage v = vesting[msg.sender];
        if (v.amount != 0) revert OnlyClaimOnceAllowed();

        // Claim the rest if reaching maxToClaim
        if (amount + claimed > maxToClaim) {
            amount = maxToClaim - claimed;
        }
        v.amount = amount;
        v.startBlock = block.number;

        claimed += amount;

        emit VestingStarted(msg.sender, amount);
    }

    function claimable(address recipient) external view returns (uint256) {
        Vesting memory v = vesting[recipient];
        if (v.amount == 0) return 0;
        uint256 blocksSinceStart = block.number - v.startBlock;
        uint256 vestedAmount = min(v.amount, (v.amount * blocksSinceStart) / (blockPerPeriod * vestingPeriod));
        return vestedAmount - v.claimedAmount;
    }

    function claimVestedAirdrop() external {
        Vesting storage v = vesting[msg.sender];
        if (v.amount == 0) revert NoVestedAmount();

        uint256 blocksSinceStart = block.number - v.startBlock;
        uint256 vestedAmount = min(v.amount, (v.amount * blocksSinceStart) / (blockPerPeriod * vestingPeriod));

        uint256 claimableAmount = vestedAmount - v.claimedAmount;
        if (claimableAmount == 0) revert NoClaimableAmount();

        v.claimedAmount += claimableAmount;
        trendsToken.safeTransfer(msg.sender, claimableAmount);

        emit Claimed(msg.sender, claimableAmount);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? b : a;
    }
}
