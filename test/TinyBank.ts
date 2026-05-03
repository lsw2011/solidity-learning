import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let tinyBankC: TinyBank;
  beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
    tinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
    ]);
    await myTokenC.setManager(await tinyBankC.getAddress());
  });

  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await tinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("Staking", async () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await tinyBankC.totalStaked()).equal(stakingAmount);
      expect(await myTokenC.balanceOf(tinyBankC)).equal(
        await tinyBankC.totalStaked(),
      );
    });
  });

  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
      for (var i = 0; i < BLOCKS; i++) {
        await myTokenC.transfer(signer0.address, transferAmount);
      }

      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString()),
      );
    });

    // it("should revert when changing rewardperblock by hacker", async () => {
    //   const hacker = signers[2];
    //   const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);
    //   await expect(
    //     tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange),
    //   ).to.be.revertedWith("You are not authorized to manage this contract");
    // });

    describe("MultiManager", () => {
      it("should revert with 'You are not a manager' when non-manager calls setRewardPerBlock", async () => {
        const notManager = signers[4];
        const rewardToChange = hre.ethers.parseUnits("100", DECIMALS);
        await expect(
          tinyBankC.connect(notManager).setRewardPerBlock(rewardToChange),
        ).to.be.revertedWith("You are not a manager");
      });

      it("should revert with 'Not all confirmed yet' when not all managers confirmed", async () => {
        const manager1 = signers[1];
        const manager2 = signers[2];
        const manager3 = signers[3];

        await tinyBankC.addManager(manager1.address);
        await tinyBankC.addManager(manager2.address);
        await tinyBankC.addManager(manager3.address);

        await tinyBankC.connect(manager1).confirm();

        const rewardToChange = hre.ethers.parseUnits("10", DECIMALS);
        await expect(
          tinyBankC.connect(manager1).setRewardPerBlock(rewardToChange),
        ).to.be.revertedWith("Not all confirmed yet");
      });

      it("should change rewardPerBlock when all managers confirmed", async () => {
        const manager1 = signers[1];
        const manager2 = signers[2];
        const manager3 = signers[3];

        await tinyBankC.addManager(manager1.address);
        await tinyBankC.addManager(manager2.address);
        await tinyBankC.addManager(manager3.address);

        await tinyBankC.connect(manager1).confirm();
        await tinyBankC.connect(manager2).confirm();
        await tinyBankC.connect(manager3).confirm();

        const rewardToChange = hre.ethers.parseUnits("10", DECIMALS);
        await expect(
          tinyBankC.connect(manager1).setRewardPerBlock(rewardToChange),
        ).to.not.be.reverted;
      });
    });
  });
});
