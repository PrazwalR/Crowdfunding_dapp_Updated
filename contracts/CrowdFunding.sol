// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract CrowdFunding {
    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        address[] donators;
        uint256[] donations;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => string) public campaignIpfsHashes;
    uint256 public numberOfCampaigns = 0;

    // Events
    event CampaignCreated(uint256 id, address owner, string title);
    event CampaignIpfsHashUpdated(uint256 indexed campaignId, string ipfsHash);

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _ipfsHash
    ) public returns (uint256) {
        require(_owner != address(0), "Invalid owner address");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_target > 0, "Target amount must be greater than 0");
        require(_deadline > block.timestamp, "The deadline should be a date in the future.");
        
        uint256 campaignId = numberOfCampaigns;
        Campaign storage campaign = campaigns[campaignId];
        
        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        
        // Store IPFS hash if provided
        if (bytes(_ipfsHash).length > 0) {
            campaignIpfsHashes[campaignId] = _ipfsHash;
            emit CampaignIpfsHashUpdated(campaignId, _ipfsHash);
        }
        
        numberOfCampaigns++;
        
        return campaignId;
    }

    function donateToCampaign(uint256 _id) public payable {
        uint256 amount = msg.value;
        Campaign storage campaign = campaigns[_id];
        campaign.donators.push(msg.sender);
        campaign.donations.push(amount);

        (bool sent,) = payable(campaign.owner).call{value: amount}("");
        if (sent) {
            campaign.amountCollected = campaign.amountCollected + amount;
        }
    }

    function getDonators(uint256 _id) view public returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donators, campaigns[_id].donations);
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);
        for (uint i = 0; i < numberOfCampaigns; i++) {
            Campaign storage item = campaigns[i];
            allCampaigns[i] = item;
        }
        return allCampaigns;
    }

    // Function to get IPFS hash for a campaign
    function getCampaignIpfsHash(uint256 _campaignId) public view returns (string memory) {
        require(_campaignId < numberOfCampaigns, "Campaign does not exist");
        return campaignIpfsHashes[_campaignId];
    }
    
    // Function to set/update IPFS hash for a campaign
    function setCampaignIpfsHash(uint256 _campaignId, string memory _ipfsHash) public {
        require(_campaignId < numberOfCampaigns, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.owner, "Only campaign owner can set IPFS hash");
        campaignIpfsHashes[_campaignId] = _ipfsHash;
        emit CampaignIpfsHashUpdated(_campaignId, _ipfsHash);
    }
}
