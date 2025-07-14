import React, { useState, useMemo } from "react";
import { useSocialGraph } from "./hooks/useSocialGraph";
import NetworkGraph from "./components/NetworkGraph";
import TokenDetailCard from "./components/TokenDetailCard";
import "./App.css";

const App = () => {
  const {
    account,
    tokenId,
    balance,
    otherTokens,
    tokenConnections,
    allTokenIds,
    loading,
    connectWallet,
    registerAndMint,
    swapTokens,
    refreshData,
    getAllTokenConnections,
  } = useSocialGraph();

  const [swapAddress, setSwapAddress] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [nicknameMap, setNicknameMap] = useState(() => {
    // Load from localStorage
    try {
      return JSON.parse(localStorage.getItem("tokenNicknames") || "{}") || {};
    } catch {
      return {};
    }
  });
  const [pathSearchTokenId, setPathSearchTokenId] = useState("");
  const [pathResult, setPathResult] = useState(null);
  const [pathSearching, setPathSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // "info", "connect", "path"

  // 별명 저장 함수
  const setNickname = (tokenId, nickname) => {
    setNicknameMap((prev) => {
      const updated = { ...prev, [tokenId]: nickname };
      localStorage.setItem("tokenNicknames", JSON.stringify(updated));
      return updated;
    });
  };

  // 통계 계산 함수
  const getTokenStats = (token) => {
    if (!token || !tokenId || !tokenConnections || !otherTokens) return null;

    // 토큰 ID를 문자열로 통일
    const selectedTokenId = token.tokenId || token.id;

    // 1. 나와 연결된 노드 집합 (otherTokens에서 내 토큰 ID 제외)
    const myConnectedIds = new Set(
      otherTokens.map((t) => t.tokenId).filter((id) => id !== tokenId)
    );

    // 2. 선택 노드의 연결 노드 집합 (선택된 토큰 자신 제외)
    const nodeConnections = tokenConnections.filter(
      (c) => c.source === selectedTokenId || c.target === selectedTokenId
    );
    const nodeConnectedIds = new Set(
      nodeConnections.map((c) =>
        c.source === selectedTokenId ? c.target : c.source
      )
    );

    // 3. 공유 노드 집합 (내 토큰 ID와 선택된 토큰 ID는 제외)
    const shared = new Set(
      [...myConnectedIds].filter(
        (x) => nodeConnectedIds.has(x) && x !== tokenId && x !== selectedTokenId
      )
    );

    return {
      myConnectedCount: myConnectedIds.size,
      nodeConnectedCount: nodeConnectedIds.size,
      sharedCount: shared.size,
    };
  };

  const selectedTokenStats = useMemo(
    () => getTokenStats(selectedToken),
    [selectedToken, tokenId, tokenConnections, otherTokens, allTokenIds]
  );
  const selectedTokenNickname = selectedToken
    ? nicknameMap[selectedToken.tokenId || selectedToken.id] || ""
    : "";

  const handleSwap = async (e) => {
    e.preventDefault();
    if (swapAddress && swapAmount) {
      await swapTokens(swapAddress, swapAmount);
      setSwapAddress("");
      setSwapAmount("");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedToken(node);
  };

  const handleCloseDetail = () => {
    setSelectedToken(null);
  };

  const formatBalance = (balance) => {
    return parseFloat(balance).toLocaleString();
  };

  // 최단 경로 찾기 함수 (BFS 사용)
  const findShortestPath = async (targetTokenId) => {
    if (!tokenId || !otherTokens || !allTokenIds) return null;

    // 본인 토큰 ID인지 확인
    if (targetTokenId === tokenId) {
      return { error: "본인의 토큰 ID입니다." };
    }

    // 입력된 토큰 ID가 존재하는지 확인
    if (!allTokenIds.includes(targetTokenId)) {
      return { error: "존재하지 않는 토큰 ID입니다." };
    }

    // 내가 직접 연결된 토큰들 확인
    const myDirectConnections = otherTokens.map((t) => t.tokenId);
    if (myDirectConnections.includes(targetTokenId)) {
      return { error: "직접 연결된 토큰입니다." };
    }

    // 모든 토큰 간의 연결 관계 조회
    const allConnections = await getAllTokenConnections();
    if (!allConnections) {
      return { error: "연결 관계를 찾을 수 없는 ID입니다." };
    }

    // 그래프 구성 (연결 관계를 인접 리스트로 변환)
    const graph = {};

    // 모든 토큰을 노드로 추가
    allTokenIds.forEach((id) => {
      graph[id] = [];
    });

    // 연결 관계 추가
    allConnections.forEach((connection) => {
      const { source, target } = connection;
      if (graph[source]) {
        graph[source].push(target);
      }
      if (graph[target]) {
        graph[target].push(source);
      }
    });

    // BFS로 최단 경로 찾기
    const queue = [{ node: tokenId, path: [tokenId], distance: 0 }];
    const visited = new Set([tokenId]);

    while (queue.length > 0) {
      const { node, path, distance } = queue.shift();

      if (node === targetTokenId) {
        return {
          path: path,
          distance: distance,
          intermediateNodes: path.slice(1, -1), // 시작점과 끝점 제외
        };
      }

      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({
            node: neighbor,
            path: [...path, neighbor],
            distance: distance + 1,
          });
        }
      }
    }

    return { error: "연결 관계를 찾을 수 없는 ID입니다." };
  };

  // 경로 검색 핸들러
  const handlePathSearch = async (e) => {
    e.preventDefault();
    if (pathSearchTokenId.trim()) {
      setPathSearching(true);
      try {
        const result = await findShortestPath(pathSearchTokenId.trim());
        setPathResult(result);
      } catch (error) {
        setPathResult({ error: "경로 검색 중 오류가 발생했습니다." });
      } finally {
        setPathSearching(false);
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Social Token Bridge</h1>

        {!account ? (
          <div className="connect-section">
            <p>MetaMask 지갑을 연결하여 시작하세요</p>
            <button className="connect-btn" onClick={connectWallet}>
              지갑 연결
            </button>
          </div>
        ) : (
          <div className="dashboard-layout">
            {/* 왼쪽 영역 - 탭 UI */}
            <div className="dashboard-left">
              <div className="tab-container">
                {/* 탭 헤더 */}
                <div className="tab-header">
                  <button
                    className={`tab-btn ${
                      activeTab === "info" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("info")}
                  >
                    내 정보
                  </button>
                  <button
                    className={`tab-btn ${
                      activeTab === "connect" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("connect")}
                  >
                    연결하기
                  </button>
                  <button
                    className={`tab-btn ${
                      activeTab === "path" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("path")}
                  >
                    몇 다리?
                  </button>
                </div>

                {/* 탭 콘텐츠 */}
                <div className="tab-content">
                  {/* 내 정보 탭 */}
                  {activeTab === "info" && (
                    <div className="tab-panel">
                      <div className="info-card">
                        <div className="account-info-inline">
                          <span className="label">계정:</span>
                          <span className="account-address">{account}</span>
                        </div>
                        <div className="token-info-inline">
                          <span className="label">토큰 ID:</span>
                          <span>{tokenId}</span>
                        </div>
                        <div className="token-info-inline">
                          <span className="label">남은 토큰 수량:</span>
                          <span>{formatBalance(balance)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 연결하기 탭 */}
                  {activeTab === "connect" && (
                    <div className="tab-panel">
                      <form onSubmit={handleSwap} className="swap-form">
                        <div className="form-group">
                          <label htmlFor="swapAddress">상대방 주소:</label>
                          <input
                            id="swapAddress"
                            type="text"
                            value={swapAddress}
                            onChange={(e) => setSwapAddress(e.target.value)}
                            placeholder="0x..."
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="swapAmount">교환할 토큰 수량:</label>
                          <input
                            id="swapAmount"
                            type="number"
                            value={swapAmount}
                            onChange={(e) => setSwapAmount(e.target.value)}
                            placeholder="예: 100"
                            required
                            disabled={loading}
                            min="1"
                          />
                        </div>
                        <button
                          type="submit"
                          className="swap-btn"
                          disabled={loading || !swapAddress || !swapAmount}
                        >
                          {loading ? "처리 중..." : "연결 신청"}
                        </button>
                      </form>
                      <div className="swap-info">
                        <p>🌐 토큰 교환을 통한 소셜 네트워크</p>
                        <p>📊 1:1 비율로 서로의 토큰을 교환합니다</p>
                        <p>⚡ 이벤트 기반 조회로 빠른 연결 관계 확인</p>
                      </div>
                    </div>
                  )}

                  {/* 경로 찾기 탭 */}
                  {activeTab === "path" && (
                    <div className="tab-panel">
                      <form
                        onSubmit={handlePathSearch}
                        className="path-search-form"
                      >
                        <div className="form-group">
                          <label htmlFor="pathSearchTokenId">
                            대상 토큰 ID:
                          </label>
                          <input
                            id="pathSearchTokenId"
                            type="text"
                            value={pathSearchTokenId}
                            onChange={(e) =>
                              setPathSearchTokenId(e.target.value)
                            }
                            placeholder="대상 토큰 ID를 입력하세요..."
                            required
                            disabled={loading}
                          />
                        </div>
                        <button
                          type="submit"
                          className="path-search-btn"
                          disabled={
                            loading ||
                            pathSearching ||
                            !pathSearchTokenId.trim()
                          }
                        >
                          {pathSearching ? "검색 중..." : "경로 검색"}
                        </button>
                        <div className="path-info">
                          <p>이 사람은 나와 몇 다리 건너서 아는 사람일까요?</p>
                        </div>
                      </form>

                      {/* 경로 검색 결과 */}
                      {pathResult && (
                        <div className="path-result">
                          {pathResult.error ? (
                            <div className="path-error">
                              <p>{pathResult.error}</p>
                            </div>
                          ) : (
                            <div className="path-success">
                              <h4>경로 정보</h4>
                              <div className="path-info">
                                <p>
                                  <strong>거리:</strong> {pathResult.distance}{" "}
                                  단계
                                </p>
                                <p>
                                  <strong>경로:</strong>{" "}
                                  {pathResult.path.join(" → ")}
                                </p>
                                {pathResult.intermediateNodes.length > 0 && (
                                  <div className="intermediate-nodes">
                                    <p>
                                      <strong>중간 노드들:</strong>
                                    </p>
                                    <div className="node-list">
                                      {pathResult.intermediateNodes.map(
                                        (nodeId, index) => (
                                          <span
                                            key={index}
                                            className="node-item"
                                          >
                                            {nicknameMap[nodeId] ||
                                              `Token ${nodeId}`}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽 영역: 네트워크 그래프 */}
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>처리 중...</p>
              </div>
            )}
            {tokenId && otherTokens.length > 0 && (
              <div className="network-section">
                <div className="section-header">
                  <h3>연결 관계 {otherTokens.length}</h3>
                  <button
                    className="refresh-btn"
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                  >
                    {refreshing ? "🔄 새로고침 중..." : "새로고침"}
                  </button>
                </div>
                <NetworkGraph
                  tokens={otherTokens}
                  tokenConnections={tokenConnections}
                  onNodeClick={handleNodeClick}
                  nicknameMap={nicknameMap}
                />
              </div>
            )}

            {/* 팝업 형태의 토큰 세부 정보 카드 */}
            {selectedToken && (
              <TokenDetailCard
                token={selectedToken}
                onClose={handleCloseDetail}
                popup
                nickname={selectedTokenNickname}
                setNickname={(nickname) =>
                  setNickname(
                    selectedToken.tokenId || selectedToken.id,
                    nickname
                  )
                }
                stats={selectedTokenStats}
              />
            )}
          </div>
        )}
      </header>
    </div>
  );
};

export default App;
