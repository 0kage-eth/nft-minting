// SPDX-License-Identifer: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * RandomizedNFT contract generates a random NFT everytime a user mints
 * Random number generation is done via ChainLink VRFCoordinator
 * Contract inherits from ERC721 and VRFCoordinatorV2
 */

contract RandomizedNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // Storage variables
    // address private immutable i_owner;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    //chainlink helper
    // maps request id to msg.sender -> this is because when fulfilRandomWords gets executed by chainlink keeper
    // we need to retain the msg.sender, person who originally minted nft
    // if we don't do it, msg.sender at that point will be a chainlink keeper & nft will be minted against their name
    // to retain the identity of nft minter, we store address in a mapping that maps request id to address
    mapping(uint256 => address) private s_minterMapping;

    // token id that is assigned during minting - unique id
    uint256 private s_tokenId;

    //chainlink variables
    // these variables are needed to generate verifiable random numbers
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint16 private immutable i_minimumRequestConfirmations;
    uint32 private immutable i_callbackGasLimit;
    uint32 private immutable i_numWords;

    // list of uris - minters can receive image stored in one of uri's
    // which one depends on random number we generate
    // to keep example simple, I've assumed 3 - we can extend this and make it generic as well
    string[3] private s_nftURLs;

    // minimum eth (in wei) that needs to be sent to mint NFT
    // this can only be changed by owner
    uint256 private s_minEth;

    // events
    event NFTRequested(uint256 requestId, address minter); // triggered when a nft request is made
    event NFTMinted(address minter, uint256 tokenIndex); // trigerred when a nft is minted

    //errors
    error RandomizedNFT_IndexOutOfRange(uint256 normalizedRandomNumber); //index out of range error
    error RandomizedNFT_NotEnoughEth(uint256 sentEth, uint256 minEth); // not enough eth sent to mint

    // Define a constructor - pass VRF coordinator address
    constructor(
        uint64 _subscriptionId,
        address _vrfCoordinator,
        bytes32 _keyhash,
        uint16 _numRequestConfirmations,
        uint32 _callbackGasLimit,
        uint32 _numWords,
        uint256 _minMintValue,
        string memory _name,
        string memory _symbol,
        string[3] memory _nftUris // in this example, I assume a total of 3 uri's
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC721(_name, _symbol) {
        i_subscriptionId = _subscriptionId;
        // i_owner = msg.sender;
        i_keyHash = _keyhash;
        i_minimumRequestConfirmations = _numRequestConfirmations;
        i_callbackGasLimit = _callbackGasLimit;
        i_numWords = _numWords;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator); // initializing vrfCoordinator interface
        s_tokenId = 0;
        s_nftURLs = _nftUris;
        s_minEth = _minMintValue;
    }

    // Request a random number
    // emit a event - NftRequested
    // create a map of requestId -> msg.sender

    function requestNft() external payable onlyOwner {
        if (msg.value < s_minEth) {
            revert RandomizedNFT_NotEnoughEth(msg.value, s_minEth);
        }
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            i_minimumRequestConfirmations,
            i_callbackGasLimit,
            i_numWords
        );
        // maps the request id to msg.sender
        s_minterMapping[requestId] = msg.sender;
        emit NFTRequested(requestId, msg.sender);
    }

    // function for owner to withdraw all eth
    // owner is nft creator  - he gets paid by selling nfts
    // notice only owner can perform this operation

    function withdrawEth() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Fulfil random number request
    // normalize random number
    // get nftUrl based on chance array & random number
    // set token URI (we are using ERC721Storage contract & not ERC721 contract)
    // ERC721 storage allows us to set token uri
    // Once done, emit a mint event

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords)
        internal
        override
    {
        uint256 newMintId = s_tokenId;
        s_tokenId = s_tokenId + 1; //increment token id by 1
        address minter = s_minterMapping[_requestId];

        // mint NFT
        _safeMint(minter, newMintId);

        // normalized Random number is a number between 0-99
        uint256 normalizedRandomNumner = _randomWords[0] % 100;
        string memory nftUrl = s_nftURLs[getNftUrlBasedOnRandomNumber(normalizedRandomNumner)];

        _setTokenURI(newMintId, nftUrl);
        emit NFTMinted(minter, newMintId);
    }

    // Set min value for minting nfr
    function setMinMintValue(uint256 _minValue) public {
        s_minEth = _minValue;
    }

    // gets nft url index based on normalized random number
    // compares with chance array and returns the index based on probability range
    function getNftUrlBasedOnRandomNumber(uint256 normalizedRandomNumber)
        private
        pure
        returns (uint256 index)
    {
        uint8[3] memory chances = getChanceArray();
        uint256 prev = 0;
        for (uint256 indx = 0; indx < chances.length; indx++) {
            uint256 current = uint256(chances[indx]);

            if (normalizedRandomNumber >= prev && normalizedRandomNumber < current) {
                return indx;
            } else {
                prev = uint256(chances[indx]);
            }
        }
        revert RandomizedNFT_IndexOutOfRange(normalizedRandomNumber);
    }

    // chance array
    // if randome number between 0-10 -> choose url 1
    // if random number between 30-50 -> choose url 2
    // if randome number between 50-100 -> choose url 3
    function getChanceArray() private pure returns (uint8[3] memory) {
        return [10, 30, 100];
    }

    // gets minimum mint value
    function getMinMintValue() public view returns (uint256) {
        return s_minEth;
    }
}
