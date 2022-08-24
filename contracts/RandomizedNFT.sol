//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title Randomized NFT Minting
 * @author 0Kage
 * @dev RandomizedNFT contract generates a random NFT everytime a user mints
 * @dev Random number generation is done via ChainLink VRFCoordinator
 * @dev Based on random number we mint nft's from common ones to rare ones
 * @dev Contract inherits from ERC721 and VRFCoordinatorV2
 */

contract RandomizedNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // Storage variables

    /**dev immutable variables */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    //chainlink variables
    /** @dev variables are needed to generate verifiable random numbers */
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint16 private immutable i_minimumRequestConfirmations;
    uint32 private immutable i_callbackGasLimit;
    uint32 private immutable i_numWords;

    //chainlink helper
    /**
     * @dev maps request id to msg.sender -> this is because when fulfilRandomWords gets executed by chainlink keeper
     * @dev we need to retain the msg.sender, person who originally minted nft
     * @dev if we don't do it, msg.sender at that point will be a chainlink keeper & nft will be minted against their name.
     * @dev To retain identity of nft minter, we store address in a mapping that maps request id to address
     */

    mapping(uint256 => address) private s_minterMapping;

    // token id that is assigned during minting - unique id
    uint256 private s_tokenId;

    /**
     * @dev list of uris - minters can receive image stored in one of uri's
     * @dev which one depends on random number we generate
     * @dev to keep example simple, I've assumed 5 - we can extend this and make it generic as well
     */
    string[5] private s_nftURLs;

    /**
     * @dev minimum eth (in wei) that needs to be sent to mint NFT
     * @dev this can only be changed by owner
     */

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
        string[5] memory _nftUris // in this example, I assume a total of 3 uri's
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

    /**
     * @dev Request a random number
     * @dev emit a event: NftRequested
     * @dev create a map of requestId -> msg.sender
     */
    function requestNft() external payable {
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

    /**
     * @dev function for owner to withdraw all eth
     * @dev owner is nft creator  - he gets paid by selling nfts
     * @dev notice only owner can perform this operation
     */

    function withdrawEth() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     *  @dev Fulfil random words is a virtual function defined in VRFConsumerBaseV2
     *  @dev This function is called by Chainlink Keepers once requestId gets generated
     *  @dev We override this function & do the following
     *  @dev normalize random number
     *  @dev get nftUrl based on chance array & random number
     *  @dev set token URI (we are using ERC721Storage contract & not ERC721 contract)
     *  @dev ERC721 storage allows us to set token uri
     *  @dev Once done, emit a mint event
     *  @param _requestId request Id generated by requestRandomWords()
     *  @param _randomWords verifiable random numbers array returned by chainlink
     */

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

    /**
     * @dev sets minimum nft price for minting a new nft
     */
    function setMinMintValue(uint256 _minValue) public {
        s_minEth = _minValue;
    }

    /**
     * @dev gets nft url index based on normalized random number
     * @dev compares with chance array and returns the index based on probability range
     * @dev check how this is done by looking at getChanceArray() function
     */
    function getNftUrlBasedOnRandomNumber(uint256 normalizedRandomNumber)
        private
        pure
        returns (uint256 index)
    {
        uint8[5] memory chances = getChanceArray();
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

    /**
     * @dev here we define chance array
     * @dev if randome number between 0-5 -> choose url 1
     * @dev if randome number between 5-15 -> choose url 2
     * @dev if randome number between 15-30 -> choose url 3
     * @dev if random number between 30-60 -> choose url 2
     * @dev if randome number between 60-100 -> choose url 3
     * @dev to simplify we took an array with 3 elements - we can expand it to any number
     */

    function getChanceArray() private pure returns (uint8[5] memory) {
        return [5, 15, 30, 60, 100];
    }

    /**
     * @dev returns minimum mint price
     */
    function getMinMintValue() public view returns (uint256) {
        return s_minEth;
    }

    /**
     * @dev get uri for a given index
     */

    function getUri(uint8 index) public view returns (string memory) {
        if (index >= s_nftURLs.length || index < 0) {
            revert RandomizedNFT_IndexOutOfRange(index);
        }
        return s_nftURLs[index];
    }
}
