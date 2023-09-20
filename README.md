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
- TrendsLock (Team): [0x69F6b1F8852236F17A0B514a9ff30EF692BD9f9e](https://arbiscan.io/address/0x69F6b1F8852236F17A0B514a9ff30EF692BD9f9e)
- TrendsLock (Treasury): [0x0E81FBb1dA5f5E161931967fa51E831A83CC3aB6](https://arbiscan.io/address/0x0E81FBb1dA5f5E161931967fa51E831A83CC3aB6)
- TrendsSharesHelper: [0xe4a158C6F5b1537F7141358321b2B4dBD1336c22](https://arbiscan.io/address/0xe4a158C6F5b1537F7141358321b2B4dBD1336c2)

## Security
Security is a top priority, but Trends Chat is in Beta. DYOR!

If you discover any issues, please contact us at security@trendschat.xyz.

## License
This project is licensed under the BUSL-1.1 License.
