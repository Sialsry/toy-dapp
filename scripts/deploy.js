const { ethers } = require("hardhat");

async function main() {
  console.log("BitTok 컨트랙트 배포를 시작합니다...");

  // BitTok 컨트랙트 팩토리 가져오기
  const BitTok = await ethers.getContractFactory("BitTok");

  // 컨트랙트 배포
  console.log("배포 중...");
  const bitTok = await BitTok.deploy();

  // 배포 완료 대기
  await bitTok.waitForDeployment();

  const contractAddress = await bitTok.getAddress();
  console.log(
    "✅ BitTok 컨트랙트가 다음 주소에 배포되었습니다:",
    contractAddress
  );

  // 네트워크 정보 출력
  const network = await ethers.provider.getNetwork();
  console.log("📡 네트워크:", network.name, `(Chain ID: ${network.chainId})`);

  // 배포자 정보
  const [deployer] = await ethers.getSigners();
  console.log("👤 배포자 주소:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 배포자 잔액:", ethers.formatEther(balance), "ETH");

  console.log("\n🔧 프론트엔드 설정을 위한 정보:");
  console.log(
    "1. useBitTokWallet.js에서 다음 주소로 BITTOK_CONTRACT_ADDRESS를 업데이트하세요:"
  );
  console.log(`   const BITTOK_CONTRACT_ADDRESS = "${contractAddress}";`);
  console.log(
    "\n2. MetaMask에서 Sepolia 테스트넷에 연결되어 있는지 확인하세요."
  );
  console.log(
    "3. Sepolia ETH가 필요하다면 https://sepoliafaucet.com 에서 받으세요."
  );

  // 검증을 위한 정보 출력
  if (network.chainId === 11155111n) {
    // Sepolia
    console.log("\n🔍 Etherscan에서 컨트랙트 확인:");
    console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 실패:", error);
    process.exit(1);
  });
