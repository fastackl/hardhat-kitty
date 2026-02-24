// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ConfigShowcase {
    address public helloWorldAddress;
    address public operator;
    string public label;
    uint256 public version;

    constructor(
        address _helloWorldAddress,
        address _operator,
        string memory _label,
        uint256 _version
    ) {
        helloWorldAddress = _helloWorldAddress;
        operator = _operator;
        label = _label;
        version = _version;
    }

    function initialize(
        address _helloWorldAddress,
        address _operator,
        string memory _label,
        uint256 _version
    ) external {
        helloWorldAddress = _helloWorldAddress;
        operator = _operator;
        label = _label;
        version = _version;
    }
}
