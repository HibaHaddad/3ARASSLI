import React from "react";
import "./SplashScreen.css";
import logo from "../logo (2).png";

const SplashScreen = ({ isExiting = false }) => {
  return (
    <div
      className={`splash-screen${isExiting ? " splash-screen--exit" : ""}`}
      aria-label="Ecran de demarrage"
      role="status"
    >
      <div className="splash-screen__backdrop" />

      <div className="splash-screen__content">
        <div className="splash-screen__logo-frame">
          <svg
            className="splash-screen__heart"
            viewBox="0 0 200 180"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="splash-heart-gradient" x1="18%" y1="18%" x2="82%" y2="82%">
                <stop offset="0%" stopColor="#ef9bba" />
                <stop offset="52%" stopColor="#c76b8a" />
                <stop offset="100%" stopColor="#a75379" />
              </linearGradient>
              <radialGradient id="splash-heart-core" cx="50%" cy="44%" r="58%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
                <stop offset="30%" stopColor="#f2cad8" stopOpacity="0.98" />
                <stop offset="62%" stopColor="#f6bbd0" stopOpacity="0.88" />
                <stop offset="84%" stopColor="#f57ea7" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#984a6d" stopOpacity="0.28" />
              </radialGradient>
              <filter id="splash-heart-blur" x="-45%" y="-45%" width="190%" height="190%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0
                          0 1 0 0 0
                          0 0 1 0 0
                          0 0 0 1.1 0"
                />
              </filter>
              <filter id="splash-heart-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="12" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              className="splash-screen__heart-aura splash-screen__heart-aura--outer"
              d="M100 161C96 157 91 152.5 85.5 147.8C46.2 114.4 20 91.9 20 58.7C20 32.7 39.5 14 64.8 14C79.5 14 92.8 21 100 32.2C107.2 21 120.5 14 135.2 14C160.5 14 180 32.7 180 58.7C180 91.9 153.8 114.4 114.5 147.8C109 152.5 104 157 100 161Z"
            />
            <path
              className="splash-screen__heart-aura splash-screen__heart-aura--inner"
              d="M100 161C96 157 91 152.5 85.5 147.8C46.2 114.4 20 91.9 20 58.7C20 32.7 39.5 14 64.8 14C79.5 14 92.8 21 100 32.2C107.2 21 120.5 14 135.2 14C160.5 14 180 32.7 180 58.7C180 91.9 153.8 114.4 114.5 147.8C109 152.5 104 157 100 161Z"
            />
            <path
              className="splash-screen__heart-aura splash-screen__heart-aura--core"
              d="M100 161C96 157 91 152.5 85.5 147.8C46.2 114.4 20 91.9 20 58.7C20 32.7 39.5 14 64.8 14C79.5 14 92.8 21 100 32.2C107.2 21 120.5 14 135.2 14C160.5 14 180 32.7 180 58.7C180 91.9 153.8 114.4 114.5 147.8C109 152.5 104 157 100 161Z"
            />
          </svg>
          <span className="splash-screen__shine" />
          <img className="splash-screen__logo" src={logo} alt="Logo 3arrasli" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
