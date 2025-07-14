// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SocialGraph
 * @dev ERC1155를 사용하여 각 사용자에게 고유한 토큰을 발행하고,
 * 사용자 간 토큰 교환을 통해 소셜 그래프를 형성하는 컨트랙트.
 * 교환을 위해서는 사용자들이 이 컨트랙트 주소에 대해
 * setApprovalForAll(address(this), true)를 먼저 호출해야 합니다.
 */
contract SocialGraph is ERC1155, Ownable {
    // 새로운 사용자 토큰 ID를 생성하기 위한 카운터
    uint256 private _tokenIdCounter;

    // 각 사용자의 고유 토큰 발행량 (2,100만 개, 18자리 소수점 포함)
    uint256 public constant INITIAL_SUPPLY = 21_000_000 * 10 ** 18;

    // 사용자 주소와 토큰 ID를 매핑
    mapping(address => uint256) public userToTokenId;
    // 토큰 ID와 원본 사용자 주소를 매핑
    mapping(uint256 => address) public tokenIdToUser;
    // 연결 관계 저장 (tokenId1 < tokenId2인 경우에만 저장)
    mapping(uint256 => mapping(uint256 => bool)) public connections;

    // 이벤트 정의
    event UserTokenCreated(address indexed user, uint256 indexed tokenId);
    event ConnectionMade(
        address indexed userA,
        address indexed userB,
        uint256 amount
    );
    // Transfer 이벤트는 ERC1155에서 자동으로 발생하므로 별도 정의 불필요

    /**
     * @dev 컨트랙트 생성자.
     * ERC1155에 필요한 metadata URI를 설정합니다. (프론트엔드에서 사용)
     * Ownable의 초기 소유자를 배포자로 설정합니다.
     */
    constructor()
        ERC1155("https://your-metadata-api/{id}.json")
        Ownable(msg.sender)
    {}

    /**
     * @dev 사용자가 처음 방문했을 때 자신의 고유 토큰을 생성하고 발행받습니다.
     * 한 번만 호출할 수 있습니다.
     */
    function registerAndMint() external {
        require(
            userToTokenId[msg.sender] == 0,
            "SocialGraph: You already have a token"
        );

        // 새로운 토큰 ID 생성 (1부터 시작)
        uint256 newTokenId;
        unchecked {
            _tokenIdCounter++;
            newTokenId = _tokenIdCounter;
        }

        // 사용자 정보와 토큰 ID 매핑
        userToTokenId[msg.sender] = newTokenId;
        tokenIdToUser[newTokenId] = msg.sender;

        // 사용자에게 초기 물량 민팅
        _mint(msg.sender, newTokenId, INITIAL_SUPPLY, "");

        emit UserTokenCreated(msg.sender, newTokenId);
    }

    /**
     * @dev 두 사용자가 서로의 토큰을 1:1 비율로 교환합니다.
     * 이 함수를 호출하기 전에, 두 사용자 모두 이 컨트랙트 주소에 대해
     * setApprovalForAll(address(this), true)를 호출하여 전송 권한을 부여해야 합니다.
     * @param _otherUser 교환할 상대방의 주소
     * @param _amount 교환할 토큰의 수량
     */
    function swap(address _otherUser, uint256 _amount) external {
        address _currentUser = msg.sender;

        // 기본 조건 검사
        require(
            _otherUser != address(0),
            "SocialGraph: Swap with the zero address"
        );
        require(
            _otherUser != _currentUser,
            "SocialGraph: Cannot swap with yourself"
        );
        require(_amount > 0, "SocialGraph: Amount must be greater than zero");

        // 두 사용자 모두 등록되었는지 확인
        uint256 currentUserTokenId = userToTokenId[_currentUser];
        uint256 otherUserTokenId = userToTokenId[_otherUser];
        require(currentUserTokenId != 0, "SocialGraph: You are not registered");
        require(
            otherUserTokenId != 0,
            "SocialGraph: The other user is not registered"
        );

        // 권한 확인: 컨트랙트가 두 사용자 대신 토큰을 전송할 수 있는지 확인
        require(
            isApprovedForAll(_currentUser, address(this)) &&
                isApprovedForAll(_otherUser, address(this)),
            "SocialGraph: Both users must approve this contract to manage their tokens"
        );

        // 잔액 확인
        require(
            balanceOf(_currentUser, currentUserTokenId) >= _amount,
            "SocialGraph: You have insufficient balance"
        );
        require(
            balanceOf(_otherUser, otherUserTokenId) >= _amount,
            "SocialGraph: The other user has insufficient balance"
        );

        // 토큰 교환 실행 (컨트랙트가 중개자로서 양쪽에서 토큰을 전송)
        // 1. 현재 유저의 토큰을 상대방에게 전송
        _safeTransferFrom(
            _currentUser,
            _otherUser,
            currentUserTokenId,
            _amount,
            ""
        );
        // 2. 상대방의 토큰을 현재 유저에게 전송
        _safeTransferFrom(
            _otherUser,
            _currentUser,
            otherUserTokenId,
            _amount,
            ""
        );

        // 연결 관계 저장 (작은 토큰 ID를 키로 사용)
        uint256 smallerTokenId = currentUserTokenId < otherUserTokenId
            ? currentUserTokenId
            : otherUserTokenId;
        uint256 largerTokenId = currentUserTokenId < otherUserTokenId
            ? otherUserTokenId
            : currentUserTokenId;
        connections[smallerTokenId][largerTokenId] = true;

        emit ConnectionMade(_currentUser, _otherUser, _amount);
    }

    /**
     * @dev 사용자가 보유한 모든 토큰의 잔액을 조회합니다.
     * @param _user 조회할 사용자 주소
     * @return tokenIds 토큰 ID 배열
     * @return balances 해당 토큰들의 잔액 배열
     */
    function getUserTokenBalances(
        address _user
    )
        external
        view
        returns (uint256[] memory tokenIds, uint256[] memory balances)
    {
        uint256 userTokenId = userToTokenId[_user];
        if (userTokenId == 0) {
            return (new uint256[](0), new uint256[](0));
        }

        // 현재 사용자가 보유한 모든 토큰을 찾기 위해 Transfer 이벤트를 활용하는 대신
        // 효율적인 방법으로 구현 (실제로는 이벤트 기반으로 프론트엔드에서 처리)
        uint256[] memory tempTokenIds = new uint256[](_tokenIdCounter);
        uint256[] memory tempBalances = new uint256[](_tokenIdCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= _tokenIdCounter; i++) {
            uint256 balance = balanceOf(_user, i);
            if (balance > 0) {
                tempTokenIds[count] = i;
                tempBalances[count] = balance;
                count++;
            }
        }

        // 정확한 크기로 배열 생성
        tokenIds = new uint256[](count);
        balances = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tempTokenIds[i];
            balances[i] = tempBalances[i];
        }
    }

    /**
     * @dev 연결된 토큰들 간의 교환 관계를 조회합니다.
     * @param _connectedTokenIds 연결된 토큰 ID 배열
     * @return connections 연결 관계 배열 (각 요소는 [tokenId1, tokenId2] 형태)
     */
    function getConnectedTokensRelations(
        uint256[] memory _connectedTokenIds
    ) external view returns (uint256[][] memory connections) {
        uint256 connectionCount = 0;
        uint256 maxConnections = (_connectedTokenIds.length *
            (_connectedTokenIds.length - 1)) / 2; // 최대 연결 수
        uint256[][] memory tempConnections = new uint256[][](maxConnections);

        // 각 토큰 쌍에 대해 저장된 연결 관계 확인
        for (uint256 i = 0; i < _connectedTokenIds.length; i++) {
            for (uint256 j = i + 1; j < _connectedTokenIds.length; j++) {
                uint256 tokenId1 = _connectedTokenIds[i];
                uint256 tokenId2 = _connectedTokenIds[j];

                // 작은 토큰 ID를 키로 사용하여 연결 관계 확인
                uint256 smallerTokenId = tokenId1 < tokenId2
                    ? tokenId1
                    : tokenId2;
                uint256 largerTokenId = tokenId1 < tokenId2
                    ? tokenId2
                    : tokenId1;

                if (connections[smallerTokenId][largerTokenId]) {
                    uint256[] memory connection = new uint256[](2);
                    connection[0] = tokenId1;
                    connection[1] = tokenId2;
                    tempConnections[connectionCount] = connection;
                    connectionCount++;
                }
            }
        }

        // 정확한 크기로 배열 생성
        connections = new uint256[][](connectionCount);
        for (uint256 i = 0; i < connectionCount; i++) {
            connections[i] = tempConnections[i];
        }
    }

    /**
     * @dev 특정 토큰의 소유자가 다른 토큰을 보유하고 있는지 확인합니다.
     * @param _tokenId 확인할 토큰 ID
     * @param _otherTokenIds 확인할 다른 토큰 ID 배열
     * @return hasTokens 각 토큰 보유 여부 배열
     */
    function checkTokenOwnerHasOtherTokens(
        uint256 _tokenId,
        uint256[] memory _otherTokenIds
    ) external view returns (bool[] memory hasTokens) {
        address tokenOwner = tokenIdToUser[_tokenId];
        if (tokenOwner == address(0)) {
            return new bool[](_otherTokenIds.length);
        }

        hasTokens = new bool[](_otherTokenIds.length);
        for (uint256 i = 0; i < _otherTokenIds.length; i++) {
            hasTokens[i] = balanceOf(tokenOwner, _otherTokenIds[i]) > 0;
        }
    }

    /**
     * @dev 현재까지 발행된 토큰의 총 개수를 반환합니다.
     * @return 총 토큰 개수
     */
    function getTokenCount() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
