import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import SocialGraphAbi from "../abi/SocialGraph.json";

const contractAddress = "0x0a52D252557acC8d6bdCeBFD7Db833388eEEfE0E"; // 여기에 배포된 컨트랙트 주소를 입력하세요.

export const useSocialGraph = () => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tokenId, setTokenId] = useState(null);
    const [balance, setBalance] = useState(0);
    const [otherTokens, setOtherTokens] = useState([]);

    const connectWallet = useCallback(async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                setAccount(accounts[0]);
                const provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(provider);
                const signer = await provider.getSigner();
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

    const getAllTokenBalances = useCallback(async () => {
        if (contract && account && tokenId) {
            try {
                const tokens = [];
                // 최대 100개의 토큰 ID를 체크 (실제로는 더 효율적인 방법이 필요할 수 있음)
                for (let i = 1; i <= 100; i++) {
                    if (i.toString() !== tokenId) {
                        try {
                            const balance = await contract.balanceOf(account, i);
                            const tokenOwner = await contract.tokenIdToUser(i);
                            
                            if (balance.toString() !== "0" && tokenOwner !== "0x0000000000000000000000000000000000000000") {
                                tokens.push({
                                    tokenId: i.toString(),
                                    balance: ethers.formatUnits(balance, 18),
                                    owner: tokenOwner
                                });
                            }
                        } catch (error) {
                            // 토큰이 존재하지 않는 경우 무시
                            break;
                        }
                    }
                }
                setOtherTokens(tokens);
            } catch (error) {
                console.error("Error getting all token balances", error);
            }
        }
    }, [contract, account, tokenId]);

    useEffect(() => {
        if (account) {
            checkUserToken();
        }
    }, [account, checkUserToken]);

    useEffect(() => {
        if (tokenId) {
            getTokenBalance();
            getAllTokenBalances();
        }
    }, [tokenId, getTokenBalance, getAllTokenBalances]);

    const registerAndMint = async () => {
        if (contract) {
            try {
                setLoading(true);
                const tx = await contract.registerAndMint();
                await tx.wait();
                setLoading(false);
                checkUserToken(); // Re-check token after minting
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
                const approvalTx = await contract.setApprovalForAll(contractAddress, true);
                await approvalTx.wait();

                const swapTx = await contract.swap(otherUserAddress, formattedAmount);
                await swapTx.wait();
                setLoading(false);
                getTokenBalance(); // Refresh balance after swap
                getAllTokenBalances(); // Refresh other tokens after swap
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
        loading,
        connectWallet,
        registerAndMint,
        swapTokens,
    };
};
