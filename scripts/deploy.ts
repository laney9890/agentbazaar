import { ethers } from "hardhat";

async function main() {
  console.log("Deploying to Arc Testnet...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry deployed to:", await agentRegistry.getAddress());

  const JobEscrow = await ethers.getContractFactory("JobEscrow");
  const jobEscrow = await JobEscrow.deploy(USDC_ADDRESS);
  await jobEscrow.waitForDeployment();
  console.log("JobEscrow deployed to:", await jobEscrow.getAddress());

  console.log("\nAgentRegistry:", await agentRegistry.getAddress());
  console.log("JobEscrow:", await jobEscrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});