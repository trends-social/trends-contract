[![Node.js CI](https://github.com/trends-social/trends-contract/actions/workflows/build.yml/badge.svg)](https://github.com/trends-social/trends-contract/actions/workflows/build.yml)

# Trends Chat
Trends Chat is a decentralized platform that harnesses the power of blockchain to empower the Web3 community. It features three core components, TrendsSharesV1, TrendsAirdrop, and TrendsToken (Layerzero standard OFT).

# Contracts
## TrendsAirdrop.sol
A decentralized way to airdrop tokens to community members.

Functions:
- addAirdrop(address[] calldata recipients, uint256[] calldata amounts): Adds a new airdrop.

## TrendsSharesV1.sol
A decentralized shares management contract that enables easy creation, buying, and managing of shares.

Functions:
- createShares(uint256 amount): Creates new shares.
- buyShares(uint256 amount): Allows users to buy shares.

## TrendsToken.sol
A native token for the platform, complying with the Layerzero standard OFT.

Functions:
- mint(address to, uint256 amount): Mints new tokens.
- burn(uint256 amount): Burns the specified amount of tokens.

# Development
Refer to the CONTRIBUTING.md for guidelines on contributing to the project.

# Security
Security is a top priority, but Trends Chat is in Beta. DYOR!

If you discover any issues, please contact us at security@trendschat.xyz.

# License
This project is licensed under the MIT License. See the LICENSE.md file for details.
