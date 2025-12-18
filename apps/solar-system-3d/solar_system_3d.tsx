import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const SolarSystem = () => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const animationRef = useRef(null);
  const mouseRef = useRef({ isDragging: false, lastX: 0, lastY: 0, dragType: null });
  const rotationRef = useRef({ x: 0, y: 0 });
  const planetsRef = useRef([
    { name: '水星', distance: 50, size: 4, color: '#8C7853', speed: 4.15, angle: 0 },
    { name: '金星', distance: 70, size: 9, color: '#FFC649', speed: 1.62, angle: 0 },
    { name: '地球', distance: 90, size: 10, color: '#4A90E2', speed: 1, angle: 0 },
    { name: '火星', distance: 110, size: 6, color: '#E27B58', speed: 0.53, angle: 0 },
    { name: '木星', distance: 150, size: 20, color: '#C88B3A', speed: 0.08, angle: 0 },
    { name: '土星', distance: 190, size: 17, color: '#FAD5A5', speed: 0.03, angle: 0 },
    { name: '天王星', distance: 220, size: 14, color: '#4FD0E0', speed: 0.01, angle: 0 },
    { name: '海王星', distance: 250, size: 13, color: '#4169E1', speed: 0.006, angle: 0 }
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const drawSun = () => {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
      gradient.addColorStop(0, '#FDB813');
      gradient.addColorStop(0.5, '#FD8D13');
      gradient.addColorStop(1, '#FC6A13');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FDB813';
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawOrbit = (distance) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, distance * zoom, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawPlanet = (planet, isSelected) => {
      const x = centerX + Math.cos(planet.angle) * planet.distance * zoom;
      const y = centerY + Math.sin(planet.angle) * planet.distance * zoom;
      
      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, planet.size * zoom + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.fillStyle = planet.color;
      ctx.beginPath();
      ctx.arc(x, y, planet.size * zoom, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px sans-serif';
      ctx.fillText(planet.name, x - 15, y - planet.size * zoom - 5);
      
      if (planet.name === '土星') {
        ctx.strokeStyle = planet.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, planet.size * zoom * 1.8, planet.size * zoom * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      return { x, y };
    };

    const animate = () => {
      ctx.fillStyle = '#000814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          1,
          1
        );
      }
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current.y * 0.01);
      ctx.translate(-centerX, -centerY);
      
      drawSun();
      
      planetsRef.current.forEach(planet => {
        drawOrbit(planet.distance);
      });
      
      planetsRef.current.forEach((planet, index) => {
        if (isPlaying && selectedPlanet !== index) {
          planet.angle += (0.001 * planet.speed * speed);
        }
        drawPlanet(planet, selectedPlanet === index);
      });
      
      ctx.restore();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, zoom, selectedPlanet]);

  const getPlanetAtPosition = (x, y) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = x - rect.left;
    const mouseY = y - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = planetsRef.current.length - 1; i >= 0; i--) {
      const planet = planetsRef.current[i];
      const planetX = centerX + Math.cos(planet.angle) * planet.distance * zoom;
      const planetY = centerY + Math.sin(planet.angle) * planet.distance * zoom;
      const distance = Math.sqrt((mouseX - planetX) ** 2 + (mouseY - planetY) ** 2);
      
      if (distance < planet.size * zoom + 5) {
        return i;
      }
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const planetIndex = getPlanetAtPosition(e.clientX, e.clientY);
    
    if (planetIndex !== null) {
      mouseRef.current.dragType = 'planet';
      setSelectedPlanet(planetIndex);
    } else {
      mouseRef.current.dragType = 'canvas';
    }
    
    mouseRef.current.isDragging = true;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (mouseRef.current.isDragging) {
      if (mouseRef.current.dragType === 'planet' && selectedPlanet !== null) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const angle = Math.atan2(dy, dx);
        
        planetsRef.current[selectedPlanet].angle = angle;
      } else if (mouseRef.current.dragType === 'canvas') {
        const deltaX = e.clientX - mouseRef.current.lastX;
        const deltaY = e.clientY - mouseRef.current.lastY;
        
        rotationRef.current.x += deltaY;
        rotationRef.current.y += deltaX;
      }
      
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    } else {
      const planetIndex = getPlanetAtPosition(e.clientX, e.clientY);
      canvasRef.current.style.cursor = planetIndex !== null ? 'pointer' : 'move';
    }
  };

  const handleMouseUp = () => {
    mouseRef.current.isDragging = false;
    mouseRef.current.dragType = null;
    setSelectedPlanet(null);
  };

  const handleReset = () => {
    rotationRef.current = { x: 0, y: 0 };
    setZoom(1);
    setSpeed(1);
    planetsRef.current = [
      { name: '水星', distance: 50, size: 4, color: '#8C7853', speed: 4.15, angle: 0 },
      { name: '金星', distance: 70, size: 9, color: '#FFC649', speed: 1.62, angle: 0 },
      { name: '地球', distance: 90, size: 10, color: '#4A90E2', speed: 1, angle: 0 },
      { name: '火星', distance: 110, size: 6, color: '#E27B58', speed: 0.53, angle: 0 },
      { name: '木星', distance: 150, size: 20, color: '#C88B3A', speed: 0.08, angle: 0 },
      { name: '土星', distance: 190, size: 17, color: '#FAD5A5', speed: 0.03, angle: 0 },
      { name: '天王星', distance: 220, size: 14, color: '#4FD0E0', speed: 0.01, angle: 0 },
      { name: '海王星', distance: 250, size: 13, color: '#4169E1', speed: 0.006, angle: 0 }
    ];
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">太陽系シミュレーター</h1>
        <p className="text-gray-400 text-sm text-center">惑星をドラッグで移動 / 背景ドラッグで回転 / マウスホイールでズーム</p>
      </div>
      
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-700 rounded-lg shadow-2xl"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
          e.preventDefault();
          if (e.deltaY < 0) handleZoomIn();
          else handleZoomOut();
        }}
      />
      
      <div className="mt-6 flex flex-col gap-4 w-full max-w-2xl">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? '一時停止' : '再生'}
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <RotateCcw size={20} />
            リセット
          </button>
          
          <button
            onClick={handleZoomIn}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <ZoomIn size={20} />
          </button>
          
          <button
            onClick={handleZoomOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <ZoomOut size={20} />
          </button>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <label className="text-white block mb-2">速度: {speed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <label className="text-white block mb-2">ズーム: {zoom.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default SolarSystem;