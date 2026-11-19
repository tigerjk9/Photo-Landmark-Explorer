import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface LandmarkGlobeProps {
    latitude: number;
    longitude: number;
    name: string;
    place: string;
    onUnavailable: () => void;
}

const EARTH_RADIUS = 1;
const DEG = Math.PI / 180;
const INTRO_MS = 2800;
const PIN_DROP_MS = 600;
const PULSE_MS = 3200;
const DEFAULT_START_LAT = 20;

const latLngToVector = (lat: number, lng: number, radius: number) => {
    const latR = lat * DEG;
    const lngR = lng * DEG;
    return new THREE.Vector3(
        radius * Math.cos(latR) * Math.cos(lngR),
        radius * Math.sin(latR),
        -radius * Math.cos(latR) * Math.sin(lngR),
    );
};

// 경도 lng를 정면(+z)으로 돌리는 지구 회전각. 위도는 바깥 그룹의 x축 기울기와 같다.
const yawForLongitude = (lng: number) => -Math.PI / 2 - lng * DEG;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBounce = (t: number) => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
};

// 시간대 오프셋으로 사용자의 대략적인 경도를 짐작한다. 위치 권한은 쓰지 않는다.
const roughUserLongitude = () => {
    const offsetHours = -new Date().getTimezoneOffset() / 60;
    return Math.max(-180, Math.min(180, offsetHours * 15));
};

const makeGlowTexture = () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,214,102,1)');
    g.addColorStop(0.25, 'rgba(255,170,60,0.75)');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

const ATMOSPHERE_VERTEX = `
varying vec3 vNormal;
void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ATMOSPHERE_FRAGMENT = `
varying vec3 vNormal;
void main() {
    float intensity = pow(max(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.4);
    gl_FragColor = vec4(0.35, 0.65, 1.0, 1.0) * intensity * 1.1;
}`;

const LandmarkGlobe: React.FC<LandmarkGlobeProps> = ({ latitude, longitude, name, place, onUnavailable }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const [labelShown, setLabelShown] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const label = labelRef.current;
        if (!container || !label) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        } catch {
            onUnavailable();
            return;
        }

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = renderer.domElement;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;outline:none';
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `${name} 위치를 보여주는 지구본. 좌우 방향키나 드래그로 돌릴 수 있습니다.`);
        container.insertBefore(canvas, label);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
        camera.position.set(0, 0, 4.6);

        // 지구: 바깥 tilt 그룹이 위도, 안쪽 spin 그룹이 경도를 맡는다.
        const tilt = new THREE.Group();
        const spin = new THREE.Group();
        tilt.add(spin);
        scene.add(tilt);

        const earthMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 64, 48), earthMaterial);
        earth.visible = false;
        spin.add(earth);

        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(EARTH_RADIUS * 1.12, 48, 32),
            new THREE.ShaderMaterial({
                vertexShader: ATMOSPHERE_VERTEX,
                fragmentShader: ATMOSPHERE_FRAGMENT,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true,
                depthWrite: false,
            }),
        );
        scene.add(atmosphere);

        scene.add(new THREE.AmbientLight(0xffffff, 1.1));
        const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
        sun.position.set(-2.5, 1.6, 4);
        scene.add(sun);

        // 별
        const starCount = 260;
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const v = new THREE.Vector3().randomDirection().multiplyScalar(18);
            starPositions.set([v.x, v.y, v.z], i * 3);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.8 });
        scene.add(new THREE.Points(starGeometry, starMaterial));

        // 시작 자세는 사용자의 대략 경도(시간대 기준)에서 출발해 도착 핀으로 돌아간다.
        // 출발 위치는 근거가 약해 지구본 위에 표시하지 않는다
        const startLat = DEFAULT_START_LAT;
        const startLng = roughUserLongitude();
        const endPoint = latLngToVector(latitude, longitude, EARTH_RADIUS);

        const pin = new THREE.Group();
        const normal = endPoint.clone().normalize();
        pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        pin.position.copy(endPoint);
        const stemMaterial = new THREE.MeshBasicMaterial({ color: 0xffd479 });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8), stemMaterial);
        stem.position.y = 0.07;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1c4 }));
        head.position.y = 0.15;
        const glowTexture = makeGlowTexture();
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.position.y = 0.15;
        glow.scale.setScalar(0.22);
        pin.add(stem, head, glow);
        pin.visible = false;
        spin.add(pin);

        // 목표 자세와 시작 자세
        const targetYaw = yawForLongitude(longitude);
        const targetPitch = latitude * DEG;
        let startYaw = yawForLongitude(startLng);
        // 최단 경로로 회전
        let delta = targetYaw - startYaw;
        delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        startYaw = targetYaw - delta;
        const startPitch = startLat * DEG;

        let yaw = reduceMotion ? targetYaw : startYaw;
        let pitch = reduceMotion ? targetPitch : startPitch;
        let introElapsed = reduceMotion ? INTRO_MS + PIN_DROP_MS : 0;
        let pulseElapsed = reduceMotion ? PULSE_MS : 0;
        let dragging = false;
        let velocity = 0;
        let labelOn = false;
        let disposed = false;
        let frame = 0;
        let last = 0;
        let width = 0;
        let height = 0;

        const labelVector = new THREE.Vector3();
        const toCamera = new THREE.Vector3();

        const setLabel = (on: boolean) => {
            if (on !== labelOn) {
                labelOn = on;
                setLabelShown(on);
            }
        };

        const placeLabel = () => {
            pin.updateWorldMatrix(true, false);
            labelVector.set(0, 0.2, 0).applyMatrix4(pin.matrixWorld);
            toCamera.copy(camera.position).sub(labelVector).normalize();
            const facing = normal.clone().transformDirection(pin.parent!.matrixWorld).dot(toCamera) > 0.08;
            labelVector.project(camera);
            const x = (labelVector.x * 0.5 + 0.5) * width;
            const y = (-labelVector.y * 0.5 + 0.5) * height;
            label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
            label.style.visibility = facing && labelOn ? 'visible' : 'hidden';
        };

        const applyPose = () => {
            spin.rotation.y = yaw;
            tilt.rotation.x = pitch;
        };

        const update = (dt: number) => {
            if (introElapsed < INTRO_MS + PIN_DROP_MS && !dragging) {
                introElapsed += dt;
                const t = Math.min(introElapsed / INTRO_MS, 1);
                const e = easeInOut(t);
                yaw = startYaw + (targetYaw - startYaw) * e;
                pitch = startPitch + (targetPitch - startPitch) * e;
                if (introElapsed > INTRO_MS) {
                    const dropT = Math.min((introElapsed - INTRO_MS) / PIN_DROP_MS, 1);
                    pin.visible = true;
                    pin.position.copy(endPoint).addScaledVector(normal, (1 - easeOutBounce(dropT)) * 0.5);
                    if (dropT >= 1) setLabel(true);
                }
            } else if (introElapsed < INTRO_MS + PIN_DROP_MS && dragging) {
                // 드래그 중에는 연출을 마무리한 상태로 건너뛴다
                introElapsed = INTRO_MS + PIN_DROP_MS;
                pin.visible = true;
                pin.position.copy(endPoint);
                setLabel(true);
            }

            if (!dragging && Math.abs(velocity) > 0.0001) {
                yaw += velocity * dt;
                velocity *= Math.pow(0.0025, dt / 1000);
                if (Math.abs(velocity) <= 0.0001) velocity = 0;
            }

            if (pulseElapsed < PULSE_MS && introElapsed >= INTRO_MS + PIN_DROP_MS) {
                pulseElapsed += dt;
                const s = 0.22 + 0.1 * Math.sin((pulseElapsed / 500) * Math.PI);
                glow.scale.setScalar(pulseElapsed >= PULSE_MS ? 0.22 : s);
            }
            applyPose();
        };

        const isAnimating = () =>
            dragging ||
            Math.abs(velocity) > 0.0001 ||
            introElapsed < INTRO_MS + PIN_DROP_MS ||
            pulseElapsed < PULSE_MS;

        const renderOnce = () => {
            applyPose();
            camera.updateMatrixWorld();
            scene.updateMatrixWorld(true);
            renderer.render(scene, camera);
            placeLabel();
        };

        const tick = (now: number) => {
            frame = 0;
            if (disposed || document.hidden) return;
            const dt = last ? Math.min(now - last, 50) : 16;
            last = now;
            update(dt);
            renderOnce();
            if (isAnimating()) {
                frame = requestAnimationFrame(tick);
            } else {
                last = 0;
            }
        };

        const kick = () => {
            if (!frame && !disposed && !document.hidden) {
                last = 0;
                frame = requestAnimationFrame(tick);
            }
        };

        const resize = () => {
            const rect = container.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            width = rect.width;
            height = rect.height;
            const maxRatio = window.innerWidth < 500 ? 1.5 : 2;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            // 좁은 화면에서도 지구가 잘리지 않도록 가로폭 기준으로 거리 보정
            camera.position.z = Math.max(4.6, 1.22 / (camera.aspect * Math.tan(16 * DEG)));
            camera.updateProjectionMatrix();
            renderOnce();
            kick();
        };

        // 드래그: 가로 이동만 회전으로 쓴다. 세로 이동은 페이지 스크롤에 넘긴다.
        let lastX = 0;
        let lastMoveTime = 0;
        const onPointerDown = (e: PointerEvent) => {
            dragging = true;
            velocity = 0;
            lastX = e.clientX;
            lastMoveTime = e.timeStamp;
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
            kick();
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            const dtMove = Math.max(e.timeStamp - lastMoveTime, 1);
            lastX = e.clientX;
            lastMoveTime = e.timeStamp;
            const dYaw = (dx / Math.max(width, 1)) * Math.PI * 1.2;
            yaw += dYaw;
            velocity = dYaw / dtMove;
            kick();
        };
        const onPointerEnd = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            canvas.style.cursor = 'grab';
            if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
            if (e.timeStamp - lastMoveTime > 80) velocity = 0;
            kick();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            velocity = 0;
            introElapsed = Math.max(introElapsed, INTRO_MS + PIN_DROP_MS);
            pin.visible = true;
            pin.position.copy(endPoint);
            setLabel(true);
            yaw += (e.key === 'ArrowRight' ? -1 : 1) * 12 * DEG;
            kick();
        };
        const onVisibility = () => {
            if (document.hidden) {
                cancelAnimationFrame(frame);
                frame = 0;
                last = 0;
            } else {
                kick();
            }
        };
        const onContextLost = (e: Event) => {
            e.preventDefault();
            if (!disposed) onUnavailable();
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerEnd);
        canvas.addEventListener('pointercancel', onPointerEnd);
        canvas.addEventListener('keydown', onKeyDown);
        canvas.addEventListener('webglcontextlost', onContextLost);
        document.addEventListener('visibilitychange', onVisibility);
        const observer = new ResizeObserver(resize);
        observer.observe(container);

        const loader = new THREE.TextureLoader();
        let earthTexture: THREE.Texture | null = null;
        loader.load(
            '/earth_2048.jpg',
            (texture) => {
                if (disposed) {
                    texture.dispose();
                    return;
                }
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
                earthTexture = texture;
                earthMaterial.map = texture;
                earth.visible = true;
                earthMaterial.needsUpdate = true;
                resize();
                if (reduceMotion) {
                    pin.visible = true;
                    pin.position.copy(endPoint);
                    setLabel(true);
                    renderOnce();
                }
                kick();
            },
            undefined,
            () => {
                if (!disposed) onUnavailable();
            },
        );

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            observer.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            canvas.removeEventListener('webglcontextlost', onContextLost);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerEnd);
            canvas.removeEventListener('pointercancel', onPointerEnd);
            canvas.removeEventListener('keydown', onKeyDown);
            scene.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                mesh.geometry?.dispose();
                const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
                if (Array.isArray(material)) material.forEach((m) => m.dispose());
                else material?.dispose();
            });
            glowTexture.dispose();
            earthTexture?.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
        };
    }, [latitude, longitude, name, onUnavailable]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-72 md:h-96 overflow-hidden rounded-md select-none"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, #12234a 0%, #070d22 62%, #030612 100%)' }}
        >
            <div
                ref={labelRef}
                className={`absolute left-0 top-0 pointer-events-none px-3 py-1.5 rounded-lg bg-black/65 text-white text-center max-w-[70%] transition-opacity duration-500 ${labelShown ? 'opacity-100' : 'opacity-0'}`}
                style={{ visibility: 'hidden', willChange: 'transform' }}
            >
                <p className="text-sm font-bold leading-tight break-keep">{name}</p>
                <p className="text-xs leading-tight text-amber-200 mt-0.5 break-keep">{place}</p>
            </div>
        </div>
    );
};

export default LandmarkGlobe;
