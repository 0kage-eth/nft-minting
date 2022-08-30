import { networkConfig, developmentChains } from "../../helper-hardhat-config"
import { assert, expect } from "chai"
import { deployments, network, ethers, getNamedAccounts } from "hardhat"
import { DynamicNFT, MockV3Aggregator } from "../../typechain-types"

const MOCK_PRICE = "200000000000000000000"
const CARTMAN_SVG_BASE64 =
    "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMTA0IDk3JyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPgogIDxwYXRoIGQ9J00xNCw4NWwzLDloNzJjMCwwLDUtOSw0LTEwYy0yLTItNzksMC03OSwxJyBmaWxsPScjN0M0RTMyJy8+CiAgPHBhdGggZD0nTTE5LDQ3YzAsMC05LDctMTMsMTRjLTUsNiwzLDcsMyw3bDEsMTRjMCwwLDEwLDgsMjMsOGMxNCwwLDI2LDEsMjgsMGMyLTEsOS0yLDktNGMxLTEsMjcsMSwyNy05YzAtMTAsNy0yMC0xMS0yOWMtMTctOS02Ny0xLTY3LTEnIGZpbGw9JyNFMzAwMDAnLz4KICA8cGF0aCBkPSdNMTcsMzJjLTMsNDgsODAsNDMsNzEtMyBsLTM1LTE1JyBmaWxsPScjRkZFMUM0Jy8+CiAgPHBhdGggZD0iTTE3LDMyYzktMzYsNjEtMzIsNzEtM2MtMjAtOS00MC05LTcxLDMiIGZpbGw9IiM4RUQ4RjgiLz4KICA8cGF0aCBkPSdNNTQsMzVhMTAgOCA2MCAxIDEgMCwwLjF6TTM3LDM4YTEwIDggLTYwIDEgMSAwLDAuMXonIGZpbGw9JyNGRkYnLz4KICA8cGF0aCBkPSdNNDEsNmMxLTEsNC0zLDgtM2MzLTAsOS0xLDE0LDNsLTEsMmgtMmgtMmMwLDAtMywxLTUsMGMtMi0xLTEtMS0xLTFsLTMsMWwtMi0xaC0xYzAsMC0xLDItMywyYzAsMC0yLTEtMi0zTTE3LDM0bDAtMmMwLDAsMzUtMjAsNzEtM3YyYzAsMC0zNS0xNy03MSwzTTUsNjJjMy0yLDUtMiw4LDBjMywyLDEzLDYsOCwxMWMtMiwyLTYsMC04LDBjLTEsMS00LDItNiwxYy00LTMtNi04LTItMTJNOTksNTljMCwwLTktMi0xMSw0bC0zLDVjMCwxLTIsMywzLDNjNSwwLDUsMiw3LDJjMywwLDctMSw3LTRjMC00LTEtMTEtMy0xMCcgZmlsbD0nI0ZGRjIwMCcvPgogIDxwYXRoIGQ9J001Niw3OHYxTTU1LDY5djFNNTUsODd2MScgc3Ryb2tlPScjMDAwJyBzdHJva2UtbGluZWNhcD0ncm91bmQnLz4KICA8cGF0aCBkPSdNNjAsMzZhMSAxIDAgMSAxIDAtMC4xTTQ5LDM2YTEgMSAwIDEgMSAwLTAuMU01Nyw1NWEyIDMgMCAxIDEgMC0wLjFNMTIsOTRjMCwwLDIwLTQsNDIsMGMwLDAsMjctNCwzOSwweicvPgogIDxwYXRoIGQ9J001MCw1OWMwLDAsNCwzLDEwLDBNNTYsNjZsMiwxMmwtMiwxMk0yNSw1MGMwLDAsMTAsMTIsMjMsMTJjMTMsMCwyNCwwLDM1LTE1JyBmaWxsPSdub25lJyBzdHJva2U9JyMwMDAnIHN0cm9rZS13aWR0aD0nMC41Jy8+Cjwvc3ZnPgo="

const HEART_SVG_BASE64 =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cGF0aCBkPSJNNTAsMzBjOS0yMiA0Mi0yNCA0OCwwYzUsNDAtNDAsNDAtNDgsNjVjLTgtMjUtNTQtMjUtNDgtNjVjIDYtMjQgMzktMjIgNDgsMCB6IiBmaWxsPSIjRjAwIiBzdHJva2U9IiMwMDAiLz4KPC9zdmc+Cg=="

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Dynamic NFT Unit tests", () => {
          let dynamicNFTContract: DynamicNFT
          let mockAggregatorContract: MockV3Aggregator

          beforeEach(async () => {
              // deploy mocks and dynamicNFT contract

              const { deployer } = await getNamedAccounts()
              await deployments.fixture(["mocks", "dynamic"])
              dynamicNFTContract = await ethers.getContract("DynamicNFT", deployer)
              mockAggregatorContract = await ethers.getContract("MockV3Aggregator", deployer)
          })

          describe("Constructor tests", () => {
              it("Check name and symbol", async () => {
                  const name = await dynamicNFTContract.name()
                  expect(name).equals("Price NFT", "NFT name should match")

                  const symbol = await dynamicNFTContract.symbol()
                  expect(symbol).equals("PNFT", "NFT symbol must match")
              })

              it("Check price feed address", async () => {
                  const priceFeedAddress = await dynamicNFTContract.getPriceFeed()

                  expect(priceFeedAddress).equals(
                      mockAggregatorContract.address,
                      "mock price feed address must match"
                  )
              })
          })

          describe("Price Tests", () => {
              it("Mock Aggregator Price", async () => {
                  const mockPrice = await dynamicNFTContract.getLatestRoundPrice()
                  expect(mockPrice.toString()).equals(
                      MOCK_PRICE,
                      "Mock price inside contract should match with initial value"
                  )
              })
          })

          describe("Mint NFT tests", () => {
              it("Emit Mint NFT event", async () => {
                  const mintVal = ethers.utils.parseEther("2000")
                  await expect(dynamicNFTContract.mintNFT(mintVal))
                      .to.emit(dynamicNFTContract, "CreatedNFT")
                      .withArgs(0, mintVal)
              })

              it("Token counter increases", async () => {
                  const mintVal = ethers.utils.parseEther("2000")
                  const ctrBeforeMinting = await dynamicNFTContract.getTokenId()
                  const tx = await dynamicNFTContract.mintNFT(mintVal)

                  await tx.wait(1)
                  const ctrAfterMinting = await dynamicNFTContract.getTokenId()
                  expect(ctrAfterMinting).equals(
                      ctrBeforeMinting.add(1),
                      "Counter should increase on minting"
                  )
              })

              it("Check if tokenURI is in correct format", async () => {
                  //token URI should have keys: name, description, image, attributes
                  // check if low SVG matches Heart SVG
                  // check if high SVG matches Cartman SVG

                  const mintVal = ethers.utils.parseEther("2000")
                  const tx = await dynamicNFTContract.mintNFT(mintVal)

                  await tx.wait(1)
                  const tokenId = await dynamicNFTContract.getTokenId()
                  const tokenUri = await dynamicNFTContract.tokenURI(tokenId.sub(1))

                  expect(tokenUri).includes("name", "token URI should have name key")
                  expect(tokenUri).includes("description", "token URI should have description key")
                  expect(tokenUri).includes("image", "token URI should have image key")
                  expect(tokenUri).includes("attributes", "token URI should have attributes key")
              })

              it("Check high SVG if mint value > price", async () => {
                  const mintVal = ethers.utils.parseEther("2000")
                  const tx = await dynamicNFTContract.mintNFT(mintVal)
                  await tx.wait(1)

                  const tokenId = await dynamicNFTContract.getTokenId()
                  const tokenUri = (await dynamicNFTContract.tokenURI(tokenId.sub(1))).substring(29)

                  const image = JSON.parse(tokenUri)["image"]

                  expect(image).equals(HEART_SVG_BASE64, "High Price SVG mismatch")
              })

              it("Check low SVG if mint value < price", async () => {
                  const mintVal = ethers.utils.parseEther("0.01")
                  const tx = await dynamicNFTContract.mintNFT(mintVal)
                  await tx.wait(1)

                  const tokenId = await dynamicNFTContract.getTokenId()
                  const tokenUri = (await dynamicNFTContract.tokenURI(tokenId.sub(1))).substring(29)

                  const image = JSON.parse(tokenUri)["image"]
                  expect(image).equals(CARTMAN_SVG_BASE64, "Low Price SVG mismatch")
              })
          })
      })
