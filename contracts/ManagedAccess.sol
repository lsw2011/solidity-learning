// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract ManagedAccess {
    address public owner;
    address public manager;

    address[] public managers;
    mapping(address => bool) public isManager;
    mapping(address => bool) public confirmations;
    uint256 public confirmCount;

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;
    }

    function addManager(address _manager) external onlyOwner {
        require(!isManager[_manager], "Already a manager");
        managers.push(_manager);
        isManager[_manager] = true;
    }

    function confirm() external {
        require(isManager[msg.sender], "You are not a manager");
        require(!confirmations[msg.sender], "Already confirmed");
        confirmations[msg.sender] = true;
        confirmCount++;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    modifier onlyManager() {
        require(
            msg.sender == manager,
            "You are not authorized to manage this contract"
        );
        _;
    }
    modifier onlyAllComfirmed() {
        require(isManager[msg.sender], "You are not a manager");
        require(confirmCount == managers.length, "Not all confirmed yet");
        _;
    }
}
