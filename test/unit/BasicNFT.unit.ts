// Unit tests for Basic NFT contract

import { assert, expect } from "chai"
import { developmentChains } from "../../helper-hardhat-config"
import { network, ethers, deployments } from "hardhat"
import { BasicNFT } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT unit tests", () => {
          let basicNft: BasicNFT
          let deployer: SignerWithAddress

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]

              await deployments.fixture(["mocks", "basicnft"])
              basicNft = await ethers.getContract("BasicNFT", deployer)
              //   console.log("basic nft contract", basicNft)
          })

          describe("constructor tests", () => {
              it("check name in constructor", async () => {
                  // const tx = basicNft()
                  const name = await basicNft.name()
                  expect(name).equals("0Kage", "NFT name mismatch")
              })

              it("check symbol in constructore", async () => {
                  const symbol = await basicNft.symbol()
                  expect(symbol).equals("0k", "NFT symbol mismatch")
              })

              it("check initial token Id", async () => {
                  const tokenId = await basicNft.getTokenId()
                  expect(tokenId.toString()).equals(
                      "0",
                      "Token id initialization value should be 0"
                  )
              })
          })

          describe("mint nft", () => {
              it("mint function checks", async () => {
                  const oldTokenId = await basicNft.getTokenId()

                  const mintTx = await basicNft.mint()

                  await mintTx.wait(1)

                  const newTokenId = await basicNft.getTokenId()
                  expect(oldTokenId.add(1).toString()).equals(
                      newTokenId.toString(),
                      "Token increment by 1 on minting"
                  )

                  const tokenUri = await basicNft.tokenURI(0)
                  const uri =
                      "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json"
                  expect(tokenUri).equals(uri, "Token URI of minted NFT does not match")
              })
          })
      })
