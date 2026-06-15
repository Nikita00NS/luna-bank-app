import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  signerName: string;
}

export default function SignaturePad({ onSave, onCancel, signerName }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Get position from touch or mouse event
  const getPos = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
        y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Init canvas with HiDPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Draw signature line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Подпись', 20, rect.height - 12);
  }, []);

  const startDraw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      lastPos.current = getPos(e);
      setIsDrawing(true);
      setHasDrawn(true);
    },
    [getPos]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!isDrawing || !lastPos.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const pos = getPos(e);
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x / dpr, lastPos.current.y / dpr);
      ctx.lineTo(pos.x / dpr, pos.y / dpr);
      ctx.stroke();
      ctx.restore();

      lastPos.current = pos;
    },
    [isDrawing, getPos]
  );

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Redraw baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Подпись', 20, rect.height - 12);
    ctx.restore();

    setHasDrawn(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mx-auto mb-3">
          ✍️
        </div>
        <h3 className="text-lg font-bold">Электронная подпись</h3>
        <p className="text-sm text-white/40 mt-1">
          Нарисуйте вашу подпись в поле ниже
        </p>
      </div>

      {/* Canvas area */}
      <div className="glass p-3 mb-3">
        <p className="text-xs text-white/40 mb-2 px-1">
          Подписант: <span className="text-white/70">{signerName}</span>
        </p>
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          style={{ height: 160 }}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={clear} className="btn-ghost flex-1 border border-white/10 rounded-xl">
          Очистить
        </button>
        <button onClick={onCancel} className="btn-ghost flex-1 border border-white/10 rounded-xl">
          Отмена
        </button>
        <button
          onClick={save}
          disabled={!hasDrawn}
          className="btn-primary flex-[2]"
        >
          Подписать
        </button>
      </div>
    </div>
  );
}
