import React, { useState } from 'react'
import { useSocialGraph } from './hooks/useSocialGraph'
import './App.css'

const App = () => {
  const {
    account,
    tokenId,
    balance,
    otherTokens,
    loading,
    connectWallet,
    registerAndMint,
    swapTokens,
  } = useSocialGraph()

  const [swapAddress, setSwapAddress] = useState('')
  const [swapAmount, setSwapAmount] = useState('')

  const handleSwap = async (e) => {
    e.preventDefault()
    if (swapAddress && swapAmount) {
      await swapTokens(swapAddress, swapAmount)
      setSwapAddress('')
      setSwapAmount('')
    }
  }

  const formatBalance = (balance) => {
    return parseFloat(balance).toLocaleString()
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌐 Social Graph dApp</h1>
        <p className="subtitle">토큰 교환을 통한 소셜 네트워크</p>
        
        {!account ? (
          <div className="connect-section">
            <p>MetaMask 지갑을 연결하여 시작하세요</p>
            <button className="connect-btn" onClick={connectWallet}>
              지갑 연결
            </button>
          </div>
        ) : (
          <div className="main-content">
            <div className="account-info">
              <h3>연결된 계정</h3>
              <p className="account-address">{account}</p>
            </div>

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>처리 중...</p>
              </div>
            )}

            {tokenId ? (
              <div className="user-dashboard">
                <div className="token-info">
                  <h3>내 토큰 정보</h3>
                  <div className="info-card">
                    <p><strong>토큰 ID:</strong> {tokenId}</p>
                    <p><strong>보유량:</strong> {formatBalance(balance)} 토큰</p>
                  </div>
                </div>

                {otherTokens.length > 0 && (
                  <div className="other-tokens-info">
                    <h3>연결 관계</h3>
                    <div className="tokens-grid">
                      {otherTokens.map((token) => (
                        <div key={token.tokenId} className="token-card">
                          <p><strong>토큰 ID:</strong> {token.tokenId}</p>
                          <p><strong>보유량:</strong> {formatBalance(token.balance)}</p>
                          <p className="token-owner">
                            <strong>원 소유자:</strong> 
                            <span className="owner-address">
                              {token.owner.slice(0, 6)}...{token.owner.slice(-4)}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="swap-section">
                  <h3>토큰 교환</h3>
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
                      <label htmlFor="swapAmount">교환할 수량:</label>
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
                      {loading ? '처리 중...' : '토큰 교환'}
                    </button>
                  </form>
                  <div className="swap-info">
                    <p>💡 토큰 교환을 통해 다른 사용자와 연결되세요!</p>
                    <p>📊 1:1 비율로 서로의 토큰을 교환합니다</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="register-section">
                <div className="welcome-card">
                  <h3>환영합니다! 🎉</h3>
                  <p>아직 등록되지 않은 새로운 사용자입니다.</p>
                  <p>고유 토큰을 발행받아 소셜 네트워크에 참여하세요!</p>
                  <ul className="features">
                    <li>✨ 2,100만 개의 고유 토큰 발행</li>
                    <li>🤝 다른 사용자와 토큰 교환</li>
                    <li>🌐 소셜 네트워크 구축</li>
                  </ul>
                  <button 
                    className="register-btn"
                    onClick={registerAndMint} 
                    disabled={loading}
                  >
                    {loading ? '등록 중...' : '등록하고 토큰 발행'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  )
}

export default App
