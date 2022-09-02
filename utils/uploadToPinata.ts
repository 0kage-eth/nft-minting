import pinataSDK from "@pinata/sdk"
import path from "path"
import fs from "fs"
import "dotenv/config"

const pinataApiKey: string = process.env.PINATA_API_KEY || ""
const pinataApiSecret: string = process.env.PINATA_API_SECRET || ""

// console.log("pinata api key", pinataApiKey)
// console.log("pinata api secret", pinataApiSecret)

const pinata = pinataSDK(pinataApiKey, pinataApiSecret)

/**
 * @notice Stores images from file path to pinata service (ipfs storage)
 * @param imageFolderPath path of the image folder that contains all images to be uploaded
 * @returns
 */
export const storeImages = async (imageFolderPath: string) => {
    const fullPath = path.resolve(imageFolderPath)
    console.log("uploading to pinata...")
    const files = fs.readdirSync(fullPath)
    let responses: any[] = []

    /**
     * @dev we use Promise.All built-in call
     * @dev waits for all promises to resolve and collects results in an array responses
     * @dev once done, we will see on pinata front end that files are uploaded
     * @dev whenever we need to make an async call inside map, we use Promise.all()
     */
    responses = await Promise.all(
        files.map(async (file) => {
            const readableStream = fs.createReadStream(`${fullPath}/${file}`)
            try {
                console.log(`working on uploading file ${file} to pinata..`)
                const response = await pinata.pinFileToIPFS(readableStream)

                console.log("response", response)

                return response
            } catch (e) {
                console.error(e)
                console.log("Error in pinata file upload!")
            }
        })
    )

    return { responses, files }
}

export const storeMetaData = async (metadata: Object) => {
    try {
        const response = await pinata.pinJSONToIPFS(metadata)
        return response
    } catch (e) {
        console.error(e)
        console.log("Error storing metadata to pinata")
    }
}
