// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0 <0.9.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TrendsToken is ERC20 {
    constructor() ERC20("Trends Chat Token", "TRENDS") {
        _mint(msg.sender, 10000000 ether);
    }
}
