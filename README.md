[![Node.js CI](https://github.com/trends-social/trends-contract/actions/workflows/build.yml/badge.svg)](https://github.com/trends-social/trends-contract/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/trends-social/trends-contract/graph/badge.svg?token=ZG6E68M7WQ)](https://codecov.io/gh/trends-social/trends-contract)

## Trends
[Trends](https://trendschat.xyz/blogs/the_trends) is an avant-garde, decentralized social application built atop the Web3 infrastructure, allowing a specialized discussion space where content creators and participants can collaborate and engage in real-time conversations with a unique economic bonding model. 

## Contracts
- TrendsAirdrop.sol: A decentralized vault to manage airdrop tokens to community members.
- TrendsSharesV1.sol: Pass management contract that enables easy creation, buying, and managing of passes.
- TrendsToken.sol: The native token for the platform, complying with the Layerzero standard OFT.
- TrendsLock.sol: Trends locking vault for treasury, team.
- TrendsSharesHelper.sol: Helper class to query data in batch

## Build and Test
We use Hardhat as the development environment for compiling, deploying, and testing.

`npx hardhat test`

## Deployed Contracts
- TrendsAirdrop.sol: [0x3147aAf2B98Cc9A93F6846533bB37668e3cb0cb8](https://arbiscan.io/address/0x3147aAf2B98Cc9A93F6846533bB37668e3cb0cb8)
- TrendsSharesV1.sol: [0x4E1221B42e0aF55153D1beF5eAC59d029b0C114F](https://arbiscan.io/address/0x4E1221B42e0aF55153D1beF5eAC59d029b0C114F) 
- TrendsToken.sol: [0x6be25A999BA2b10C0120E86043a51805deB3326B](https://arbiscan.io/address/0x6be25A999BA2b10C0120E86043a51805deB3326B)
- TrendsLock (Team): [0x912ce59144191c1204e64559fe8253a0e49e6548](https://arbiscan.io/address/0x8BE18760d57CEe9Cc365805bBDE6ef19A8492b34)
- TrendsLock (Treasury): [0x05A81fA904Eab6a8bb9d8b717C82eC6326A7f466](https://arbiscan.io/address/0x05A81fA904Eab6a8bb9d8b717C82eC6326A7f466)
- TrendsSharesHelper: [0xe4a158C6F5b1537F7141358321b2B4dBD1336c22](https://arbiscan.io/address/0xe4a158C6F5b1537F7141358321b2B4dBD1336c22)

## Security
Security is a top priority, but Trends Chat is in Beta. DYOR!

If you discover any issues, please contact us at security@trendschat.xyz.

## License
This project is licensed under the BUSL-1.1 License.
