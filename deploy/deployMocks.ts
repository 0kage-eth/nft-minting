import { developmentChains } from "../helper-hardhat-config"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

/**
 * @title deploys mock for VRFCoordinator (random number generator)
 * @dev deploy mock only if chain is on local network
 * @param hre hardhat runtime environment variable
 */
const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre
    const { log, deploy } = deployments
    const { deployer } = await getNamedAccounts()

    const BASE_FEE = "250000000000000000"
    const GAS_PRICE_PER_LINK = 1e9

    const DECIMALS = "18"
    const INITIAL_ANSWER = "200000000000000000000"

    // deploy mocks only if current chain is localhost/hardhat
    if (developmentChains.includes(network.name)) {
        log("Local network detected... Deploying mocks")

        log("Deploying VRFCoordinatorV2Mock...for dummy random number generation")
        let args: any[] = [BASE_FEE, GAS_PRICE_PER_LINK]
        const vrfDeploy = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
        })

        log(`VRFCoordinatorV2Mock is deployed successfully at ${vrfDeploy.address}`)

        log("Deploying MockV3Aggregator... for sending dummy ETH prices")

        args = [DECIMALS, INITIAL_ANSWER]
        const priceDeploy = await deploy("MockV3Aggregator", {
            from: deployer,
            args: args,
            log: true,
        })

        log(`MockV3Aggregator is deployed successfully at ${priceDeploy.address}`)

        log("All mocks deployed...")
    }
}

export default deployMocks
deployMocks.tags = ["all", "mocks", "main"]
