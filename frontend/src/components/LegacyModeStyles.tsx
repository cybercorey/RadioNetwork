'use client';

import { Global, css } from '@emotion/react';
import { useLegacyMode } from '@/context/LegacyModeContext';

const retroStyles = css`
  /* EXTREME RETRO - GeoCities/Early 2000s Web Aesthetic */

  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

  body.legacy-mode {
    background:
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23222255' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"),
      linear-gradient(180deg, #000033 0%, #000066 50%, #000033 100%) !important;
    font-family: 'VT323', 'Courier New', monospace !important;
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ctext y='24' font-size='24'%3E%F0%9F%8E%B5%3C/text%3E%3C/svg%3E"), auto;
  }

  .legacy-mode * {
    border-radius: 0 !important; /* Sharp corners like the old days */
  }

  /* Bevel effect borders - the classic Windows 95/98 look */
  .legacy-mode .chakra-card,
  .legacy-mode [class*="Card"],
  .legacy-mode .chakra-box {
    background: linear-gradient(180deg, #000044 0%, #000022 100%) !important;
    border: 3px outset #6666aa !important;
    box-shadow:
      inset 1px 1px 0 #9999cc,
      inset -1px -1px 0 #333366,
      4px 4px 0 rgba(0, 0, 0, 0.5) !important;
  }

  /* Classic Windows-style buttons */
  .legacy-mode .chakra-button {
    background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%) !important;
    border: 3px outset #ffffff !important;
    box-shadow:
      inset 1px 1px 0 #ffffff,
      inset -1px -1px 0 #404040 !important;
    color: #000000 !important;
    font-family: 'VT323', monospace !important;
    font-size: 1.1em !important;
    font-weight: normal !important;
    text-transform: uppercase !important;
    letter-spacing: 1px !important;
    padding: 8px 16px !important;
  }

  .legacy-mode .chakra-button:hover {
    background: linear-gradient(180deg, #d0d0d0 0%, #909090 100%) !important;
  }

  .legacy-mode .chakra-button:active {
    border-style: inset !important;
    box-shadow:
      inset -1px -1px 0 #ffffff,
      inset 1px 1px 0 #404040 !important;
  }

  .legacy-mode .chakra-button[variant="ghost"] {
    background: transparent !important;
    border: 2px solid #00ff00 !important;
    box-shadow: 0 0 10px #00ff00 !important;
    color: #00ff00 !important;
    text-shadow: 0 0 10px #00ff00 !important;
  }

  .legacy-mode .chakra-button[variant="ghost"]:hover {
    background: rgba(0, 255, 0, 0.1) !important;
    animation: glow 0.5s ease-in-out infinite alternate !important;
  }

  @keyframes glow {
    from { box-shadow: 0 0 10px #00ff00; }
    to { box-shadow: 0 0 20px #00ff00, 0 0 30px #00ff00; }
  }

  /* Navigation bar with gradient and bevels */
  .legacy-mode nav,
  .legacy-mode [class*="Navigation"] > div:first-of-type {
    background:
      repeating-linear-gradient(
        90deg,
        #000066 0px,
        #000066 2px,
        #000044 2px,
        #000044 4px
      ) !important;
    border-bottom: 4px ridge #6666cc !important;
    box-shadow: 0 4px 0 #000000 !important;
  }

  /* EXTREME heading styles - rainbow and animated */
  .legacy-mode h1 {
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1.5em !important;
    background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff, #ff0000);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: rainbow 3s linear infinite !important;
    text-shadow: 3px 3px 0 #000000 !important;
    -webkit-text-stroke: 1px #000000;
  }

  @keyframes rainbow {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }

  .legacy-mode h2,
  .legacy-mode h3 {
    font-family: 'VT323', monospace !important;
    color: #00ffff !important;
    text-shadow:
      2px 2px 0 #ff00ff,
      -1px -1px 0 #000000 !important;
    letter-spacing: 2px !important;
  }

  /* Hyperlinks - classic blue with underline, visited purple */
  .legacy-mode a:not(.chakra-button) {
    color: #00ffff !important;
    text-decoration: underline !important;
    font-weight: bold !important;
  }

  .legacy-mode a:not(.chakra-button):hover {
    color: #ffff00 !important;
    text-decoration: blink !important;
    animation: blink 0.5s step-end infinite !important;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  /* Table styling - Excel 97 vibes */
  .legacy-mode table,
  .legacy-mode .chakra-table {
    border: 3px ridge #6666aa !important;
    background: #000033 !important;
  }

  .legacy-mode th {
    background: linear-gradient(180deg, #666699 0%, #333366 100%) !important;
    border: 2px outset #9999cc !important;
    color: #ffffff !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 0.6em !important;
    text-transform: uppercase !important;
    letter-spacing: 1px !important;
    padding: 12px 8px !important;
  }

  .legacy-mode td {
    border: 1px solid #333366 !important;
    color: #00ff00 !important;
    font-family: 'VT323', monospace !important;
    font-size: 1.2em !important;
  }

  .legacy-mode tr:nth-of-type(even) td {
    background: rgba(0, 0, 100, 0.3) !important;
  }

  .legacy-mode tr:hover td {
    background: rgba(255, 255, 0, 0.1) !important;
    color: #ffff00 !important;
  }

  /* Input fields - Windows 95 style */
  .legacy-mode input,
  .legacy-mode select,
  .legacy-mode .chakra-input,
  .legacy-mode .chakra-select {
    background: #ffffff !important;
    border: 2px inset #808080 !important;
    color: #000000 !important;
    font-family: 'VT323', monospace !important;
    font-size: 1.2em !important;
    padding: 6px !important;
  }

  .legacy-mode select {
    background: #c0c0c0 !important;
  }

  .legacy-mode input:focus,
  .legacy-mode .chakra-input:focus {
    outline: 2px dashed #ffff00 !important;
    outline-offset: 2px !important;
  }

  /* Badges with that Web 1.0 "NEW!" look */
  .legacy-mode .chakra-badge,
  .legacy-mode .chakra-tag {
    background: #ff0000 !important;
    border: 2px outset #ff6666 !important;
    color: #ffff00 !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 0.5em !important;
    animation: bounce 0.5s ease-in-out infinite !important;
    text-shadow: 1px 1px 0 #000000 !important;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  /* Stats with LCD/LED display look */
  .legacy-mode [class*="Stat"] .chakra-stat__number,
  .legacy-mode .stat-number {
    font-family: 'VT323', monospace !important;
    font-size: 2em !important;
    color: #00ff00 !important;
    background: #001100 !important;
    border: 2px inset #004400 !important;
    padding: 4px 12px !important;
    text-shadow:
      0 0 10px #00ff00,
      0 0 20px #00ff00,
      0 0 30px #00ff00 !important;
    letter-spacing: 2px !important;
  }

  .legacy-mode .chakra-stat__label {
    font-family: 'Press Start 2P', cursive !important;
    font-size: 0.5em !important;
    color: #ffff00 !important;
    text-transform: uppercase !important;
  }

  /* Scrollbar - chunky retro style */
  .legacy-mode ::-webkit-scrollbar {
    width: 20px;
    height: 20px;
  }

  .legacy-mode ::-webkit-scrollbar-track {
    background:
      repeating-linear-gradient(
        45deg,
        #333366 0px,
        #333366 5px,
        #222244 5px,
        #222244 10px
      );
    border: 2px inset #6666aa;
  }

  .legacy-mode ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
    border: 3px outset #ffffff;
  }

  .legacy-mode ::-webkit-scrollbar-button {
    background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
    border: 2px outset #ffffff;
    height: 20px;
  }

  /* Spinner - pixelated loading */
  .legacy-mode .chakra-spinner {
    border-width: 4px !important;
    border-color: #00ff00 !important;
    border-top-color: #ff00ff !important;
    animation: spin 0.5s steps(8) infinite !important;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* CRT Scanlines + Flicker effect */
  .legacy-mode::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.2) 0px,
      rgba(0, 0, 0, 0.2) 1px,
      transparent 1px,
      transparent 3px
    );
    z-index: 9998;
  }

  .legacy-mode::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
    z-index: 9997;
    animation: flicker 0.1s infinite;
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.98; }
  }

  /* Marquee-style animation for certain elements */
  .legacy-mode .legacy-marquee {
    animation: marquee 10s linear infinite;
    white-space: nowrap;
  }

  @keyframes marquee {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }

  /* Hit counter / visitor badge style */
  .legacy-mode .legacy-badge {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: #000000 !important;
    border: 3px ridge #ffcc00 !important;
    padding: 8px 12px !important;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .legacy-mode .legacy-badge::before {
    content: '~ WELCOME TO ~';
    font-family: 'Press Start 2P', cursive;
    font-size: 6px;
    color: #ff00ff;
    animation: blink 1s step-end infinite;
  }

  .legacy-mode .legacy-badge-text {
    font-family: 'VT323', monospace !important;
    font-size: 16px !important;
    color: #00ff00 !important;
    text-shadow: 0 0 5px #00ff00 !important;
  }

  .legacy-mode .legacy-badge::after {
    content: 'BEST VIEWED IN NETSCAPE 4.0';
    font-family: 'VT323', monospace;
    font-size: 10px;
    color: #666666;
  }

  /* Under construction style dividers */
  .legacy-mode hr,
  .legacy-mode .chakra-divider {
    height: 20px !important;
    border: none !important;
    background:
      repeating-linear-gradient(
        45deg,
        #ffcc00 0px,
        #ffcc00 10px,
        #000000 10px,
        #000000 20px
      ) !important;
    margin: 20px 0 !important;
  }

  /* Fire text effect for important elements */
  .legacy-mode .chakra-stat__number {
    animation: fire 0.5s ease-in-out infinite alternate;
  }

  @keyframes fire {
    from {
      text-shadow:
        0 0 10px #00ff00,
        0 0 20px #00ff00;
    }
    to {
      text-shadow:
        0 0 20px #00ff00,
        0 0 30px #00ff00,
        0 0 40px #00ff00;
    }
  }

  /* Star cursor trail effect (via pseudo-element on container) */
  .legacy-mode {
    overflow-x: hidden;
  }

  /* Make the switch toggle more retro */
  .legacy-mode .chakra-switch {
    background: #333333 !important;
    border: 2px inset #666666 !important;
  }

  .legacy-mode .chakra-switch[data-checked] {
    background: #006600 !important;
  }

  .legacy-mode .chakra-switch span {
    background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%) !important;
    border: 2px outset #ffffff !important;
  }
`;

export default function LegacyModeStyles() {
  const { isLegacyMode } = useLegacyMode();

  // Add/remove legacy-mode class on body
  if (typeof document !== 'undefined') {
    if (isLegacyMode) {
      document.body.classList.add('legacy-mode');
    } else {
      document.body.classList.remove('legacy-mode');
    }
  }

  return (
    <>
      <Global styles={retroStyles} />
      {isLegacyMode && (
        <div className="legacy-badge">
          <span className="legacy-badge-text">RadioNetwork v1.0</span>
        </div>
      )}
    </>
  );
}
