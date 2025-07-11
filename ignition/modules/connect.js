// BitTok 컨트랙트 배포를 위한 Hardhat Ignition 모듈
// Hardhat Ignition에 대한 자세한 정보: https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ConnectModule", (m) => {
  // BitTok 컨트랙트 배포
  // BitTok은 생성자 파라미터가 없으므로 빈 배열 전달
  const SocialGraph = m.contract("SocialGraph", []);

  // 배포된 컨트랙트를 반환하여 다른 스크립트에서 사용할 수 있도록 함
  return { SocialGraph };
});
