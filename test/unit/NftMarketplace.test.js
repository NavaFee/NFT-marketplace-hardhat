const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Tests", function () {
          let nftMarketplace, basicNft, deployer, player, accounts
          const PRICE = ethers.parseEther("0.1")
          const TOKEN_ID = 0
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer

              accounts = await ethers.getSigners()
              player = accounts[1]

              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract("NftMarketplace")
              basicNft = await ethers.getContract("BasicNft")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.target, TOKEN_ID)
          })

          describe("listItem", function () {
              it("emits an event after listing an item", async function () {
                  expect(
                      await nftMarketplace.listItem(
                          basicNft.target,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.emit(nftMarketplace, "ItemListed")
              })
              it("exclusively items that haven't been listed", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__AlreadyListed"
                  )
              })
              it("exclusively allows owners to list", async function () {
                  nftMarketplace = nftMarketplace.connect(player)
                  await basicNft.approve(player.address, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotOwner"
                  )
              })

              it("needs approvals to list item", async function () {
                  await basicNft.approve(player.address, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotApprovedForMarketplace"
                  )
              })

              it("Updates listing with seller and price", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  const listing = await nftMarketplace.getListing(
                      basicNft.target,
                      TOKEN_ID
                  )
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.seller == deployer)
              })

              it("reverts if the price be 0", async () => {
                  const ZERO_PRICE = ethers.parseEther("0")
                  await expect(
                      nftMarketplace.listItem(
                          basicNft.target,
                          TOKEN_ID,
                          ZERO_PRICE
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero"
                  )
              })
          })

          describe("cancelListing", function () {
              it("reverts if there is no listing", async function () {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.target, TOKEN_ID)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotListed"
                  )
              })

              it("reverts if anyone but the owner tyies to call", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      nftMarketplace.cancelListing(basicNft.target, TOKEN_ID)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotOwner"
                  )
              })

              it("emits event and removes listing", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  expect(
                      await nftMarketplace.cancelListing(
                          basicNft.target,
                          TOKEN_ID
                      )
                  ).to.emit(nftMarketplace, "ItemCanceled")
                  const listing = await nftMarketplace.getListing(
                      basicNft.target,
                      TOKEN_ID
                  )
                  assert(listing.price.toString() == "0")
              })
          })

          describe("buyItem", function () {
              it("reverts if the item isn't listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotListed"
                  )
              })
              it("reverts if the price isn't met", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__PriceNotMet"
                  )
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.emit(nftMarketplace, "ItemBought")
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(
                      deployer
                  )
                  assert(newOwner.toString() == player.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })
          })
          describe("updateListing", function () {
              it("must be owner and listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.target,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotListed"
                  )
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.target,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NotOwner"
                  )
              })
              it("reverts if new price is 0", async function () {
                  const updatedPrice = ethers.parseEther("0")
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.target,
                          TOKEN_ID,
                          updatedPrice
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero"
                  )
              })
              it("updates the price of the item", async function () {
                  const updatedPrice = ethers.parseEther("0.2")
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  expect(
                      await nftMarketplace.updateListing(
                          basicNft.target,
                          TOKEN_ID,
                          updatedPrice
                      )
                  ).to.emit("ItemListed")
                  const listing = await nftMarketplace.getListing(
                      basicNft.target,
                      TOKEN_ID
                  )
                  assert(listing.price.toString() == updatedPrice.toString())
              })
          })

          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdrawls", async function () {
                  await expect(
                      nftMarketplace.withdrawProceeds()
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NFTMarketplace__NoProceeds"
                  )
              })

              it("withdraws proceeds", async function () {
                  await nftMarketplace.listItem(
                      basicNft.target,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplace = nftMarketplace.connect(player)
                  await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                      value: PRICE,
                  })
                  nftMarketplace = nftMarketplace.connect(accounts[0])

                  const deployerProceedsBefore =
                      await nftMarketplace.getProceeds(deployer)

                  const deployerBalanceBefore =
                      await player.provider.getBalance(accounts[0])

                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, gasPrice } = txReceipt

                  const gasCost = gasUsed * gasPrice
                  const deployerBalanceAfter = await player.provider.getBalance(
                      accounts[0]
                  )

                  assert(
                      (deployerBalanceAfter + gasCost).toString() ==
                          (
                              deployerBalanceBefore + deployerProceedsBefore
                          ).toString()
                  )
              })
          })

          it("lists and can be bought", async function () {
              await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
              const playerConnectedNftMarketplace =
                  nftMarketplace.connect(player)
              await playerConnectedNftMarketplace.buyItem(
                  basicNft.target,
                  TOKEN_ID,
                  { value: PRICE }
              )
              const newOwner = await basicNft.ownerOf(TOKEN_ID)
              const deployerProceeds = await nftMarketplace.getProceeds(
                  deployer
              )
              assert(newOwner.toString() == player.address)
              assert(deployerProceeds.toString() == PRICE.toString())
          })
      })
