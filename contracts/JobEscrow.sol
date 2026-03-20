// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract JobEscrow {
    enum JobStatus { Open, InProgress, Completed, Cancelled }

    struct Job {
        uint256 id;
        address client;
        uint256 agentId;
        string title;
        string description;
        uint256 payment;
        JobStatus status;
        string result;
    }

    IERC20 public usdc;
    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed id, address indexed client, uint256 agentId);
    event JobCompleted(uint256 indexed id, string result);
    event JobCancelled(uint256 indexed id);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function createJob(
        uint256 _agentId,
        string memory _title,
        string memory _description,
        uint256 _payment
    ) external returns (uint256) {
        require(usdc.transferFrom(msg.sender, address(this), _payment), "Payment failed");
        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            client: msg.sender,
            agentId: _agentId,
            title: _title,
            description: _description,
            payment: _payment,
            status: JobStatus.InProgress,
            result: ""
        });
        emit JobCreated(jobCount, msg.sender, _agentId);
        return jobCount;
    }

    function completeJob(uint256 _jobId, string memory _result, address _agentOwner) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.InProgress, "Job not in progress");
        job.status = JobStatus.Completed;
        job.result = _result;
        usdc.transfer(_agentOwner, job.payment);
        emit JobCompleted(_jobId, _result);
    }

    function cancelJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.client == msg.sender, "Not client");
        require(job.status == JobStatus.InProgress, "Cannot cancel");
        job.status = JobStatus.Cancelled;
        usdc.transfer(msg.sender, job.payment);
        emit JobCancelled(_jobId);
    }

    function getJob(uint256 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }
}