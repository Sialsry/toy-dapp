import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import SocialGraphAbi from "../abi/SocialGraph.json";

const contractAddress = "0x9Bec815e4f50469Ad81DD392e5b2D634738594Ca";

export const useSocialGraph = () => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenId, setTokenId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [otherTokens, setOtherTokens] = useState([]);
  const [tokenConnections, setTokenConnections] = useState([]); // 연결 관계 추가
  const [allTokenIds, setAllTokenIds] = useState([]); // 모든 토큰 ID 추가

  // 캐싱을 위한 ref
  const cacheRef = useRef({
    lastUpdate: 0,
    cachedTokens: [],
    cachedConnections: [],
    cacheTimeout: 30000, // 30초 캐시
  });

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();
        const contractInstance = new ethers.Contract(
          contractAddress,
          SocialGraphAbi.abi,
          signer
        );
        setContract(contractInstance);
      } catch (error) {
        console.error("Error connecting to MetaMask", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  }, []);

  const checkUserToken = useCallback(async () => {
    if (contract && account) {
      try {
        const id = await contract.userToTokenId(account);
        if (id.toString() !== "0") {
          setTokenId(id.toString());
        } else {
          setTokenId(null);
        }
      } catch (error) {
        console.error("Error checking user token", error);
      }
    }
  }, [contract, account]);

  const getTokenBalance = useCallback(async () => {
    if (contract && account && tokenId) {
      try {
        const bal = await contract.balanceOf(account, tokenId);
        setBalance(ethers.formatUnits(bal, 18));
      } catch (error) {
        console.error("Error getting token balance", error);
      }
    }
  }, [contract, account, tokenId]);

  // 폴백 방식 (기존 for문 방식)
  const getConnectedTokensFallback = useCallback(async () => {
    if (!contract || !account || !tokenId) return;

    try {
      console.log("Using fallback method for token fetching...");
      const tokens = [];

      // 최대 100개로 증가하여 더 많은 토큰 검색
      for (let i = 1; i <= 100; i++) {
        if (i.toString() !== tokenId) {
          try {
            const [balance, owner] = await Promise.all([
              contract.balanceOf(account, i),
              contract.tokenIdToUser(i),
            ]);

            console.log(
              `Fallback - Token ${i}: Balance=${balance.toString()}, Owner=${owner}`
            );

            if (
              balance.toString() !== "0" &&
              owner !== "0x0000000000000000000000000000000000000000"
            ) {
              tokens.push({
                tokenId: i.toString(),
                balance: ethers.formatUnits(balance, 18),
                owner: owner,
              });
              console.log(`Added token ${i} to connected tokens`);
            }
          } catch (error) {
            console.log(`Token ${i} does not exist or error:`, error.message);
            // 토큰이 존재하지 않는 경우 무시
            break;
          }
        }
      }
      console.log(`Fallback method found ${tokens.length} tokens:`, tokens);
      setOtherTokens(tokens);
    } catch (error) {
      console.error("Error in fallback token fetching:", error);
    }
  }, [contract, account, tokenId]);

  // 이벤트 기반 토큰 조회 - 성능 최적화
  const getConnectedTokensViaEvents = useCallback(async () => {
    if (!contract || !account || !tokenId) return;

    try {
      console.log("Fetching connected tokens via events...");
      console.log("Current user tokenId:", tokenId);

      // 캐시 확인
      const now = Date.now();
      if (now - cacheRef.current.lastUpdate < cacheRef.current.cacheTimeout) {
        console.log("Using cached tokens");
        setOtherTokens(cacheRef.current.cachedTokens);
        return;
      }

      // Transfer 이벤트 필터 생성 (현재 사용자가 받은 토큰들)
      const transferFilter = contract.filters.TransferSingle(
        null, // operator
        null, // from
        account, // to (현재 사용자)
        null, // id
        null // value
      );

      // TransferBatch 이벤트 필터도 생성 (배치 전송의 경우)
      const transferBatchFilter = contract.filters.TransferBatch(
        null, // operator
        null, // from
        account, // to (현재 사용자)
        null, // ids
        null // values
      );

      // 최근 블록부터 이벤트 조회 (성능을 위해 최근 10000 블록으로 제한)
      const currentBlock = await contract.runner.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      console.log(
        `Searching events from block ${fromBlock} to ${currentBlock}`
      );

      // 이벤트 조회
      const [singleTransfers, batchTransfers] = await Promise.all([
        contract.queryFilter(transferFilter, fromBlock),
        contract.queryFilter(transferBatchFilter, fromBlock),
      ]);

      console.log(
        `Found ${singleTransfers.length} single transfers and ${batchTransfers.length} batch transfers`
      );

      // 고유한 토큰 ID 수집
      const uniqueTokenIds = new Set();

      // Single Transfer 이벤트 처리
      singleTransfers.forEach((event) => {
        const eventTokenId = event.args.id.toString();
        console.log(
          `Single transfer event - Token ID: ${eventTokenId}, From: ${event.args.from}, To: ${event.args.to}`
        );
        if (eventTokenId !== tokenId) {
          // 자신의 토큰 제외
          uniqueTokenIds.add(eventTokenId);
        }
      });

      // Batch Transfer 이벤트 처리
      batchTransfers.forEach((event) => {
        event.args.ids.forEach((id) => {
          const eventTokenId = id.toString();
          console.log(`Batch transfer event - Token ID: ${eventTokenId}`);
          if (eventTokenId !== tokenId) {
            // 자신의 토큰 제외
            uniqueTokenIds.add(eventTokenId);
          }
        });
      });

      console.log(`Unique token IDs found: ${Array.from(uniqueTokenIds)}`);

      // 각 토큰의 잔액과 소유자 정보 조회
      const tokenPromises = Array.from(uniqueTokenIds).map(async (id) => {
        try {
          const [balance, owner] = await Promise.all([
            contract.balanceOf(account, id),
            contract.tokenIdToUser(id),
          ]);

          console.log(
            `Token ${id} - Balance: ${balance.toString()}, Owner: ${owner}`
          );

          // 잔액이 0보다 큰 경우만 포함
          if (
            balance.toString() !== "0" &&
            owner !== "0x0000000000000000000000000000000000000000"
          ) {
            return {
              tokenId: id,
              balance: ethers.formatUnits(balance, 18),
              owner: owner,
            };
          }
          return null;
        } catch (error) {
          console.warn(`Error fetching token ${id}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter((token) => token !== null);

      // 캐시 업데이트
      cacheRef.current.cachedTokens = validTokens;
      cacheRef.current.lastUpdate = now;

      setOtherTokens(validTokens);
      console.log(`Found ${validTokens.length} connected tokens:`, validTokens);
    } catch (error) {
      console.error("Error getting connected tokens via events:", error);
      // 에러 발생 시 기존 방식으로 폴백
      await getConnectedTokensFallback();
    }
  }, [contract, account, tokenId, getConnectedTokensFallback]);

  // 모든 토큰 ID 조회
  const getAllTokenIds = useCallback(async () => {
    if (!contract) return;

    try {
      console.log("Fetching all token IDs...");

      const tokenIds = [];

      // 1부터 100까지 모든 토큰 ID 확인 (실제 토큰이 있는지 확인)
      for (let i = 1; i <= 100; i++) {
        try {
          const owner = await contract.tokenIdToUser(i);
          if (owner !== "0x0000000000000000000000000000000000000000") {
            tokenIds.push(i.toString());
          }
        } catch (error) {
          // 토큰이 존재하지 않는 경우 무시
          break;
        }
      }

      setAllTokenIds(tokenIds);
      console.log(`Found ${tokenIds.length} existing tokens:`, tokenIds);
    } catch (error) {
      console.error("Error getting all token IDs:", error);
      setAllTokenIds([]);
    }
  }, [contract]);

  // 연결된 토큰들 간의 관계 조회
  const getTokenConnections = useCallback(async () => {
    if (!contract || !otherTokens || otherTokens.length === 0) return;

    try {
      console.log("Fetching token connections...");

      // 캐시 확인
      const now = Date.now();
      // if (now - cacheRef.current.lastUpdate < cacheRef.current.cacheTimeout) {
      //   console.log("Using cached connections");
      //   setTokenConnections(cacheRef.current.cachedConnections);
      //   return;
      // }

      // 연결된 토큰 ID 배열 생성
      const connectedTokenIds = otherTokens.map((token) =>
        parseInt(token.tokenId)
      );

      // 컨트랙트에서 연결 관계 조회
      const connections = await contract.getConnectedTokensRelations(
        connectedTokenIds
      );

      console.log(
        `Found ${connections.length} connections between tokens:`,
        connections
      );

      // 연결 관계를 프론트엔드에서 사용하기 쉬운 형태로 변환
      const formattedConnections = connections.map((connection) => ({
        source: connection[0].toString(),
        target: connection[1].toString(),
      }));

      // 캐시 업데이트
      cacheRef.current.cachedConnections = formattedConnections;
      cacheRef.current.lastUpdate = now;

      setTokenConnections(formattedConnections);
    } catch (error) {
      console.error("Error getting token connections:", error);
      setTokenConnections([]);
    }
  }, [contract, otherTokens]);

  // 모든 토큰 간의 연결 관계 조회 (경로 찾기용)
  const getAllTokenConnections = useCallback(async () => {
    if (!contract || !allTokenIds || allTokenIds.length === 0) return;

    try {
      console.log("Fetching all token connections...");

      // 모든 토큰 ID 배열 생성
      const allTokenIdsInt = allTokenIds.map((tokenId) => parseInt(tokenId));

      // 컨트랙트에서 연결 관계 조회
      const connections = await contract.getConnectedTokensRelations(
        allTokenIdsInt
      );

      console.log(
        `Found ${connections.length} connections between all tokens:`,
        connections
      );

      // 연결 관계를 프론트엔드에서 사용하기 쉬운 형태로 변환
      const formattedConnections = connections.map((connection) => ({
        source: connection[0].toString(),
        target: connection[1].toString(),
      }));

      return formattedConnections;
    } catch (error) {
      console.error("Error getting all token connections:", error);
      return [];
    }
  }, [contract, allTokenIds]);

  // 스마트 컨트랙트 함수를 활용한 토큰 조회
  const getConnectedTokensViaContract = useCallback(async () => {
    if (!contract || !account || !tokenId) return;

    try {
      console.log("Fetching connected tokens via contract function...");

      // 캐시 확인
      const now = Date.now();
      if (now - cacheRef.current.lastUpdate < cacheRef.current.cacheTimeout) {
        console.log("Using cached tokens");
        setOtherTokens(cacheRef.current.cachedTokens);
        return;
      }

      // 컨트랙트 함수 호출
      const [tokenIds, balances] = await contract.getUserTokenBalances(account);

      console.log(
        `Contract returned ${tokenIds.length} tokens:`,
        tokenIds.map((id, index) => ({
          tokenId: id.toString(),
          balance: ethers.formatUnits(balances[index], 18),
        }))
      );

      const tokens = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIdStr = tokenIds[i].toString();
        if (tokenIdStr !== tokenId) {
          // 자신의 토큰 제외
          try {
            const owner = await contract.tokenIdToUser(tokenIdStr);
            if (owner !== "0x0000000000000000000000000000000000000000") {
              tokens.push({
                tokenId: tokenIdStr,
                balance: ethers.formatUnits(balances[i], 18),
                owner: owner,
              });
            }
          } catch (error) {
            console.warn(`Error getting owner for token ${tokenIdStr}:`, error);
          }
        }
      }

      // 캐시 업데이트
      cacheRef.current.cachedTokens = tokens;
      cacheRef.current.lastUpdate = now;

      setOtherTokens(tokens);
      console.log(
        `Contract method found ${tokens.length} connected tokens:`,
        tokens
      );
    } catch (error) {
      console.error("Error getting connected tokens via contract:", error);
      // 에러 발생 시 이벤트 방식으로 폴백
      await getConnectedTokensViaEvents();
    }
  }, [contract, account, tokenId, getConnectedTokensViaEvents]);

  // 캐시 무효화 함수
  const invalidateCache = useCallback(() => {
    cacheRef.current.lastUpdate = 0;
    cacheRef.current.cachedTokens = [];
    cacheRef.current.cachedConnections = [];
  }, []);

  // 수동 새로고침 함수
  const refreshData = useCallback(async () => {
    if (tokenId) {
      invalidateCache();
      await Promise.all([
        getTokenBalance(),
        getConnectedTokensViaContract(), // 새로운 함수 사용
      ]);
    }
  }, [
    tokenId,
    getTokenBalance,
    getConnectedTokensViaContract,
    invalidateCache,
  ]);

  useEffect(() => {
    if (account) {
      checkUserToken();
    }
  }, [account, checkUserToken]);

  useEffect(() => {
    if (tokenId) {
      getTokenBalance();
      getConnectedTokensViaContract(); // 새로운 함수 사용
    }
  }, [tokenId, getTokenBalance, getConnectedTokensViaContract]);

  // 컨트랙트가 로드되면 모든 토큰 ID 조회
  useEffect(() => {
    if (contract) {
      getAllTokenIds();
    }
  }, [contract, getAllTokenIds]);

  // 연결된 토큰이 변경될 때 연결 관계도 조회
  useEffect(() => {
    if (otherTokens.length > 0) {
      getTokenConnections();
    } else {
      setTokenConnections([]);
    }
  }, [otherTokens, getTokenConnections]);

  const registerAndMint = async () => {
    if (contract) {
      try {
        setLoading(true);
        const tx = await contract.registerAndMint();
        await tx.wait();
        setLoading(false);
        invalidateCache(); // 캐시 무효화
        checkUserToken();
      } catch (error) {
        setLoading(false);
        console.error("Error registering and minting", error);
        alert(error.reason || "Transaction failed");
      }
    }
  };

  const swapTokens = async (otherUserAddress, amount) => {
    if (contract) {
      try {
        setLoading(true);
        const formattedAmount = ethers.parseUnits(amount, 18);

        // First, approve the contract to spend tokens
        const approvalTx = await contract.setApprovalForAll(
          contractAddress,
          true
        );
        await approvalTx.wait();

        const swapTx = await contract.swap(otherUserAddress, formattedAmount);
        await swapTx.wait();
        setLoading(false);

        // 캐시 무효화 후 데이터 새로고침
        invalidateCache();
        getTokenBalance();
        getConnectedTokensViaContract(); // 새로운 함수 사용
      } catch (error) {
        setLoading(false);
        console.error("Error swapping tokens", error);
        alert(error.reason || "Transaction failed");
      }
    }
  };

  return {
    account,
    tokenId,
    balance,
    otherTokens,
    tokenConnections, // 연결 관계 추가
    allTokenIds, // 모든 토큰 ID 추가
    loading,
    connectWallet,
    registerAndMint,
    swapTokens,
    refreshData, // 수동 새로고침 기능 추가
    getAllTokenConnections, // 모든 토큰 연결 관계 조회 추가
  };
};
