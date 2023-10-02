const frontEndContractsFile =
    "../nft-marketplace-thegraph/constants/networkMapping.json"
const frontEndAbiLocation = "../nft-marketplace-thegraph/constants/"

const fs = require("fs")
const { network, ethers } = require("hardhat")
require("dotenv").config()

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front End Written!")
    }
}

async function updateAbi() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    fs.writeFileSync(
        `${frontEndAbiLocation}NftMarketplace.json`,
        nftMarketplace.interface.formatJson()
    )

    const basicNft = await ethers.getContract("BasicNft")
    fs.writeFileSync(
        `${frontEndAbiLocation}BasicNft.json`,
        basicNft.interface.formatJson()
    )
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const contractAddress = JSON.parse(
        fs.readFileSync(frontEndContractsFile, "utf8")
    )
    if (chainId in contractAddress) {
        if (
            !contractAddress[chainId]["NftMarketplace"].includes(
                nftMarketplace.target
            )
        ) {
            contractAddress[chainId]["NftMarketplace"].push(
                nftMarketplace.target
            )
        }
    } else {
        contractAddress[chainId] = { NftMarketplace: [nftMarketplace.target] }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddress))
}

module.exports.tags = ["all", "frontend"]
