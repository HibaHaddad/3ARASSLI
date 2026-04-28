import React, { useEffect, useRef, useState } from "react";

const SignaturePad = ({ onChange }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth || 560;
    const height = canvas.offsetHeight || 220;
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.4;
    context.strokeStyle = "#6f394c";
    context.fillStyle = "#fffaf7";
    context.fillRect(0, 0, width, height);
  }, []);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    if ("touches" in event && event.touches[0]) {
      return {
        x: event.touches[0].clientX - bounds.left,
        y: event.touches[0].clientY - bounds.top,
      };
    }
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const startDrawing = (event) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) {
      return;
    }
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    const data = canvasRef.current.toDataURL("image/png");
    onChange?.(data);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fffaf7";
    context.fillRect(0, 0, canvas.offsetWidth || 560, canvas.offsetHeight || 220);
    setHasSignature(false);
    onChange?.("");
  };

  return (
    <div className="client-signature-wrap">
      <canvas
        ref={canvasRef}
        className="client-signature-pad"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="client-signature-actions">
        <span>{hasSignature ? "Signature capturee" : "Signez dans la zone ci-dessus"}</span>
        <button type="button" className="client-btn client-btn-ghost" onClick={clearSignature}>
          Effacer
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
