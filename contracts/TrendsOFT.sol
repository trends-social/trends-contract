// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0 <0.9.0;

import "@layerzerolabs/solidity-examples/contracts/token/oft/extension/PausableOFT.sol";

contract TrendsOFT is PausableOFT {
    constructor(string memory _name, string memory _symbol, address _lzEndpoint, uint256 _mintAmount) PausableOFT(_name, _symbol, _lzEndpoint) {
            _mint(msg.sender, _mintAmount);
    }

    function burn(uint256 _amount) external {
        _burn(_msgSender(), _amount);
    }
}
