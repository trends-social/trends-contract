// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0 <0.9.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TrendsSharesV1 is Ownable {
    using SafeERC20 for IERC20;

    event Create(address creator, bytes32 subject);

    event Trade(
        address trader,
        bytes32 subject,
        bool isBuy,
        uint256 shares,
        uint256 price,
        uint256 protocolFee,
        uint256 lpFarmingFee,
        uint256 creatorFee,
        uint256 holderFee,
        uint256 supply
    );

    event WithdrawReward(address trader, bytes32 subject, uint256 reward);

    struct HolderReward {
        uint256 reward;
        uint256 rewardPerSharePaid;
    }

    IERC20 public immutable TRENDS;
    address public protocolFeeDestination;
    address public lpFarmingAddress;

    uint256 public protocolFeePercent;
    uint256 public lpFarmingFeePercent;
    uint256 public creatorFeePercent;
    uint256 public holderFeePercent;

    // subject => (holder => balance)
    mapping(bytes32 => mapping(address => uint256)) public sharesBalance;

    // subject => supply
    mapping(bytes32 => uint256) public sharesSupply;

    // subject => creator
    mapping(bytes32 => address) public sharesCreator;

    //subject => holder's reward per share stored
    mapping(bytes32 => uint256) public rewardPerShareStored;

    //subject => (holder=> reward) holder's reward
    mapping(bytes32 => mapping(address => HolderReward)) public holderSharesReward;

    constructor(IERC20 _trends) {
        TRENDS = _trends;
    }

    function createShares(bytes32 subject) external {
        require(sharesCreator[subject] == address(0), "Shares exists");
        sharesCreator[subject] = msg.sender;
        emit Create(msg.sender, subject);
        _buyShares(msg.sender, subject, 1);
    }

    function buyShares(address recipient, bytes32 subject, uint256 shares) external {
        _buyShares(recipient, subject, shares);
    }

    function _buyShares(address recipient, bytes32 subject, uint256 shares) internal {
        uint256 supply = sharesSupply[subject];
        require(supply > 0 || sharesCreator[subject] == recipient, "Only creator can buy first share");
        uint256 price = getPrice(supply, shares);
        (uint256 protocolFee, uint256 lpFarmingFee, uint256 creatorFee, uint256 holderFee) = _getFees(price);
        //update shares reward
        _updateSharesReward(subject, holderFee, recipient);
        sharesBalance[subject][recipient] = sharesBalance[subject][recipient] + shares;
        uint256 totalSupply = supply + shares;
        sharesSupply[subject] = totalSupply;
        emit Trade(recipient, subject, true, shares, price, protocolFee, lpFarmingFee, creatorFee, holderFee, totalSupply);
        if (price > 0) {
            TRENDS.safeTransferFrom(msg.sender, address(this), price + protocolFee + lpFarmingFee + creatorFee + holderFee);
            _collectFees(subject, protocolFee, lpFarmingFee, creatorFee);
        }
    }

    function sellShares(address recipient, bytes32 subject, uint256 shares) external {
        uint256 supply = sharesSupply[subject];
        require(supply > shares, "Cannot sell the last share");
        uint256 price = getPrice(supply - shares, shares);
        (uint256 protocolFee, uint256 lpFarmingFee, uint256 creatorFee, uint256 holderFee) = _getFees(price);
        require(sharesBalance[subject][msg.sender] >= shares, "Insufficient shares");
        //update shares reward
        _updateSharesReward(subject, holderFee, msg.sender);
        sharesBalance[subject][msg.sender] = sharesBalance[subject][msg.sender] - shares;
        uint256 totalSupply = supply - shares;
        sharesSupply[subject] = totalSupply;
        emit Trade(msg.sender, subject, false, shares, price, protocolFee, lpFarmingFee, creatorFee, holderFee, totalSupply);
        if (price > 0) {
            TRENDS.safeTransfer(recipient, price - protocolFee - lpFarmingFee - creatorFee - holderFee);
            _collectFees(subject, protocolFee, lpFarmingFee, creatorFee);
        }
    }

    function getPrice(uint256 supply, uint256 amount) public pure returns (uint256) {
        uint256 sum1 = supply == 0 ? 0 : ((supply - 1) * (supply) * (2 * (supply - 1) + 1)) / 6;
        uint256 sum2 = supply == 0 && amount == 1 ? 0 : ((supply - 1 + amount) * (supply + amount) * (2 * (supply - 1 + amount) + 1)) / 6;
        uint256 summation = sum2 - sum1;
        return (summation * 1 ether) / 16000;
    }

    function getBuyPrice(bytes32 subject, uint256 amount) public view returns (uint256) {
        return getPrice(sharesSupply[subject], amount);
    }

    function getSellPrice(bytes32 subject, uint256 amount) public view returns (uint256) {
        return getPrice(sharesSupply[subject] - amount, amount);
    }

    function getBuyPriceAfterFee(bytes32 subject, uint256 amount) external view returns (uint256) {
        uint256 price = getBuyPrice(subject, amount);
        (uint256 protocolFee, uint256 lpFarmingFee, uint256 creatorFee, uint256 holderFee) = _getFees(price);
        return price + protocolFee + lpFarmingFee + creatorFee + holderFee;
    }

    function getSellPriceAfterFee(bytes32 subject, uint256 amount) external view returns (uint256) {
        uint256 price = getSellPrice(subject, amount);
        (uint256 protocolFee, uint256 lpFarmingFee, uint256 creatorFee, uint256 holderFee) = _getFees(price);
        return price - protocolFee - lpFarmingFee - creatorFee - holderFee;
    }

    function _getFees(uint256 price) internal view returns (uint256 protocolFee, uint256 lpFarmingFee, uint256 creatorFee, uint256 holderFee) {
        protocolFee = (price * protocolFeePercent) / 1 ether;
        lpFarmingFee = (price * lpFarmingFeePercent) / 1 ether;
        creatorFee = (price * creatorFeePercent) / 1 ether;
        holderFee = (price * holderFeePercent) / 1 ether;
    }

    function _collectFees(bytes32 subject, uint256 protocolFee, uint256 lpFarmingFee, uint256 creatorFee) internal {
        if (protocolFee > 0) {
            TRENDS.safeTransfer(protocolFeeDestination, protocolFee);
        }
        if (lpFarmingFee > 0) {
            //TODO
        }
        if (creatorFee > 0) {
            TRENDS.safeTransfer(sharesCreator[subject], creatorFee);
        }
    }

    function withdrawReward(bytes32 subject) external {
        _updateHolderReward(subject, msg.sender);
        uint256 reward = holderSharesReward[subject][msg.sender].reward;
        require(reward > 0, "No rewards");
        holderSharesReward[subject][msg.sender].reward = 0;
        emit WithdrawReward(msg.sender, subject, reward);
        TRENDS.safeTransfer(msg.sender, reward);
    }

    function getReward(bytes32 subject, address holder) external view returns (uint256) {
        return _getHolderReward(subject, holder);
    }

    function _updateSharesReward(bytes32 subject, uint256 newReward, address holder) internal {
        if (newReward == 0 || sharesSupply[subject] == 0) {
            return;
        }
        rewardPerShareStored[subject] += ((newReward * (1 ether)) / (sharesSupply[subject]));
        _updateHolderReward(subject, holder);
    }

    function _updateHolderReward(bytes32 subject, address holder) internal {
        holderSharesReward[subject][holder].reward = _getHolderReward(subject, holder);
        holderSharesReward[subject][holder].rewardPerSharePaid = rewardPerShareStored[subject];
    }

    function _getHolderReward(bytes32 subject, address holder) internal view returns (uint256) {
        uint256 holderBalance = sharesBalance[subject][holder];
        uint256 perShareStored = rewardPerShareStored[subject];
        uint256 holderPerSharePaid = holderSharesReward[subject][holder].rewardPerSharePaid;
        uint256 holderReward = holderSharesReward[subject][holder].reward;
        return (holderBalance * (perShareStored - holderPerSharePaid)) / (1 ether) + holderReward;
    }

    function setProtocolFeeDestination(address _protocolFeeDestination) external onlyOwner {
        protocolFeeDestination = _protocolFeeDestination;
    }

    function setLpFarmingAddress(address _lpFarmingAddress) external onlyOwner {
        lpFarmingAddress = _lpFarmingAddress;
    }

    function setProtocolFeePercent(uint256 _protocolFeePercent) external onlyOwner {
        require(_protocolFeePercent < 1 ether, "invalid protocolFeePercent");
        protocolFeePercent = _protocolFeePercent;
    }

    function setLpFarmingFeePercent(uint256 _lpFarmingFeePercent) external onlyOwner {
        require(_lpFarmingFeePercent < 1 ether, "invalid lpFarmingFeePercent");
        lpFarmingFeePercent = _lpFarmingFeePercent;
    }

    function setCreatorFeePercent(uint256 _creatorFeePercent) external onlyOwner {
        require(_creatorFeePercent < 1 ether, "invalid creatorFeePercent");
        creatorFeePercent = _creatorFeePercent;
    }

    function setHolderFeePercent(uint256 _holderFeePercent) external onlyOwner {
        require(_holderFeePercent < 1 ether, "invalid holderFeePercent");
        holderFeePercent = _holderFeePercent;
    }
}
