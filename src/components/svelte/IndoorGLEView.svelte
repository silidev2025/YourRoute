<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight, X } from "@lucide/svelte";
  import * as THREE from "three";
  import { locationStore, navigationStore } from "../../lib/store.svelte";

  let container: HTMLDivElement;

  const FLOOR_HEIGHT = 4.2;
  const FLOOR_COUNT = 8;
  const BUILDING_HEIGHT = FLOOR_HEIGHT * FLOOR_COUNT;
  const CORRIDOR_LENGTH = 52;
  const CORRIDOR_DEPTH = 7.2;
  const ROOM_SIDE_Z = -3.35;
  const RAIL_SIDE_Z = 3.55;
  const SECOND_FLOOR_Y = FLOOR_HEIGHT;

  const routeTargets = [
    new THREE.Vector3(0, 0.32, 6.2),
    new THREE.Vector3(-7, 0.32, 4.9),
    new THREE.Vector3(-23.5, 0.32, 3.25),
    new THREE.Vector3(-18, SECOND_FLOOR_Y + 0.32, ROOM_SIDE_Z + 0.45),
  ];

  const indoorRoutePoints = [
    new THREE.Vector3(0, 0.18, 6.2),
    new THREE.Vector3(-7, 0.18, 4.9),
    new THREE.Vector3(-21.5, 0.18, 4.55),
    new THREE.Vector3(-24.2, 1.7, 2.1),
    new THREE.Vector3(-23.2, SECOND_FLOOR_Y + 0.12, 0.55),
    new THREE.Vector3(-18, SECOND_FLOOR_Y + 0.12, ROOM_SIDE_Z + 0.45),
  ];

  function getTargetPosition() {
    const index = Math.min(
      navigationStore.activeStepIndex,
      routeTargets.length - 1,
    );
    return routeTargets[index] ?? routeTargets[0];
  }

  function movePrevious() {
    const coords = navigationStore.previousStep();
    if (coords) locationStore.startMockNavigation(coords);
  }

  function moveNext() {
    const coords = navigationStore.nextStep();
    if (coords) locationStore.startMockNavigation(coords);
  }

  function closeIndoorView() {
    navigationStore.closeIndoorView();
  }

  onMount(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f2ec);
    scene.fog = new THREE.Fog(0xf5f2ec, 44, 118);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 160);
    camera.position.set(-7, 7.2, 13);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x9b8f82, 2.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-18, 48, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const labels: THREE.Sprite[] = [];
    const materials: THREE.Material[] = [];

    function material(color: number, roughness = 0.78, metalness = 0.02) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
      });
      materials.push(mat);
      return mat;
    }

    const concrete = material(0xb9b6ae);
    const darkConcrete = material(0x595959);
    const redPaint = material(0x8a2d24);
    const whitePaint = material(0xf2f0e9);
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xd8eee6,
      roughness: 0.18,
      metalness: 0,
      transmission: 0.28,
      transparent: true,
      opacity: 0.58,
    });
    materials.push(glass);
    const railMat = material(0xe8e4db, 0.45, 0.18);
    const woodCeiling = material(0x5b4a3d);
    const roomPanel = material(0xd9b56e);
    const doorMat = material(0x42484d);
    const routeMat = new THREE.MeshBasicMaterial({
      color: 0x9b2b24,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    materials.push(routeMat);

    function addBox(
      size: [number, number, number],
      position: [number, number, number],
      mat: THREE.Material,
      castShadow = true,
      receiveShadow = true,
    ) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...position);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      scene.add(mesh);
      return mesh;
    }

    function addLabel(text: string, position: THREE.Vector3, tone = "#8a2d24") {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.roundRect(18, 38, 476, 82, 28);
      ctx.fill();
      ctx.strokeStyle = tone;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.fillStyle = tone;
      ctx.font = "700 54px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, 80);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
        }),
      );
      sprite.position.copy(position);
      sprite.scale.set(4.7, 1.45, 1);
      sprite.renderOrder = 10;
      scene.add(sprite);
      labels.push(sprite);
    }

    function addRouteRibbon(points: THREE.Vector3[], width = 0.2) {
      points.slice(0, -1).forEach((from, index) => {
        const to = points[index + 1];
        const direction = to.clone().sub(from);
        if (direction.lengthSq() === 0) return;

        direction.normalize();
        const side = new THREE.Vector3().crossVectors(
          direction,
          new THREE.Vector3(0, 1, 0),
        );
        if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
        side.normalize().multiplyScalar(width / 2);

        const start = from.clone();
        const end = to.clone();
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              start.x - side.x,
              start.y - side.y,
              start.z - side.z,
              start.x + side.x,
              start.y + side.y,
              start.z + side.z,
              end.x - side.x,
              end.y - side.y,
              end.z - side.z,
              end.x + side.x,
              end.y + side.y,
              end.z + side.z,
            ],
            3,
          ),
        );
        geometry.setIndex([0, 1, 2, 2, 1, 3]);
        geometry.computeVertexNormals();

        const segment = new THREE.Mesh(geometry, routeMat);
        segment.renderOrder = 4;
        segment.castShadow = false;
        segment.receiveShadow = false;
        scene.add(segment);
      });
    }

    function addRailing(y: number) {
      addBox(
        [CORRIDOR_LENGTH, 0.08, 0.08],
        [0, y + 1.12, RAIL_SIDE_Z],
        railMat,
      );
      addBox(
        [CORRIDOR_LENGTH, 0.06, 0.06],
        [0, y + 0.68, RAIL_SIDE_Z],
        railMat,
      );
      for (let x = -25; x <= 25; x += 2.5) {
        addBox([0.05, 1.2, 0.05], [x, y + 0.6, RAIL_SIDE_Z], railMat);
      }
    }

    function addStairFlight(x: number, y: number, side: "left" | "right") {
      const steps = 18;
      const direction = side === "left" ? -1 : 1;
      for (let i = 0; i < steps; i += 1) {
        const t = i / (steps - 1);
        addBox(
          [4.4, 0.16, 0.42],
          [x + direction * t * 1.8, y + 0.1 + t * FLOOR_HEIGHT, 2.9 - t * 2.95],
          concrete,
        );
      }
      addBox(
        [5.1, 0.18, 2.2],
        [x + direction * 1.9, y + FLOOR_HEIGHT, -0.25],
        concrete,
      );
      addBox(
        [0.12, FLOOR_HEIGHT + 0.8, 0.12],
        [x - 2.3, y + FLOOR_HEIGHT / 2, 1.7],
        railMat,
      );
      addBox(
        [0.12, FLOOR_HEIGHT + 0.8, 0.12],
        [x + 2.3, y + FLOOR_HEIGHT / 2, 1.7],
        railMat,
      );
      addBox([4.7, 0.09, 0.09], [x, y + FLOOR_HEIGHT / 2 + 0.9, 1.7], railMat);
    }

    function addStairs(x: number, side: "left" | "right") {
      for (let level = 0; level < FLOOR_COUNT - 1; level += 1) {
        addStairFlight(x, level * FLOOR_HEIGHT, side);
      }
    }

    function addFloorLevel(level: number) {
      const y = level * FLOOR_HEIGHT;
      addBox([CORRIDOR_LENGTH, 0.18, CORRIDOR_DEPTH], [0, y, 0], concrete);
      addBox(
        [CORRIDOR_LENGTH, 0.16, CORRIDOR_DEPTH],
        [0, y + 3.15, 0],
        woodCeiling,
        false,
      );
      addBox(
        [CORRIDOR_LENGTH, 2.15, 0.18],
        [0, y + 1.22, ROOM_SIDE_Z],
        glass,
        false,
      );
      addRailing(y);

      for (let x = -24; x <= 24; x += 8) {
        addBox([0.34, 3.05, 0.34], [x, y + 1.55, RAIL_SIDE_Z - 0.35], redPaint);
      }
    }

    for (let level = 0; level < FLOOR_COUNT; level += 1) {
      addFloorLevel(level);
    }

    addBox(
      [CORRIDOR_LENGTH + 4, 0.2, 9.5],
      [0, -0.14, 0.65],
      darkConcrete,
      false,
    );

    addBox(
      [2.2, BUILDING_HEIGHT + 0.8, 0.28],
      [-26.8, BUILDING_HEIGHT / 2, 0],
      whitePaint,
    );
    addBox(
      [2.2, BUILDING_HEIGHT + 0.8, 0.28],
      [26.8, BUILDING_HEIGHT / 2, 0],
      whitePaint,
    );
    addBox(
      [2.2, BUILDING_HEIGHT + 0.8, 0.32],
      [0, BUILDING_HEIGHT / 2, ROOM_SIDE_Z - 0.16],
      whitePaint,
    );

    addBox(
      [5.2, 2.25, 0.16],
      [-18, SECOND_FLOOR_Y + 1.25, ROOM_SIDE_Z - 0.1],
      roomPanel,
    );
    addBox(
      [1.18, 2.45, 0.22],
      [-18, SECOND_FLOOR_Y + 1.18, ROOM_SIDE_Z + 0.08],
      doorMat,
    );
    addBox(
      [5.2, 2.25, 0.16],
      [-12.2, SECOND_FLOOR_Y + 1.25, ROOM_SIDE_Z - 0.1],
      roomPanel,
    );
    addBox(
      [1.18, 2.45, 0.22],
      [-12.2, SECOND_FLOOR_Y + 1.18, ROOM_SIDE_Z + 0.08],
      doorMat,
    );

    addStairs(-23.5, "left");
    addStairs(23.5, "right");

    addLabel(
      "GLE",
      new THREE.Vector3(0, FLOOR_HEIGHT * 5.55, RAIL_SIDE_Z + 0.4),
    );
    addLabel("Left Stairs", new THREE.Vector3(-23.5, FLOOR_HEIGHT + 1.35, 1.8));
    addLabel("Right Stairs", new THREE.Vector3(23.5, FLOOR_HEIGHT + 1.35, 1.8));
    addLabel(
      "GLE 201",
      new THREE.Vector3(-18, SECOND_FLOOR_Y + 2.85, ROOM_SIDE_Z + 0.55),
    );
    addLabel(
      "2F",
      new THREE.Vector3(-21.8, SECOND_FLOOR_Y + 2.3, 2.55),
      "#333333",
    );
    addLabel(
      "8F",
      new THREE.Vector3(-21.8, FLOOR_HEIGHT * 7 + 2.3, 2.55),
      "#333333",
    );

    addRouteRibbon(indoorRoutePoints, 0.22);

    const avatar = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.72, 5, 12),
      material(0x202020),
    );
    body.position.y = 0.63;
    body.castShadow = true;
    avatar.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 16),
      material(0xf1c7a5),
    );
    head.position.y = 1.25;
    head.castShadow = true;
    avatar.add(head);
    const pointer = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.48, 18),
      material(0x8a2d24),
    );
    pointer.rotation.x = Math.PI / 2;
    pointer.position.set(0, 0.1, -0.38);
    avatar.add(pointer);
    avatar.position.copy(getTargetPosition());
    scene.add(avatar);

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    let animationFrame = 0;
    let viewYaw = Math.atan2(6.5, 8.8);
    let lookHeight = 1.05;
    let cameraDistance = 11;
    const cameraHeight = 5.3;
    const lookTarget = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();

    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(value, max));

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      activePointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;

      viewYaw -= deltaX * 0.006;
      lookHeight = clamp(lookHeight - deltaY * 0.035, 0.55, BUILDING_HEIGHT);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;
      activePointerId = null;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraDistance = clamp(cameraDistance + event.deltaY * 0.008, 6.5, 24);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);

      const target = getTargetPosition();
      avatar.position.lerp(target, 0.065);

      const nextTarget = getTargetPosition();
      const heading = nextTarget.clone().sub(avatar.position);
      if (heading.lengthSq() > 0.001) {
        avatar.rotation.y = Math.atan2(heading.x, heading.z);
      }

      cameraOffset.set(
        Math.sin(viewYaw) * cameraDistance,
        cameraHeight,
        Math.cos(viewYaw) * cameraDistance,
      );
      desiredCamera.copy(avatar.position).add(cameraOffset);
      camera.position.lerp(desiredCamera, 0.04);
      lookTarget.copy(avatar.position);
      lookTarget.y += lookHeight;
      camera.lookAt(lookTarget);

      labels.forEach((label) => {
        label.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
        if (object instanceof THREE.Sprite && object.material.map) {
          object.material.map.dispose();
          object.material.dispose();
        }
      });
      materials.forEach((mat) => mat.dispose());
      renderer.domElement.remove();
    };
  });
</script>

<section class="indoor-view" aria-label="GLE 3D indoor navigation">
  <div bind:this={container} class="indoor-canvas"></div>

  <div class="indoor-toolbar">
    <div>
      <strong>GLE 3D - {FLOOR_COUNT}F</strong>
      <span>{navigationStore.currentStep?.label ?? "Indoor route"}</span>
    </div>
    <div class="indoor-toolbar__actions">
      <button
        type="button"
        title="Previous step"
        aria-label="Previous step"
        onclick={movePrevious}
        disabled={navigationStore.activeStepIndex === 0}
      >
        <ChevronLeft size="18" />
      </button>
      <button
        type="button"
        title="Next step"
        aria-label="Next step"
        onclick={moveNext}
        disabled={navigationStore.activeStepIndex ===
          navigationStore.totalSteps - 1}
      >
        <ChevronRight size="18" />
      </button>
      <button
        type="button"
        title="Close 3D view"
        aria-label="Close 3D view"
        onclick={closeIndoorView}
      >
        <X size="18" />
      </button>
    </div>
  </div>
</section>

<style>
  .indoor-view {
    position: fixed;
    inset: 0;
    z-index: 22;
    overflow: hidden;
    background: #f5f2ec;
    pointer-events: auto;
  }

  .indoor-canvas {
    width: 100%;
    height: 100%;
    cursor: grab;
    touch-action: none;
  }

  .indoor-canvas:active {
    cursor: grabbing;
  }

  .indoor-canvas :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .indoor-toolbar {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: min(22rem, calc(100vw - 1rem));
    padding: 0.45rem;
    color: #151515;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 0.5rem;
    box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(10px);
  }

  .indoor-toolbar > div:first-child {
    min-width: 0;
  }

  .indoor-toolbar strong {
    display: block;
    overflow: hidden;
    font-size: 0.85rem;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .indoor-toolbar span {
    display: block;
    margin-top: 0.1rem;
    color: #555555;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .indoor-toolbar__actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.3rem;
  }

  button {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    color: hsl(5, 53%, 32%);
    background: white;
    border: 1px solid #dddddd;
    border-radius: 50%;
    cursor: pointer;
  }

  button:disabled {
    color: #8a8a8a;
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media screen and (max-width: 42rem) {
    .indoor-toolbar {
      left: 0.5rem;
      right: 0.5rem;
      justify-content: space-between;
      max-width: none;
    }

    button {
      width: 2rem;
      height: 2rem;
    }
  }
</style>
