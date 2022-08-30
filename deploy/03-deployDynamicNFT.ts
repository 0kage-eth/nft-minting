import { HardhatRuntimeEnvironment } from "hardhat/types"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import readFileContent from "../utils/readFile"
import path from "path"
import { verify } from "../utils/verify"
import { MockV3Aggregator } from "../typechain-types"
/**
 * @notice deploys dynamic NFT contract with svg files as input
 * @param hre hardhat run time environment
 */
const deployDynamicNFT = async (hre: HardhatRuntimeEnvironment) => {
    // get ethers, deployments from hre
    const { ethers, deployments, getNamedAccounts, network } = hre
    const { log, deploy } = deployments
    const { deployer } = await getNamedAccounts()
    let priceFeedAddress: string
    const chainId = network.config.chainId
    // get high and low NFT file contents -> read file and store it in string
    if (developmentChains.includes(network.name)) {
        log("Development chain detected... getting V3AggregatorMock for pricing...")
        const mockAggregatorContract: MockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator"
        )
        priceFeedAddress = mockAggregatorContract.address
    } else {
        priceFeedAddress = networkConfig[chainId!]["ethUsdPriceFeed"] || ""
    }
    // get price feed for local/rinkeby address
    // create price feed mock if local
    const highSvg = readFileContent(path.resolve("./images", "cartman.svg"))
    const lowSvg = readFileContent(path.resolve("./images", "heart.svg"))

    // deploy contract,
    const args: any[] = ["Price NFT", "PNFT", priceFeedAddress, lowSvg, highSvg]
    log("deploying Dynamic NFT contract....")
    const tx = await deploy("DynamicNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: 1,
    })
    // verify contract
    if (!developmentChains.includes(network.name)) {
        log("verifying contract...")
        await verify(tx.address, args)
        log("contract verified...")
    }
}

export default deployDynamicNFT
deployDynamicNFT.tags = ["all", "main", "dynamic"]
