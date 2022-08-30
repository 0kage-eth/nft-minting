import fs from "fs"

const readFileContent = (filePath: string) => {
    const content = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" })
    return content
}

export default readFileContent
