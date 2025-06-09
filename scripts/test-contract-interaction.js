const { ethers } = require("hardhat");

async function main() {
  // Get the first account from the local Hardhat node
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Get the contract factory
  const CrowdFunding = await ethers.getContractFactory("CrowdFunding");
  
  // Deploy a new contract for testing
  console.log("Deploying CrowdFunding contract...");
  const crowdFunding = await CrowdFunding.deploy();
  await crowdFunding.deployed();
  console.log("CrowdFunding deployed to:", crowdFunding.address);
  
  // Test creating a campaign
  console.log("\nTesting campaign creation...");
  const title = "Test Campaign";
  const description = "This is a test campaign";
  const target = ethers.utils.parseEther("1.0");
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
  
  console.log("Creating campaign with params:", {
    owner: deployer.address,
    title,
    description,
    target: target.toString(),
    deadline
  });
  
  try {
    const tx = await crowdFunding.createCampaign(
      deployer.address,
      title,
      description,
      target,
      deadline
    );
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Get the created campaign
    const campaignId = (await crowdFunding.numberOfCampaigns()).sub(1);
    console.log("Created campaign ID:", campaignId.toString());
    
    const campaign = await crowdFunding.campaigns(campaignId);
    console.log("Campaign details:", {
      owner: campaign.owner,
      title: campaign.title,
      description: campaign.description,
      target: campaign.target.toString(),
      deadline: campaign.deadline.toString(),
      amountCollected: campaign.amountCollected.toString()
    });
    
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
