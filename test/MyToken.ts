import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

describe("My Token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  beforeEach("should deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
  });
  describe("Basic state value check", () => {
    it("should check name", async () => {
      expect(await myTokenC.name()).to.equal("MyToken");
    });

    it("should check symbol", async () => {
      expect(await myTokenC.symbol()).to.equal("MT");
    });

    it("should check decimals", async () => {
      expect(await myTokenC.decimals()).to.equal(DECIMALS);
    });

    it("should return 100 total supply", async () => {
      expect(await myTokenC.totalSupply()).to.equal(
        MINTING_AMOUNT * 10n ** DECIMALS,
      );
    });
  });

  describe("Mint", () => {
    it("should return 1MT balance for signer", async () => {
      const signer0 = signers[0];
      expect(await myTokenC.balanceOf(signer0)).to.equal(
        MINTING_AMOUNT * 10n ** DECIMALS,
      );
    });

    it("should return or revert when minting infinity", async () => {
      const signer2 = signers[2];
      const mintingAgainAmount = hre.ethers.parseUnits("10000", DECIMALS);
      await expect(
        myTokenC.connect(signer2).mint(mintingAgainAmount, signer2.address),
      ).to.be.revertedWith("You are not authorized to manage this contract");
    });
  });

  describe("Transfer", () => {
    it("should have 0.5MT", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          signer1.address,
          hre.ethers.parseUnits("0.5", DECIMALS),
        ),
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.5", DECIMALS),
        );

      expect(1)
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.5", DECIMALS),
        );
      expect(await myTokenC.balanceOf(signer1)).equal(
        hre.ethers.parseUnits("0.5", DECIMALS),
      );
    });

    it("should be rejected with insufficient balance error", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          signer1.address,
          hre.ethers.parseUnits((MINTING_AMOUNT + 1n).toString(), DECIMALS),
        ),
      ).to.be.revertedWith("Insufficient balance");
    });
  });
  describe("TransferFrom", () => {
    it("should emit Approval event", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.approve(
          signer1.address,
          hre.ethers.parseUnits("10", DECIMALS),
        ),
      )
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, hre.ethers.parseUnits("10", DECIMALS));
    });
    it("should be reverted with insufficient allowance error", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(
            signer0.address,
            signer1.address,
            hre.ethers.parseUnits("1", DECIMALS),
          ),
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("should approve and transferFrom 10 MT, then check balances", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const transferAmount = hre.ethers.parseUnits("10", DECIMALS);

      // 1. approve: signer1에게 signer0의 자산 이동권한 부여
      await myTokenC.approve(signer1.address, transferAmount);

      // 2. transferFrom: signer1이 signer0의 MT토큰을 자신의 주소(signer1)에게 전송
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, transferAmount),
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(signer0.address, signer1.address, transferAmount);

      // 3. balance 확인
      expect(await myTokenC.balanceOf(signer1.address)).to.equal(
        transferAmount,
      );
      expect(await myTokenC.balanceOf(signer0.address)).to.equal(
        hre.ethers.parseUnits(MINTING_AMOUNT.toString(), DECIMALS) -
          transferAmount,
      );
    });

    it("should fail transferFrom when amount exceeds minted supply", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const excessAmount = hre.ethers.parseUnits(
        (MINTING_AMOUNT + 1n).toString(),
        DECIMALS,
      );

      await myTokenC.approve(signer1.address, excessAmount);

      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, excessAmount),
      ).to.be.reverted;
    });
  });
});
