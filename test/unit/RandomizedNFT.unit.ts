import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, ethers, deployments, getNamedAccounts } from "hardhat"

import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { RandomizedNFT, VRFConsumerBaseV2 } from "../../typechain-types"

/**
 * @dev check if its a development chain
 */

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Randomized NFT Minting Tests", () => {
          let randomizedNftContract: RandomizedNFT
          let deployer: SignerWithAddress

          const { log, deploy } = deployments
          const chainId = network.config.chainId || 0
          /**
           * @dev Create randomized nft contract
           */
          beforeEach(async () => {
              const { deployer, feeCollector } = await getNamedAccounts()

              await deployments.fixture(["mocks", "randomipfs"])
              randomizedNftContract = await ethers.getContract("RandomizedNFT", deployer)
          })

          describe("Constructor tests", () => {
              // check if min amount is rightly set
              it("Check if min mint amount is set", async () => {
                  const mintVal = await randomizedNftContract.getMinMintValue()
                  const minEth = networkConfig[chainId].minEth || "0"
                  expect(mintVal.toString()).equals(
                      ethers.utils.parseEther(minEth).toString(),
                      "Minimum eth value mismatch"
                  )
              })

              // check if uri's are being assigned correctly
              it("Check if uris are stored correctly", async () => {
                  const uri2 = "ipfs://QmZC8kUvByDJBez1z9NSpB5Vah8xMCcsYXB9wJQDFc1Fsr"

                  const uriNft = await randomizedNftContract.getUri(1)

                  expect(uriNft).equals(uri2, "Uris are incorrectly stored")
              })
          })

          // Request NFT
          describe("Request NFT tests", () => {
              it("Min NFT mint value exception", async () => {
                  const sentValue = ethers.utils.parseEther("0.0001")
                  const minEth = ethers.utils.parseEther(networkConfig[chainId].minEth || "0")
                  await expect(
                      randomizedNftContract.requestNft({
                          value: sentValue,
                      })
                  )
                      .to.be.revertedWithCustomError(
                          randomizedNftContract,
                          "RandomizedNFT_NotEnoughEth"
                      )
                      .withArgs(sentValue, minEth)
              })

              it("Emit NFT requested event", async () => {
                  const sentValue = ethers.utils.parseEther("1")

                  await expect(randomizedNftContract.requestNft({ value: sentValue })).to.emit(
                      randomizedNftContract,
                      "NFTRequested"
                  )
              })
          })

          // 1. check if NFT requested event is emitted
          // 2. check if exception when amount < min
          describe("mint NFT tests", () => {
              it("check if NFT mint event is emitted", async () => {})

              it("check if min amount", async () => {})
          })

          // fulfil random words
          // 1. check if token id is increasing by 1
          // 2. Based on random number check which nft will be minted
          // 3 Check if NFT minted event is emitted

          // withdraw eth
          // 1. check if can be accessed only by owner
          // 2. check if contract balance goes to zero
          // 3. check if balance adds up in owner address
      })
