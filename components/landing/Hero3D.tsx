'use client';

import { useEffect, useRef } from 'react';

export function Hero3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let THREE: any;
    const loadThree = async () => {
      THREE = await import('three');
      initScene();
    };

    let renderer: any, scene: any, camera: any, barGroup: any;
    let bars: { mesh: any; targetH: number }[] = [];
    let mouseX = 0, mouseY = 0;
    let heroAnimStart = 0;

    function initScene() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = rect.width * 0.6;
      const h = rect.height;

      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
      camera.position.set(2.5, 2.0, 4.0);
      camera.lookAt(0, 0.5, 0);

      scene.add(new THREE.AmbientLight(0xF7F5F0, 0.5));
      const keyLight = new THREE.DirectionalLight(0xFFF5E6, 1.0);
      keyLight.position.set(4, 6, 3);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xC8D8E8, 0.35);
      fillLight.position.set(-4, 2, 1);
      scene.add(fillLight);

      barGroup = new THREE.Group();
      scene.add(barGroup);

      const barCount = 12;
      const barWidth = 0.28;
      const gap = 0.08;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = -totalWidth / 2;
      const barColors = [0xE8441A, 0x1A1714, 0x8FA68E, 0xC4A882, 0xA0A9C0];

      for (let i = 0; i < barCount; i++) {
        const targetH = 0.3 + Math.random() * 2.4;
        const geo = new THREE.BoxGeometry(barWidth, 0.01, barWidth);
        const mat = new THREE.MeshStandardMaterial({ color: barColors[i % barColors.length], roughness: 0.35, metalness: 0.08 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = startX + i * (barWidth + gap);
        mesh.position.y = 0;
        mesh.scale.y = 0.01;
        barGroup.add(mesh);
        bars.push({ mesh, targetH });
      }

      const platformGeo = new THREE.BoxGeometry(totalWidth + 0.5, 0.04, barWidth + 0.4);
      const platformMat = new THREE.MeshStandardMaterial({ color: 0xE2DDD6, roughness: 0.6, metalness: 0.02 });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = -0.02;
      barGroup.add(platform);
      barGroup.rotation.y = -0.4;

      const handleMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      document.addEventListener('mousemove', handleMouseMove);

      animate();

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }

    function animate() {
      animationRef.current = requestAnimationFrame(animate);
      if (!renderer || !scene || !camera) return;

      const time = performance.now() * 0.001;
      if (!heroAnimStart) heroAnimStart = time;
      const elapsed = time - heroAnimStart;

      bars.forEach((bar, i) => {
        const delay = i * 0.08;
        const progress = Math.min(1, Math.max(0, (elapsed - delay) / 0.8));
        const eased = 1 - Math.pow(1 - progress, 3);
        const targetH = bar.targetH * eased;
        bar.mesh.scale.y = Math.max(0.01, targetH * 100);
        bar.mesh.position.y = targetH / 2;
      });

      if (barGroup) {
        barGroup.rotation.y = -0.4 + Math.sin(time * 0.15) * 0.08;
        const targetRotX = -mouseY * 0.12;
        barGroup.rotation.x += (targetRotX - barGroup.rotation.x) * 0.03;
      }

      const targetCamX = 2.5 + mouseX * 0.3;
      const targetCamY = 2.0 - mouseY * 0.2;
      camera.position.x += (targetCamX - camera.position.x) * 0.03;
      camera.position.y += (targetCamY - camera.position.y) * 0.03;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);
    }

    loadThree();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="hero-canvas" />
      <div className="globe-vignette" />
    </>
  );
}
