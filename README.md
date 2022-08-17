# NFT MINTING

## SETUP

***

## SUMMARY

In this project. I mint 3 NFT's

 - Basic NFT
 - Random IPFS NFT - Create scarcity of NFT collection
 - Dynamic SVG NFT - Image changes with parameters

 ## CONTRACTS


 **Basic NFT**

 [Basic NFT contract](./contracts/BasicNFT.sol) is extended for [ERC721 contract](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol) of OpenZeppelin. In this contract, we define `mint()` function and update the `tokenId` that is unique for every NFT that is minted 

**Randomized NFT** 

[Randomized NFT contract](./contracts/RandomizedNFT.sol) is extended from [ERC721 contract](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol), [Ownable contract](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol) and [VRFConsumerBaseV2](https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/VRFConsumerBaseV2.sol). 

VRFConsumerBaseV2 is a chain link contract that gives us a verifiable random number. We generate a random number & based on this value, we mint one of 3 NFT's. In this contract, I also demonstrate the concept of scarcity - based on random number, we generate scarcity effect where some Nft's get minted rarely while others are more frequent.

