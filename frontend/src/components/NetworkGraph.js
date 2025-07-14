import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import "./NetworkGraph.css";

const NetworkGraph = ({
  tokens,
  tokenConnections,
  onNodeClick,
  nicknameMap,
}) => {
  const svgRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });

  useEffect(() => {
    if (!tokens || tokens.length === 0) return;

    // SVG 초기화
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // 그래프 데이터 생성
    const nodes = [];
    const links = [];

    // 연결된 토큰들을 원형으로 배치
    const radius = 180; // 중앙 공간을 위해 반지름 증가
    tokens.forEach((token, index) => {
      const angle = (index / tokens.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // 별명이 있으면 별명을, 없으면 기존 방식 사용
      const nodeName =
        nicknameMap && nicknameMap[token.tokenId]
          ? nicknameMap[token.tokenId]
          : `Token ${token.tokenId}`;

      nodes.push({
        id: token.tokenId,
        name: nodeName,
        type: "connected",
        balance: parseFloat(token.balance).toLocaleString(),
        owner: `${token.owner.slice(0, 6)}...${token.owner.slice(-4)}`,
        size: Math.max(8, Math.min(15, parseFloat(token.balance) / 1000000)),
        color: "#4ECDC4",
        originalData: token,
        x: x,
        y: y,
      });
    });

    // 연결된 토큰들 간의 링크 추가
    if (tokenConnections && tokenConnections.length > 0) {
      tokenConnections.forEach((connection) => {
        links.push({
          source: connection.source,
          target: connection.target,
          color: "#667eea",
        });
      });
    }

    // SVG 설정
    svg.attr("width", width).attr("height", height);

    // 링크 그리기
    const link = svg
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // 노드 그리기
    const node = svg
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    // 노드 원
    const circles = node
      .append("circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("opacity", 0.8);

    // 노드 텍스트
    const labels = node
      .append("text")
      .text((d) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.size + 15)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "bold");

    // 노드 위치 설정
    node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // 링크 위치 설정
    link
      .attr("x1", (d) => {
        const sourceNode = nodes.find((n) => n.id === d.source);
        return sourceNode ? sourceNode.x : centerX;
      })
      .attr("y1", (d) => {
        const sourceNode = nodes.find((n) => n.id === d.source);
        return sourceNode ? sourceNode.y : centerY;
      })
      .attr("x2", (d) => {
        const targetNode = nodes.find((n) => n.id === d.target);
        return targetNode ? targetNode.x : centerX;
      })
      .attr("y2", (d) => {
        const targetNode = nodes.find((n) => n.id === d.target);
        return targetNode ? targetNode.y : centerY;
      });

    // 호버 이벤트
    node
      .on("mouseover", function (event, d) {
        setHoveredNode(d);
        // 툴팁 위치 계산 (SVG 좌표 → 브라우저 좌표)
        const svgRect = svgRef.current.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: svgRect.left + d.x,
          y: svgRect.top + d.y,
          node: d,
        });
        // 호버된 노드 강조
        d3.select(this)
          .select("circle")
          .attr("stroke-width", 4)
          .attr("opacity", 1);
        // 연결된 링크 강조
        link.attr("opacity", (l) =>
          l.source === d.id || l.target === d.id ? 1 : 0.2
        );
      })
      .on("mousemove", function (event, d) {
        // 마우스 이동 시 툴팁 위치 업데이트
        const svgRect = svgRef.current.getBoundingClientRect();
        setTooltip((t) => ({ ...t, x: event.clientX, y: event.clientY }));
      })
      .on("mouseout", function (event, d) {
        setHoveredNode(null);
        setTooltip({ visible: false, x: 0, y: 0, node: null });
        // 원래 상태로 복원
        d3.select(this)
          .select("circle")
          .attr("stroke-width", 2)
          .attr("opacity", 0.8);
        link.attr("opacity", 0.6);
      })
      .on("click", function (event, d) {
        if (onNodeClick) {
          onNodeClick(d);
        }
      });

    // 애니메이션 효과
    circles
      .attr("r", 0)
      .transition()
      .duration(1000)
      .attr("r", (d) => d.size);

    labels
      .attr("opacity", 0)
      .transition()
      .duration(1000)
      .delay(500)
      .attr("opacity", 1);
  }, [tokens, tokenConnections, onNodeClick, nicknameMap]);

  return (
    <div className="network-graph-container">
      <div className="graph-wrapper">
        <svg ref={svgRef} className="network-svg"></svg>
        {/* 툴팁 */}
        {tooltip.visible && tooltip.node && (
          <div
            className="node-tooltip floating"
            style={{ left: tooltip.x - 714, top: tooltip.y - 245 }}
          >
            <strong>{tooltip.node.name}</strong>
            <br />
            보유량: {tooltip.node.balance} 토큰
            <br />원 소유자: {tooltip.node.owner}
            <br />
            토큰 ID: {tooltip.node.id}
          </div>
        )}
      </div>

      <p className="graph-description">
        점을 클릭하면 상세 정보를 확인할 수 있습니다
      </p>

      {/* 범례 */}
      <div className="graph-legend">
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#4ECDC4" }}
          ></div>
          <span>나와 연결된 토큰</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-line"
            style={{ backgroundColor: "#667eea" }}
          ></div>
          <span>다른 토큰 간 연결</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
