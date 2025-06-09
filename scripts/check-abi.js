const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const contract = await ethers.getContractAt("CrowdFunding", contractAddress);

  console.log("Contract connected at:", contract.address);
  
  // Get the ABI for the createCampaign function
  const createCampaignABI = contract.interface.fragments
    .filter(frag => frag.type === 'function' && frag.name === 'createCampaign');
  
  console.log("\ncreateCampaign ABI:");
  console.log(JSON.stringify(createCampaignABI, null, 2));

  // Get the number of campaigns to verify the contract is working
  try {
    const numCampaigns = await contract.numberOfCampaigns();
    console.log("\nNumber of campaigns:", numCampaigns.toString());
  } catch (error) {
    console.error("Error getting number of campaigns:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
