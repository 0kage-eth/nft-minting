import { HardhatRuntimeEnvironment } from "hardhat/types"
import { developmentChains } from "../helper-hardhat-config"
import { BasicNFT, DynamicNFT, RandomizedNFT, VRFCoordinatorV2Mock } from "../typechain-types"
import hre from "hardhat"

/**
 * @notice mints a NFT of all 3 types we built - basic NFT, randomized NFT and dynamic NFT
 * @dev note that for randomized nft's, we have to mimic keepers and fulfil random number request
 * @param hre Hardhat run time environment
 */
const mintNFTs = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers, network } = hre

    const { deployer } = await getNamedAccounts()

    // deploy all contracts
    if (developmentChains.includes(network.name)) {
        await deployments.fixture(["main"])
    }

    // ******* MINT BASIC NFT *********************

    // const basicNFTContract: BasicNFT = await ethers.getContract("BasicNFT", deployer)

    // const basicNFTMintTx = await basicNFTContract.mint()
    // const basicNFTMintReceipt = await basicNFTMintTx.wait(1)
    // const basicNFTTokenId = await basicNFTContract.getTokenId()

    // console.log(`Basic NFT minted. Txn hash is ${basicNFTMintReceipt.transactionHash}`)
    // console.log(`Basic NFT Token URI is ${await basicNFTContract.tokenURI(basicNFTTokenId)}`)

    // ************* MINT DYNAMIC NFT ********************

    const dynamicNFTContract: DynamicNFT = await ethers.getContract("DynamicNFT", deployer)
    const highVal = ethers.utils.parseEther("4000")
    const dynamicNFTTx = await dynamicNFTContract.mintNFT(highVal)

    const dynamicNFTTxReceipt = await dynamicNFTTx.wait(1)
    const dynamicNFTTokenId = await dynamicNFTContract.getTokenId()

    console.log(`Dynamic NFT minted. Txn hash is ${dynamicNFTTxReceipt.transactionHash}`)
    console.log(
        `Dynamic NFT Token URI is ${await dynamicNFTContract.tokenURI(dynamicNFTTokenId.sub(1))}`
    )

    // ******* MINT RANDOMIZED NFT *********************
    // this happens when keepers verify a random number, based on which we mint a nft
    // since the timing of nft mint is not under our control, we need to keep listening for an event here

    // const randomizedNFTContract: RandomizedNFT = await ethers.getContract("RandomizedNFT", deployer)
    // const randomNFTMintTx = await randomizedNFTContract.requestNft({
    //     value: ethers.utils.parseEther("0.01"),
    // })
    // const randomNFTMintReceipt = await randomNFTMintTx.wait(1)

    // await new Promise(async (resolve, reject) => {
    //     setTimeout(() => reject("Couldn't detect NFTMint event in designated time"), 300000)

    //     randomizedNFTContract.once("NFTMinted", async () => {
    //         resolve("success")
    //     })

    //     if (developmentChains.includes(network.name)) {
    //         const requestId = randomNFTMintReceipt.events![1].args!.requestId

    //         //request randomwords
    //         const vrfCoordinatorMockContract: VRFCoordinatorV2Mock = await ethers.getContract(
    //             "VRFCoordinatorV2Mock",
    //             deployer
    //         )

    //         await vrfCoordinatorMockContract.fulfillRandomWords(
    //             requestId,
    //             randomizedNFTContract.address
    //         )
    //     }
    // })

    // const randomizedNFTTokenId = await randomizedNFTContract.getTokenId()
    // console.log(`Randomized NFT minted. Txn hash is ${randomNFTMintReceipt.transactionHash}`)
    // console.log(
    //     `Randomized NFT Token URI is ${await randomizedNFTContract.tokenURI(
    //         randomizedNFTTokenId.sub(1)
    //     )}`
    // )
}

mintNFTs(hre)
    .then(() => {
        console.log("NFT minting successfully completed")
        process.exit(0)
    })
    .catch((e) => {
        console.log("NFT mint error!")
        console.error(e)
        process.exit(1)
    })
