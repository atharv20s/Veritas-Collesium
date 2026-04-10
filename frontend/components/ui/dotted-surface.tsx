'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationIdRef = useRef<number>(0);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted || !containerRef.current) return;

        const container = containerRef.current;
        const SEPARATION = 150;
        const AMOUNTX = 40;
        const AMOUNTY = 60;

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000000, 2000, 10000);

        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            10000,
        );
        camera.position.set(0, 355, 1220);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        container.appendChild(renderer.domElement);

        const positions: number[] = [];
        const colors: number[] = [];
        const geometry = new THREE.BufferGeometry();

        for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
                const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
                const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
                positions.push(x, 0, z);
                colors.push(200, 200, 200);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 8,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        let count = 0;
        let disposed = false;

        const animate = () => {
            if (disposed) return;
            animationIdRef.current = requestAnimationFrame(animate);

            const posArr = geometry.attributes.position.array as Float32Array;
            let i = 0;
            for (let ix = 0; ix < AMOUNTX; ix++) {
                for (let iy = 0; iy < AMOUNTY; iy++) {
                    posArr[i * 3 + 1] =
                        Math.sin((ix + count) * 0.3) * 50 +
                        Math.sin((iy + count) * 0.5) * 50;
                    i++;
                }
            }
            geometry.attributes.position.needsUpdate = true;
            renderer.render(scene, camera);
            count += 0.025;
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            disposed = true;
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationIdRef.current);

            scene.traverse((object) => {
                if (object instanceof THREE.Points) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach((m) => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });

            renderer.dispose();

            try {
                if (container.contains(renderer.domElement)) {
                    container.removeChild(renderer.domElement);
                }
            } catch {
                // Already removed
            }
        };
    }, [mounted]);

    if (!mounted) return null;

    return (
        <div
            ref={containerRef}
            className={cn('pointer-events-none fixed inset-0', className)}
            style={{ zIndex: 1 }}
            {...props}
        />
    );
}
