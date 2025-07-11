# 🌐 Social Graph dApp

## 📋 프로젝트 개요

SNS 디앱 개발 토이프로젝트로, 토큰 교환을 통한 소셜 네트워크 구축 플랫폼입니다.

## ✨ 주요 기능

### 🔗 디앱 사용 흐름

1. **계정 연결 및 등록**
   - MetaMask 지갑 연결
   - 최초 서비스 가입 시 고유 토큰 민팅 (2,100만 개로 발행량 고정)

2. **토큰 교환**
   - 다른 사용자(노드)와 각자의 고유 토큰을 1:1 비율로 교환
   - 서로의 토큰을 공유하고 있는 두 계정은 서로 '연결' 상태가 됨
   - 상대방의 이더리움 계정 주소와 교환할 수량을 입력하여 교환 진행

3. **연결 관계 시각화**
   - 교환을 통해 받은 모든 토큰 정보 표시
   - 각 토큰의 ID, 보유량, 원래 소유자 주소 확인
   - 연결된 노드들의 관계 구조를 카드 형태로 표현

## 🛠️ 기술 스택

- **Frontend**: React.js
- **Blockchain**: Ethereum, Solidity
- **Web3**: Ethers.js
- **Wallet**: MetaMask
- **Smart Contract**: ERC1155 기반 SocialGraph 컨트랙트

## 📱 UI 특징

- **모던한 디자인**: 그라데이션 배경과 글래스모피즘 효과
- **반응형 웹**: 데스크톱, 태블릿, 모바일 모든 기기 지원
- **사용자 친화적**: 직관적인 인터페이스와 명확한 안내 메시지
- **실시간 피드백**: 로딩 상태와 트랜잭션 진행 상황 표시

## 🚀 설치 및 실행

### 필수 요구사항
- Node.js (v14 이상)
- MetaMask 브라우저 확장
- 테스트넷 ETH (가스비용)

### 설치
```bash
npm install
```

### 실행
```bash
npm start
```

## 📖 사용법

1. **지갑 연결**
   - "지갑 연결" 버튼 클릭
   - MetaMask에서 계정 연결 승인

2. **사용자 등록**
   - 처음 방문하는 경우 "등록하고 토큰 발행" 버튼 클릭
   - 트랜잭션 승인하여 고유 토큰 발행

3. **토큰 교환**
   - 상대방의 이더리움 주소 입력
   - 교환할 토큰 수량 입력
   - "토큰 교환" 버튼 클릭하여 트랜잭션 실행

4. **연결 관계 확인**
   - "연결 관계" 섹션에서 교환을 통해 받은 토큰들 확인
   - 각 토큰의 원래 소유자와 보유량 정보 확인

## 🔧 스마트 컨트랙트

- **컨트랙트 주소**: `0x0a52D252557acC8d6bdCeBFD7Db833388eEEfE0E`
- **표준**: ERC1155
- **주요 함수**:
  - `registerAndMint()`: 사용자 등록 및 토큰 발행
  - `swap(address, uint256)`: 토큰 교환
  - `userToTokenId(address)`: 사용자의 토큰 ID 조회
  - `balanceOf(address, uint256)`: 토큰 잔액 조회

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── App.js              # 메인 컴포넌트
│   ├── App.css             # 스타일시트
│   ├── hooks/
│   │   └── useSocialGraph.js   # 스마트 컨트랙트 연동 훅
│   └── abi/
│       └── SocialGraph.json    # 컨트랙트 ABI
└── public/
```

## 🎯 향후 개발 계획

- [ ] 네트워크 그래프 시각화 (D3.js 또는 Vis.js)
- [ ] 사용자 프로필 기능
- [ ] 토큰 교환 히스토리
- [ ] 멀티체인 지원
- [ ] NFT 메타데이터 추가

## 🤝 기여

이 프로젝트는 학습 목적으로 제작되었습니다. 개선 사항이나 버그 리포트는 언제든 환영합니다!

## 📄 라이선스

MIT License