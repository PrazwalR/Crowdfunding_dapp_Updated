const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", await deployer.getAddress());

  // Get the contract factory
  const CrowdFunding = await hre.ethers.getContractFactory("CrowdFunding");
  
  // The deployed contract address (update this if needed)
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const contract = CrowdFunding.attach(contractAddress);

  console.log("Connected to contract at:", contractAddress);

  try {
    // Check number of campaigns
    const numCampaigns = await contract.numberOfCampaigns();
    console.log("Number of campaigns:", numCampaigns.toString());

    // Get campaign details if any exist
    if (numCampaigns > 0) {
      console.log("\nCampaign details:");
      for (let i = 0; i < Math.min(numCampaigns, 5); i++) { // Check first 5 campaigns max
        try {
          const campaign = await contract.campaigns(i);
          const ipfsHash = await contract.campaignIpfsHashes(i);
          console.log(`\nCampaign ${i}:`);
          console.log(`  Owner: ${campaign.owner}`);
          console.log(`  Title: ${campaign.title}`);
          console.log(`  Description: ${campaign.description}`);
          console.log(`  Target: ${campaign.target.toString()}`);
          console.log(`  Amount Collected: ${campaign.amountCollected.toString()}`);
          console.log(`  IPFS Hash: ${ipfsHash}`);
        } catch (err) {
          console.error(`Error fetching campaign ${i}:`, err.message);
        }
      }
    }

    // Check contract owner
    try {
      const owner = await contract.owner();
      console.log("\nContract owner:", owner);
    } catch (err) {
      console.log("\nContract doesn't have an owner() function");
    }

  } catch (err) {
    console.error("Error checking contract state:", err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
