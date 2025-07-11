# BitTok - Personal Token Exchange DApp

BitTok은 각 사용자가 고유한 ERC20 토큰을 생성하고, 다른 사용자와 1:1 비율로 교환할 수 있는 탈중앙화 애플리케이션입니다.

## 🌟 주요 기능

### 🪙 개인 토큰 생성

- 각 사용자는 **하나의 고유한 ERC20 토큰**을 생성할 수 있습니다
- 초기 발행량: **21,000,000 토큰** (비트코인과 동일한 총량)
- 사용자 정의 토큰 이름과 심볼

### 🔄 교환 제안 시스템

- **제안 기반 교환**: 일방적인 교환이 아닌 상대방의 승인이 필요
- **1:1 비율 교환**: 내 토큰 N개 ↔ 상대방 토큰 N개
- **자신의 고유 토큰만 사용**: 받은 토큰이 아닌 자신이 생성한 토큰만 교환 가능

### 📋 제안 관리

- **제안 생성**: 원하는 상대방과 수량으로 교환 제안
- **제안 승인**: 받은 제안을 검토하고 승인
- **제안 거절**: 원하지 않는 제안 거절
- **제안 취소**: 보낸 제안을 제안자가 취소

### 👀 조회 및 탐색

- 내 토큰 정보 및 모든 토큰 잔액 조회
- 전체 사용자 및 토큰 목록 탐색
- 받은/보낸 교환 제안 목록 확인

## 🛠 기술 스택

- **Solidity**: 스마트 컨트랙트 개발
- **Hardhat**: 개발, 테스트, 배포 프레임워크
- **OpenZeppelin**: 안전한 ERC20 구현
- **React**: 프론트엔드 사용자 인터페이스
- **Ethers.js**: 블록체인 상호작용
- **MetaMask**: 지갑 연결

## 📁 프로젝트 구조

```
BitTok/
├── contracts/
│   └── bitTok.sol          # 메인 스마트 컨트랙트
├── scripts/
│   └── deploy.js           # 배포 스크립트
├── test/
│   └── BitTok.test.js      # 컨트랙트 테스트
├── frontend/
│   ├── src/
│   │   ├── BitTokApp.js    # 메인 React 컴포넌트
│   │   ├── BitTok.css      # 스타일시트
│   │   ├── hooks/
│   │   │   └── useBitTokWallet.js  # 지갑 연결 훅
│   │   └── abi/
│   │       └── BitTok.json # 컨트랙트 ABI
├── hardhat.config.js       # Hardhat 설정
├── package.json           # 의존성 및 스크립트
└── README.md             # 프로젝트 문서
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 컨트랙트 컴파일

```bash
npm run compile
```

### 3. 테스트 실행

```bash
npm test
```

### 4. 로컬 네트워크 시작

```bash
npm run node
```

### 5. 컨트랙트 배포 (Sepolia 테스트넷)

```bash
npm run deploy
```

### 6. 프론트엔드 설정

1. 배포된 컨트랙트 주소를 `frontend/src/hooks/useBitTokWallet.js`에 업데이트
2. MetaMask에 Sepolia 테스트넷 추가
3. [Sepolia Faucet](https://sepoliafaucet.com)에서 테스트 ETH 받기

### 7. 프론트엔드 실행

```bash
cd frontend
npm install
npm start
```

## 📋 사용 가이드

### 토큰 생성

1. 지갑 연결
2. "토큰 생성" 탭에서 토큰 이름과 심볼 입력
3. "토큰 생성" 버튼 클릭

### 교환 제안

1. "토큰 교환" 탭에서 교환하고 싶은 상대방 선택
2. 교환할 수량 입력
3. "교환 제안" 버튼 클릭

### 제안 관리

1. "교환 제안" 탭에서 받은 제안 확인
2. 원하는 제안은 "승인", 원하지 않는 제안은 "거절"

## 🔧 스마트 컨트랙트 주요 함수

### 토큰 관리

- `createToken(name, symbol)`: 새 토큰 생성
- `hasToken(user)`: 사용자의 토큰 보유 여부 확인
- `getUserTokenInfo(user)`: 사용자 토큰 정보 조회

### 교환 시스템

- `proposeExchange(to, amount)`: 교환 제안 생성
- `acceptExchange(proposalId)`: 교환 제안 승인
- `rejectExchange(proposalId)`: 교환 제안 거절
- `cancelExchange(proposalId)`: 교환 제안 취소

### 조회 함수

- `getAllTokenBalances(user)`: 사용자의 모든 토큰 잔액
- `getReceivedProposals(user)`: 받은 제안 목록
- `getSentProposals(user)`: 보낸 제안 목록
- `getAllUsers()`: 전체 사용자 목록
- `getAllTokens()`: 전체 토큰 목록

## 🎯 핵심 개념 설명

### 왜 Solidity에서 `@openzeppelin/...`를 사용하나요?

- Node.js의 `require('../node_modules/...')` 대신 `import "@openzeppelin/..."`를 사용합니다
- Solidity 컴파일러가 `node_modules`에서 자동으로 라이브러리를 찾아줍니다
- 더 깔끔하고 표준적인 임포트 방식입니다

### 왜 `npx hardhat`을 사용하나요?

- `npm hardhat` 대신 `npx hardhat`을 사용하는 이유:
  - `npx`는 로컬 설치된 패키지의 실행파일을 직접 실행
  - `npm run`은 package.json의 scripts를 실행
  - Hardhat은 CLI 도구이므로 `npx`가 더 적합

### 교환 승인 시스템이 필요한 이유

- **보안성**: 일방적인 토큰 이동 방지
- **사용자 경험**: 원하지 않는 교환으로부터 보호
- **투명성**: 모든 교환에 양방향 합의 필요

## 🧪 테스트

프로젝트에는 다음과 같은 테스트가 포함되어 있습니다:

- 토큰 생성 및 제약 조건 테스트
- 교환 제안 시스템 테스트
- 제안 승인/거절/취소 테스트
- 권한 및 오류 처리 테스트
- 조회 함수 테스트

```bash
npm test  # 모든 테스트 실행
```

## 🔐 보안 고려사항

- **재진입 공격 방지**: OpenZeppelin의 안전한 ERC20 구현 사용
- **권한 검증**: 제안자와 대상자만 해당 제안을 처리할 수 있음
- **상태 검증**: 제안의 활성 상태 및 토큰 잔액 확인
- **오버플로우 방지**: Solidity 0.8+의 내장 안전장치 사용

## 📝 라이센스

MIT License

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

# bitok

사용자 간 고리 형성
가장 기본적인 고리: 3인 고리: (예: 나, 아빠, 누나)
