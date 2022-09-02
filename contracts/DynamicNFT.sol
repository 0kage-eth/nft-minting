//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "base64-sol/base64.sol";
import "hardhat/console.sol";

/**
 * @title Dynamic NFT Minting
 * @author 0Kage
 * @dev Creates a Dynamic NFT that is fully onchain (no IPFS storage)
 * @dev NFT is based on price of asset
 * @dev If price is higher than threshold, we mint one NFT
 * @dev If price is less than threshold, we mint another NFT
 * @dev NFT's here are SVG's - SVG's can be encoded into a string and stored onchain
 * @dev Token URI for NFT's is a json that contains name, uri, attributes
 */

contract DynamicNFT is ERC721 {
    // variables
    AggregatorV3Interface private immutable i_priceFeed;
    uint256 private s_tokenCounter;
    string private s_lowSvgURI;
    string private s_highSvgURI;
    mapping(uint256 => int256) private s_tokenCounterToHighValueMapping;

    // events
    event CreatedNFT(uint256 tokenId, int256 priceThreshold);

    constructor(
        string memory name, // name of minted nft
        string memory symbol, // symbol of minted nft
        address priceFeedAddress, // price feed address of the asset we are monitoring
        string memory lowSvg, // SVG when price of asset is lower than threshold
        string memory highSvg // SVG when price of asset is higher than threshold
    ) ERC721(name, symbol) {
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
        s_lowSvgURI = svgToImageUri(lowSvg);
        s_highSvgURI = svgToImageUri(highSvg);
    }

    /**
     * @notice function converts a svg into a URI that can be stored on chain
     * @dev note that URI in this case is a json
     * @dev uses Base64 encoding to convert the SVG (in byte format) to base64 encoding
     * @dev attach a prefix of data:image/svg+xml;base64, combine it with base64 string, and you get the Uri
     */

    function svgToImageUri(string memory svg) public pure returns (string memory) {
        string memory baseURL = "data:image/svg+xml;base64,";

        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));

        return string(abi.encodePacked(baseURL, svgBase64Encoded));
    }

    /**
     * @notice mintNFT function mints a highSvgURI if price > highVal
     * @notice otherwise mints a lowSvgURI
     * @dev inside this function, we need to call _mint() of ERC721
     * @dev we need to also raise the token counter
     * @dev update mapping of token counter -> high value, to keep tab of price threshold for each minted Nft
     * @dev above is needed because price might have a huge fluctuation - so at every price level, our minting behavior can be consistent
     */

    function mintNFT(int256 highVal) public {
        s_tokenCounterToHighValueMapping[s_tokenCounter] = highVal;
        _safeMint(msg.sender, s_tokenCounter); // mint and send to msg.sender with token id as s_tokenCounter

        emit CreatedNFT(s_tokenCounter, highVal); // emit CreatedNFT event
        s_tokenCounter++; //increase counter for the next mint
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token id does not exist");
        // we need tokenURI in json format - we will encode the json using abi.encodePacked
        //
        string memory imageUri = s_lowSvgURI;
        (, int256 price, , , ) = i_priceFeed.latestRoundData();

        if (price > s_tokenCounterToHighValueMapping[tokenId]) {
            imageUri = s_highSvgURI;
        }

        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(),
                                '","description":"Price based dynamic NFT"',
                                ',"image":"',
                                imageUri,
                                '","attributes": [{"trait_type": "coolness", "value": 100}]}'
                            )
                        )
                    )
                )
            );
    }

    /**
     * @dev get functions below
     */

    function getTokenId() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getPriceThresholdForTokenId(uint256 tokenId) public view returns (int256) {
        return s_tokenCounterToHighValueMapping[tokenId];
    }

    function getlowImageURI() public view returns (string memory) {
        return s_lowSvgURI;
    }

    function getHighImageURI() public view returns (string memory) {
        return s_highSvgURI;
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }

    function getLatestRoundPrice() public view returns (int256) {
        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        return price;
    }
}
