// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentRegistry {
    struct Agent {
        uint256 id;
        address owner;
        string name;
        string description;
        string category;
        uint256 pricePerJob;
        uint256 totalJobs;
        uint256 rating;
        bool isActive;
    }

    uint256 public agentCount;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public ownerAgents;

    event AgentRegistered(uint256 indexed id, address indexed owner, string name);
    event AgentUpdated(uint256 indexed id);

    function registerAgent(
        string memory _name,
        string memory _description,
        string memory _category,
        uint256 _pricePerJob
    ) external returns (uint256) {
        agentCount++;
        agents[agentCount] = Agent({
            id: agentCount,
            owner: msg.sender,
            name: _name,
            description: _description,
            category: _category,
            pricePerJob: _pricePerJob,
            totalJobs: 0,
            rating: 5,
            isActive: true
        });
        ownerAgents[msg.sender].push(agentCount);
        emit AgentRegistered(agentCount, msg.sender, _name);
        return agentCount;
    }

    function getAgent(uint256 _id) external view returns (Agent memory) {
        return agents[_id];
    }

    function getAllAgents() external view returns (Agent[] memory) {
        Agent[] memory all = new Agent[](agentCount);
        for (uint256 i = 0; i < agentCount; i++) {
            all[i] = agents[i + 1];
        }
        return all;
    }

    function deactivateAgent(uint256 _id) external {
        require(agents[_id].owner == msg.sender, "Not owner");
        agents[_id].isActive = false;
        emit AgentUpdated(_id);
    }
}