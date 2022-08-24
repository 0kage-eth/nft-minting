import { VRFCoordinatorV2Mock } from "../typechain-types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { storeImages, storeMetaData } from "../utils/uploadToPinata"
import "dotenv/config"

const imagesLocation = "./images"

const metaDataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Coolness",
            value: 100,
        },
        {
            trait_type: "Characters",
            value: 1,
        },
    ],
}

/**
 * @notice tokenURI's need to be genrated and uploaded to Pinata
 * @notice if tokenURI's already exist, then we can just hardcode
 * @notice I've assigned the flag process.env.UPLOAD_TO_PINATA = true
 * @notice generated the tokenuris and put the flag back to false
 * @notice once done, I have hardcoded the URI's below.
 * @notice set flag to true & deploy if you want to create your own NFTs
 */

let tokenURIs = [
    "ipfs://QmXbf8LeRKDwSpnksedcXvrycFoG6vM7nWugbJco9YsNVp",
    "ipfs://QmZC8kUvByDJBez1z9NSpB5Vah8xMCcsYXB9wJQDFc1Fsr",
    "ipfs://QmT65T7sxybWcsTWKwd19ct5o8GLs2pLLe4NsqF4VMoxfb",
    "ipfs://QmUgcrh8qALXxmt7s3fjhAPWEGEJ4hpbjpZXdgyAXkTNhR",
    "ipfs://QmXtaRVmxeNwRxHcU9VWcUqurWXC7zNLAivaE3Y8y2uvsp",
]

/**
 * @notice Deploy Randomized NFT Contract
 * @notice If network is local, get contract address and create a subscription id
 * @notice if network is testnet or mainnet, get address and subscription id from networkConfig
 * @notice Upload NFT images in images folder to ipfs
 */

const deployRandomizedNFT = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, ethers, getNamedAccounts } = hre

    const { log, deploy } = deployments
    const { deployer } = await getNamedAccounts()
    // let tokenURIs: string[] = []
    /**
     * @dev get IPFS hashes of images stored in images folder
     * @dev we upload images to pinata & get the tokenURI's for uploaded images
     */
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenURIs = await getTokenUris()
    }

    const fundLink = ethers.utils.parseEther("10") // fund amount used to initially fund VRF contract

    let vrfContractAddress: string = "",
        subscriptionId: string = "",
        keyHash: string = "",
        callbackGasLimit: string = "",
        minEth: string = ""

    let numConfirmations: number = 1,
        numWords: number = 1

    /**
     * @dev local network - then get the VRF coordinator mock address
     */
    const chainId = network.config.chainId
    if (chainId) {
        if (developmentChains.includes(network.name)) {
            const vrfContract: VRFCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            )
            vrfContractAddress = vrfContract.address
            const creatSubscriptionTx = await vrfContract.createSubscription()
            const subReceipt = await creatSubscriptionTx.wait(1)
            const subEvent = subReceipt!.events![0]
            subscriptionId = subEvent.args!.subId
            await vrfContract.fundSubscription(subscriptionId, fundLink)
        } else {
            if (chainId) {
                vrfContractAddress = networkConfig[chainId].vrfCoordinator!
                subscriptionId = networkConfig[chainId].subscriptionId!
            }
        }
        numConfirmations = networkConfig[chainId].blockConfirmations!
        callbackGasLimit = networkConfig[chainId].callbackGasLimit!
        minEth = networkConfig[chainId].minEth!
        keyHash = networkConfig[chainId].keyHash!
        let args: any[] = [
            subscriptionId,
            vrfContractAddress,
            keyHash,
            numConfirmations,
            callbackGasLimit,
            1,
            ethers.utils.parseEther(minEth),
            "0Kage",
            "0K",
            tokenURIs,
        ]
        console.log("args passed into randomized nft deployer", args)
        const txResponse = await deploy("RandomizedNFT", {
            from: deployer,
            log: true,
            waitConfirmations: numConfirmations,
            args: args,
        })

        console.log(`randomized nft contract deployed with txn hash: ${txResponse.transactionHash}`)
    }
}

/**
 * @notice getTokenUris uploads data in imageLocation folder onto pinata and returns a list of tokenUris
 * @notice tokenUris are what is stored on blockchain - this will give us a decentralized access to files
 * @returns tokenUris[] - each element contains metadata (name, description, image IPFS url and attributes (this could be image specific information))
 */

const getTokenUris = async () => {
    let tokenUris: string[] = []

    /**
     * @dev We need to store images in IPFS
     * @dev We need to store meta data in IPFS
     * @dev first we call storeImages() to store images
     * @dev then we use storeMetaData() to store metadata that includes image path obtained in previous step
     */

    // Uploading images to pinata & getting their ipfs location
    const { responses, files } = await storeImages(imagesLocation)

    let metadataResponses: any[] = []

    /**
     * @dev run Promise.all() to resolve all metadataResponses asynchronously
     * @dev by the end of this step, we will record metadata for each image
     * @dev images are already stored -> so we create a description/image listing for each image
     */
    metadataResponses = await Promise.all(
        responses.map(async (response, indx) => {
            const file = files[indx]

            let metadata = { ...metaDataTemplate }
            metadata.name = file.split(".")[0]
            metadata.description = "Tobikage : Ninja Robots"
            metadata.image = `ipfs://${response.IpfsHash}`

            console.log(`metadata for element ${indx}`, metadata)

            // run storeMetaData() to upload metadata specific to each image stored previously
            const metadataResponse = await storeMetaData(metadata)
            return metadataResponse
        })
    )

    /**
     * @dev map over metadata responses to get tokenUris - this is what we need
     */
    metadataResponses.map((response) => tokenUris.push(`ipfs://${response.IpfsHash}`))

    return tokenUris
}

export default deployRandomizedNFT
deployRandomizedNFT.tags = ["all", "mocks", "main", "randomipfs"]
