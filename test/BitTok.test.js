const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BitTok", function () {
  let bitTok;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const BitTok = await ethers.getContractFactory("BitTok");
    bitTok = await BitTok.deploy();
    await bitTok.waitForDeployment();
  });

  describe("토큰 생성", function () {
    it("사용자가 토큰을 생성할 수 있어야 한다", async function () {
      await expect(
        bitTok.connect(user1).createToken("User1Token", "U1T")
      ).to.emit(bitTok, "TokenCreated");

      expect(await bitTok.hasToken(user1.address)).to.be.true;

      const tokenInfo = await bitTok.getUserTokenInfo(user1.address);
      expect(tokenInfo.name).to.equal("User1Token");
      expect(tokenInfo.symbol).to.equal("U1T");
      expect(tokenInfo.totalSupply).to.equal(ethers.parseEther("21000000"));
    });

    it("한 사용자는 하나의 토큰만 생성할 수 있어야 한다", async function () {
      await bitTok.connect(user1).createToken("User1Token", "U1T");

      await expect(
        bitTok.connect(user1).createToken("User1Token2", "U1T2")
      ).to.be.revertedWith("해당 주소는 이미 토큰을 보유하고 있습니다");
    });

    it("빈 이름이나 심볼로는 토큰을 생성할 수 없어야 한다", async function () {
      await expect(
        bitTok.connect(user1).createToken("", "U1T")
      ).to.be.revertedWith("토큰 이름을 입력해주세요");

      await expect(
        bitTok.connect(user1).createToken("User1Token", "")
      ).to.be.revertedWith("토큰 심볼을 입력해주세요");
    });
  });

  describe("교환 제안 시스템", function () {
    beforeEach(async function () {
      await bitTok.connect(user1).createToken("User1Token", "U1T");
      await bitTok.connect(user2).createToken("User2Token", "U2T");
    });

    it("교환 제안을 생성할 수 있어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      await expect(
        bitTok.connect(user1).proposeExchange(user2.address, amount)
      ).to.emit(bitTok, "ExchangeProposed");

      const proposals = await bitTok.getReceivedProposals(user2.address);
      expect(proposals.length).to.equal(1);
    });

    it("교환 제안을 승인할 수 있어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      // 제안 생성
      await bitTok.connect(user1).proposeExchange(user2.address, amount);
      const proposals = await bitTok.getReceivedProposals(user2.address);
      const proposalId = proposals[0];

      // 초기 잔액 확인
      const user1TokenAddress = await bitTok.getUserToken(user1.address);
      const user2TokenAddress = await bitTok.getUserToken(user2.address);

      const user1InitialBalance = await bitTok.getTokenBalance(
        user1.address,
        user1TokenAddress
      );
      const user2InitialBalance = await bitTok.getTokenBalance(
        user2.address,
        user2TokenAddress
      );

      // 제안 승인
      await expect(bitTok.connect(user2).acceptExchange(proposalId))
        .to.emit(bitTok, "ExchangeAccepted")
        .to.emit(bitTok, "TokensExchanged");

      // 잔액 변화 확인
      const user1FinalBalance = await bitTok.getTokenBalance(
        user1.address,
        user1TokenAddress
      );
      const user2FinalBalance = await bitTok.getTokenBalance(
        user2.address,
        user2TokenAddress
      );

      expect(user1FinalBalance).to.equal(user1InitialBalance - amount);
      expect(user2FinalBalance).to.equal(user2InitialBalance - amount);

      // 상대방 토큰 잔액 확인
      const user1NewTokenBalance = await bitTok.getTokenBalance(
        user1.address,
        user2TokenAddress
      );
      const user2NewTokenBalance = await bitTok.getTokenBalance(
        user2.address,
        user1TokenAddress
      );

      expect(user1NewTokenBalance).to.equal(amount);
      expect(user2NewTokenBalance).to.equal(amount);
    });

    it("교환 제안을 거절할 수 있어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      await bitTok.connect(user1).proposeExchange(user2.address, amount);
      const proposals = await bitTok.getReceivedProposals(user2.address);
      const proposalId = proposals[0];

      await expect(bitTok.connect(user2).rejectExchange(proposalId)).to.emit(
        bitTok,
        "ExchangeRejected"
      );

      // 제안이 비활성화되었는지 확인
      const proposal = await bitTok.getProposal(proposalId);
      expect(proposal.isActive).to.be.false;
    });

    it("제안자가 제안을 취소할 수 있어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      await bitTok.connect(user1).proposeExchange(user2.address, amount);
      const proposals = await bitTok.getSentProposals(user1.address);
      const proposalId = proposals[0];

      await expect(bitTok.connect(user1).cancelExchange(proposalId)).to.emit(
        bitTok,
        "ExchangeRejected"
      );

      const proposal = await bitTok.getProposal(proposalId);
      expect(proposal.isActive).to.be.false;
    });

    it("대상자가 아닌 사용자는 제안을 승인할 수 없어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      await bitTok.connect(user1).proposeExchange(user2.address, amount);
      const proposals = await bitTok.getReceivedProposals(user2.address);
      const proposalId = proposals[0];

      await expect(
        bitTok.connect(owner).acceptExchange(proposalId)
      ).to.be.revertedWith("이 제안의 대상자가 아닙니다");
    });

    it("토큰이 없는 사용자는 제안할 수 없어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      await expect(
        bitTok.connect(owner).proposeExchange(user1.address, amount)
      ).to.be.revertedWith("토큰을 먼저 생성해주세요");
    });

    it("자기 자신에게는 제안할 수 없어야 한다", async function () {
      const amount = ethers.parseEther("1000");

      await expect(
        bitTok.connect(user1).proposeExchange(user1.address, amount)
      ).to.be.revertedWith("자기 자신과는 교환할 수 없습니다");
    });
  });

  describe("조회 함수들", function () {
    beforeEach(async function () {
      await bitTok.connect(user1).createToken("User1Token", "U1T");
      await bitTok.connect(user2).createToken("User2Token", "U2T");
    });

    it("모든 사용자 목록을 조회할 수 있어야 한다", async function () {
      const users = await bitTok.getAllUsers();
      expect(users.length).to.equal(2);
      expect(users).to.include(user1.address);
      expect(users).to.include(user2.address);
    });

    it("모든 토큰 정보를 조회할 수 있어야 한다", async function () {
      const tokens = await bitTok.getAllTokens();
      expect(tokens.users.length).to.equal(2);
      expect(tokens.names).to.include("User1Token");
      expect(tokens.names).to.include("User2Token");
    });

    it("사용자의 모든 토큰 잔액을 조회할 수 있어야 한다", async function () {
      const balances = await bitTok.getAllTokenBalances(user1.address);
      expect(balances.tokens.length).to.equal(1);
      expect(balances.names[0]).to.equal("User1Token");
      expect(balances.balances[0]).to.equal(ethers.parseEther("21000000"));
    });
  });
});
