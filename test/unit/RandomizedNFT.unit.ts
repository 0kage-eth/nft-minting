import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, ethers, deployments, getNamedAccounts } from "hardhat"

import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { RandomizedNFT, VRFCoordinatorV2Mock } from "../../typechain-types"

/**
 * @dev check if its a development chain
 */

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Randomized NFT Minting Tests", () => {
          let randomizedNftContract: RandomizedNFT
          let vrfCoordinatorContract: VRFCoordinatorV2Mock

          let minter: string

          const { log, deploy } = deployments
          const chainId = network.config.chainId || 0
          /**
           * @dev Create randomized nft contract
           */
          beforeEach(async () => {
              const { deployer, feeCollector } = await getNamedAccounts()
              minter = deployer
              await deployments.fixture(["mocks", "randomipfs"])
              randomizedNftContract = await ethers.getContract("RandomizedNFT")
              vrfCoordinatorContract = await ethers.getContract("VRFCoordinatorV2Mock")
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

                  await expect(randomizedNftContract.requestNft({ value: sentValue }))
                      .to.emit(randomizedNftContract, "NFTRequested")
                      .withArgs(() => true, minter)
              })
          })

          /**
           * @dev challenge here is - fulfilRandomWords() is a function called by keepers - it is not called by users manually
           * @dev but we need to run test cases, to check if logic performs correctly once this gets executed
           * @dev to replicate this behavior, we keep listening for NFTMinted event until we catch it (once requestRandomWords gets executed)
           * @dev first time we listen to that event, we check if NFT is minted (check tokenURI(0) includes a link starting with 'ipfs://' ( tokenId starts from zero, remember)
           * @dev next we need to check if current token id is 1 (everytime NFT is minted, token ID goes up by 1)
           *
           */
          describe("mint NFT tests", () => {
              it("check if NFTMint event is emitted in RandomizedNFT", async () => {
                  // first send a response to NFT
                  const requestResponse = await randomizedNftContract.requestNft({
                      value: ethers.utils.parseEther("1"),
                  })

                  // requestID will be available as an event in receipt - we get receipt by waiting 1 block
                  const requestReceipt = await requestResponse.wait(1)

                  // in Request NFT, there are 2 events emitted
                  // event 0 is RandomWordsRequested called from within VRFCoordinatorV2Mock (chk here: https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol)
                  // event 1 is NFTRequest
                  // since requestId is emitted out of NFTRequest, we are using events[1] below (second in array)
                  const requestId = requestReceipt.events![1].args!.requestId

                  // On fulfil randomwords, chain of events are emitted
                  // first -> Transfer() event emitted within _mint() function of ERC721 contract (check _mint() code here: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol)
                  // second -> our custom event NFTMinted() is emitted within requestRandomWords() override function
                  // third -> chainlink event RandomWordsFulfiled is emitted (check code here:  https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol)
                  // we check for all 3 events

                  await expect(
                      vrfCoordinatorContract.fulfillRandomWords(
                          requestId,
                          randomizedNftContract.address
                      )
                  ).to.emit(randomizedNftContract, "NFTMinted")
              })

              it("check if NFTMint event is emitted in ERC721", async () => {
                  // first send a response to NFT
                  const requestResponse = await randomizedNftContract.requestNft({
                      value: ethers.utils.parseEther("1"),
                  })

                  // requestID will be available as an event in receipt - we get receipt by waiting 1 block
                  const requestReceipt = await requestResponse.wait(1)

                  // in Request NFT, there are 2 events emitted
                  // event 0 is RandomWordsRequested called from within VRFCoordinatorV2Mock (chk here: https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol)
                  // event 1 is NFTRequest
                  // since requestId is emitted out of NFTRequest, we are using events[1] below (second in array)
                  const requestId = requestReceipt.events![1].args!.requestId

                  // On fulfil randomwords, chain of events are emitted
                  // first -> Transfer() event emitted within _mint() function of ERC721 contract (check _mint() code here: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol)
                  // second -> our custom event NFTMinted() is emitted within requestRandomWords() override function
                  // third -> chainlink event RandomWordsFulfiled is emitted (check code here:  https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol)
                  // we check for all 3 events

                  await expect(
                      vrfCoordinatorContract.fulfillRandomWords(
                          requestId,
                          randomizedNftContract.address
                      )
                  ).to.emit(randomizedNftContract, "Transfer")
              })

              it("check if RandomWordsRequested event is emitted in VRFCoordinatormock", async () => {
                  const requestResponse = await randomizedNftContract.requestNft({
                      value: ethers.utils.parseEther("1"),
                  })

                  const requestReceipt = await requestResponse.wait(1)

                  const requestId = requestReceipt.events![1].args!.requestId

                  await expect(
                      vrfCoordinatorContract.fulfillRandomWords(
                          requestId,
                          randomizedNftContract.address
                      )
                  ).to.emit(vrfCoordinatorContract, "RandomWordsFulfilled")
              })

              it("check if tokenURI is updated on minting", async () => {
                  await new Promise<string>(async (resolve, reject) => {
                      randomizedNftContract.once("NFTMinted", async () => {
                          try {
                              const nftTokenUri = await randomizedNftContract.getUri("0")

                              // assert that nftTokenUri begins with "ipfs://"
                              assert.equal(nftTokenUri.includes("ipfs://"), true)

                              // token id should be 1
                              const nftId = await randomizedNftContract.getTokenId()
                              expect(nftId.toString()).equals(
                                  "1",
                                  "current nft id after first mint should be 1"
                              )

                              resolve("Success")
                          } catch (e) {
                              console.error(e)
                              reject()
                          }
                      })

                      try {
                          const requestNftResponse = await randomizedNftContract.requestNft({
                              value: ethers.utils.parseEther("1"),
                          })
                          const txReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorContract.fulfillRandomWords(
                              txReceipt.events![1].args!.requestId,
                              randomizedNftContract.address
                          )
                      } catch (e) {
                          console.error(e)
                      }
                  })
              })
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
