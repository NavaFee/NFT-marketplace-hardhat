const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const args = []
    const NftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log("---------------------------------------------------")
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(NftMarketplace.address, args)
    }
    log("---------------------------------------------------")
}

module.exports.tags = ["all", "nftmarketplace"]
