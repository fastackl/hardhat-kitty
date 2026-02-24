// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloWorld {
    string public greeting;
    uint256 public luckyNumber;
    address public owner;

    constructor(string memory _greeting, uint256 _luckyNumber) {
        greeting = _greeting;
        luckyNumber = _luckyNumber;
        owner = msg.sender;
    }

    function initialize(
        string memory _newGreeting,
        uint256 _newLuckyNumber
    ) public {
        greeting = _newGreeting;
        luckyNumber = _newLuckyNumber;
    }

    function sayHello() public view returns (string memory) {
        return greeting;
    }
}
