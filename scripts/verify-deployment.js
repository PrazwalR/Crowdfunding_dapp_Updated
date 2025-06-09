const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("Verifying contract at:", contractAddress);
  
  // Get the contract factory
  const CrowdFunding = await hre.ethers.getContractFactory("CrowdFunding");
  
  // Attach to the deployed contract
  const contract = await CrowdFunding.attach(contractAddress);
  
  // Check the number of campaigns
  const numCampaigns = (await contract.numberOfCampaigns()).toNumber();
  console.log("Number of campaigns:", numCampaigns);
  
  // Get the ABI of the createCampaign function
  const createCampaignFragment = CrowdFunding.interface.fragments.find(
    f => f.name === 'createCampaign' && f.type === 'function'
  );
  
  console.log("\ncreateCampaign function parameters:");
  console.log(createCampaignFragment.inputs.map(i => `${i.type} ${i.name}`).join(', '));
  
  // Check if we can call getCampaigns
  try {
    const campaigns = await contract.getCampaigns();
    console.log("\nSuccessfully retrieved campaigns:", campaigns.length);
  } catch (error) {
    console.error("Error getting campaigns:", error.message);
  }
  
  console.log("\nVerification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
