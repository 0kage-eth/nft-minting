import { network } from "hardhat"
import { DeployFunction, DeployResult } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { verify } from "../utils/verify"

const deployNFT: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network, ethers } = hre
    const { log, deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const isDevelopmentChain = developmentChains.includes(network.name)
    const waitBlockConfirmations = isDevelopmentChain ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
    const args: any[] = ["0Kage", "0k"]

    const basicNft: DeployResult = await deploy("BasicNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 1,
    })

    console.log(
        `Basic NFT deployed at address ${basicNft.address}. Transaction hash is ${basicNft.transactionHash}`
    )

    console.log("-------------------------")

    // Verifying contract only if it is not part of development chains
    if (!isDevelopmentChain) {
        // console.log("Verifying contract...")

        await verify(basicNft.address, args)
    }
}

export default deployNFT

deployNFT.tags = ["all", "basicnft", "main"]
