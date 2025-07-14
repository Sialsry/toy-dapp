import React, { useState } from "react";
import "./TokenDetailCard.css";

const TokenDetailCard = ({
  token,
  onClose,
  popup,
  nickname,
  setNickname,
  stats,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [tempNickname, setTempNickname] = useState(nickname || "");

  const handleSave = () => {
    setNickname(tempNickname);
    setEditMode(false);
  };

  if (!token) return null;
  return (
    <div className={popup ? "token-detail-popup" : "token-detail-card"}>
      <button className="close-btn" onClick={onClose}>
        &times;
      </button>
      <h3>토큰 상세 정보</h3>
      <div className="detail-item">
        <span className="label">토큰 ID:</span>
        <span className="value">{token.tokenId || token.id}</span>
      </div>
      <div className="detail-item">
        <span className="label">보유량:</span>
        <span className="value">{token.balance} 토큰</span>
      </div>
      <div className="detail-item">
        <span className="label">원 소유자:</span>
        <span className="value">{token.owner}</span>
      </div>
      <div className="detail-item">
        <span className="label">별명:</span>
        {editMode ? (
          <span className="value" style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              style={{
                minWidth: 0,
                flex: 1,
                borderRadius: 5,
                border: "1px solid #ccc",
                padding: "2px 6px",
              }}
              maxLength={16}
              placeholder="별명 입력"
            />
            <button
              onClick={handleSave}
              style={{
                marginLeft: 4,
                fontSize: 12,
                borderRadius: 5,
                border: "none",
                background: "#4ECDC4",
                color: "#fff",
                padding: "2px 10px",
                cursor: "pointer",
              }}
            >
              저장
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setTempNickname(nickname || "");
              }}
              style={{
                fontSize: 12,
                borderRadius: 5,
                border: "none",
                background: "#aaa",
                color: "#fff",
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </span>
        ) : (
          <span
            className="value"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {nickname ? nickname : <span style={{ color: "#bbb" }}>없음</span>}
            <button
              onClick={() => setEditMode(true)}
              style={{
                fontSize: 12,
                borderRadius: 5,
                border: "none",
                background: "#4ECDC4",
                color: "#fff",
                padding: "2px 10px",
                cursor: "pointer",
              }}
            >
              수정
            </button>
          </span>
        )}
      </div>
      {stats && (
        <div
          className="detail-item"
          style={{
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
            borderBottom: "none",
          }}
        >
          <span className="label" style={{ marginBottom: 2 }}>
            연결 통계
          </span>
          <span
            className="value"
            style={{ background: "none", padding: 0, color: "#fff" }}
          >
            <br />
            연결된 노드 수: <b>{stats.nodeConnectedCount + 1}</b>
            <br />
            나와 공유하는 노드 수: <b>{stats.sharedCount}</b>
          </span>
        </div>
      )}
    </div>
  );
};

export default TokenDetailCard;
