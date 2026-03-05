// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library VersionMath {
    function bump(uint256 version) public pure returns (uint256) {
        return version + 1;
    }
}
