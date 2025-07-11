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

    // 이벤트 정의
    event UserTokenCreated(address indexed user, uint256 indexed tokenId);
    event ConnectionMade(
        address indexed userA,
        address indexed userB,
        uint256 amount
    );

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

        emit ConnectionMade(_currentUser, _otherUser, _amount);
    }
}
