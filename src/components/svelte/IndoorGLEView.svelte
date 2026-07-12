<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight, LocateFixed, X } from "@lucide/svelte";
  import * as THREE from "three";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
  import {
    locationStore,
    navigationStore,
    type NavigationAvatarModel,
  } from "../../lib/store.svelte";

  let container: HTMLDivElement;
  let cameraMovedByUser = $state(false);
  let recenterIndoorCamera: (() => void) | null = null;

  const FLOOR_HEIGHT = 4.2;
  const FLOOR_COUNT = 8;
  const BUILDING_HEIGHT = FLOOR_HEIGHT * FLOOR_COUNT;
  const CORRIDOR_LENGTH = 52;
  const CORRIDOR_DEPTH = 7.2;
  const ROOM_SIDE_Z = -3.35;
  const RAIL_SIDE_Z = 3.55;
  const SECOND_FLOOR_Y = FLOOR_HEIGHT;
  const ROOM_X_POSITIONS = [-19.5, -11.7, -3.9, 3.9, 11.7, 19.5] as const;

  const routeTargets = [
    new THREE.Vector3(0, 0.32, 6.2),
    new THREE.Vector3(-7, 0.32, 4.9),
    new THREE.Vector3(-23.5, 0.32, 3.25),
    new THREE.Vector3(
      ROOM_X_POSITIONS[0],
      SECOND_FLOOR_Y + 0.32,
      ROOM_SIDE_Z + 0.45,
    ),
  ];

  const indoorRoutePoints = [
    new THREE.Vector3(0, 0.18, 6.2),
    new THREE.Vector3(-7, 0.18, 4.9),
    new THREE.Vector3(-21.5, 0.18, 4.55),
    new THREE.Vector3(-24.2, 1.7, 2.1),
    new THREE.Vector3(-23.2, SECOND_FLOOR_Y + 0.12, 0.55),
    new THREE.Vector3(
      ROOM_X_POSITIONS[0],
      SECOND_FLOOR_Y + 0.12,
      ROOM_SIDE_Z + 0.45,
    ),
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

  function backToCurrentLocation() {
    recenterIndoorCamera?.();
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
    const routeSegments: {
      material: THREE.MeshBasicMaterial;
      startDistance: number;
      endDistance: number;
    }[] = [];

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

    function addLabel(
      text: string,
      position: THREE.Vector3,
      tone = "#8a2d24",
      options: {
        depthTest?: boolean;
        width?: number;
        height?: number;
        fontSize?: number;
      } = {},
    ) {
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
      ctx.font = `700 ${options.fontSize ?? 54}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, 80);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: options.depthTest ?? false,
          depthWrite: false,
        }),
      );
      sprite.position.copy(position);
      sprite.scale.set(options.width ?? 4.7, options.height ?? 1.45, 1);
      sprite.renderOrder = options.depthTest ? 5 : 10;
      scene.add(sprite);
      labels.push(sprite);
    }

    function createRouteMaterial() {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9b2b24,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      materials.push(mat);
      return mat;
    }

    function addRouteRibbon(points: THREE.Vector3[], width = 0.2) {
      let routeDistance = 0;

      points.slice(0, -1).forEach((from, index) => {
        const to = points[index + 1];
        const segmentVector = to.clone().sub(from);
        const segmentLength = segmentVector.length();
        if (segmentLength === 0) return;

        const pieces = Math.max(1, Math.ceil(segmentLength / 1.15));
        for (let piece = 0; piece < pieces; piece += 1) {
          const start = from.clone().lerp(to, piece / pieces);
          const end = from.clone().lerp(to, (piece + 1) / pieces);
          const direction = end.clone().sub(start);
          const pieceLength = direction.length();
          if (pieceLength === 0) continue;

          direction.normalize();
          const side = new THREE.Vector3().crossVectors(
            direction,
            new THREE.Vector3(0, 1, 0),
          );
          if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
          side.normalize().multiplyScalar(width / 2);

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

          const segmentMaterial = createRouteMaterial();
          const routeSegment = new THREE.Mesh(geometry, segmentMaterial);
          routeSegment.renderOrder = 4;
          routeSegment.castShadow = false;
          routeSegment.receiveShadow = false;
          scene.add(routeSegment);
          routeSegments.push({
            material: segmentMaterial,
            startDistance: routeDistance,
            endDistance: routeDistance + pieceLength,
          });
          routeDistance += pieceLength;
        }
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

    for (let level = 1; level < FLOOR_COUNT; level += 1) {
      const floorNumber = level + 1;
      const floorY = level * FLOOR_HEIGHT;

      ROOM_X_POSITIONS.forEach((roomX, roomIndex) => {
        const roomNumber = `${floorNumber}0${roomIndex + 1}`;
        addBox(
          [6.1, 2.25, 0.16],
          [roomX, floorY + 1.25, ROOM_SIDE_Z - 0.1],
          roomPanel,
        );
        addBox(
          [1.18, 2.45, 0.22],
          [roomX, floorY + 1.18, ROOM_SIDE_Z + 0.08],
          doorMat,
        );
        addLabel(
          `GLE ${roomNumber}`,
          new THREE.Vector3(roomX, floorY + 2.82, ROOM_SIDE_Z + 0.48),
          "#8a2d24",
          { depthTest: true, width: 4.25, height: 1.2, fontSize: 51 },
        );
      });

      [-24.2, 24.2].forEach((stairX) => {
        addLabel(
          `${floorNumber}F`,
          new THREE.Vector3(stairX, floorY + 2.35, 2.55),
          "#333333",
          { depthTest: true, width: 2.25, height: 1.15, fontSize: 62 },
        );
      });
    }

    addStairs(-23.5, "left");
    addStairs(23.5, "right");

    addLabel(
      "GLE",
      new THREE.Vector3(0, FLOOR_HEIGHT * 5.55, RAIL_SIDE_Z + 0.4),
    );
    addLabel("Left Stairs", new THREE.Vector3(-23.5, FLOOR_HEIGHT + 1.35, 1.8));
    addLabel("Right Stairs", new THREE.Vector3(23.5, FLOOR_HEIGHT + 1.35, 1.8));

    addRouteRibbon(indoorRoutePoints, 0.22);

    const floorShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    materials.push(floorShadowMat);

    const avatar = new THREE.Group();
    const floorShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 48),
      floorShadowMat,
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.y = 0.015;
    floorShadow.scale.set(1.4, 0.6, 1);
    floorShadow.castShadow = false;
    floorShadow.receiveShadow = false;
    avatar.add(floorShadow);
    avatar.position.copy(getTargetPosition());
    scene.add(avatar);

    type ExternalAvatarModel = NavigationAvatarModel;
    type LoadedAvatar = {
      object: THREE.Object3D;
      mixer: THREE.AnimationMixer | null;
      baseY: number;
      baseRotationX: number;
      baseRotationZ: number;
    };

    const externalAvatarDefinitions: Record<
      ExternalAvatarModel,
      {
        label: string;
        src: string;
        targetHeight: number;
        groundOffset?: number;
        removeQuaternionTracks?: boolean;
      }
    > = {
      cat: {
        label: "cat",
        src: "/models/oiiaioooooiai-cat.glb",
        targetHeight: 1.45,
        removeQuaternionTracks: true,
      },
      dog: {
        label: "dog",
        src: "/models/low-poly-dog.glb",
        targetHeight: 1.05,
      },
      bird: {
        label: "bird",
        src: "/models/low-poly-bird-animated.glb",
        targetHeight: 0.75,
        groundOffset: 0.18,
      },
      student: {
        label: "student",
        src: "/models/low-poly-rigged-character.glb",
        targetHeight: 2.05,
      },
      hulk: {
        label: "Hulk",
        src: "/models/hulk.glb",
        targetHeight: 2.35,
      },
    };

    let disposed = false;
    const loadedAvatars = new Map<ExternalAvatarModel, LoadedAvatar>();
    const loadingAvatars = new Set<ExternalAvatarModel>();
    const failedAvatars = new Set<ExternalAvatarModel>();
    const avatarLoader = new GLTFLoader();

    function ensureAvatarLoaded(model: NavigationAvatarModel) {
      if (
        loadedAvatars.has(model) ||
        loadingAvatars.has(model) ||
        failedAvatars.has(model)
      ) {
        return;
      }

      const definition = externalAvatarDefinitions[model];
      loadingAvatars.add(model);
      avatarLoader.load(
        definition.src,
        (gltf) => {
          loadingAvatars.delete(model);
          if (disposed) return;

          const modelObject = gltf.scene;
          modelObject.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = true;

            const meshMaterials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            meshMaterials.forEach((meshMaterial) => {
              const map = (meshMaterial as THREE.MeshStandardMaterial).map;
              if (map) {
                map.anisotropy = Math.min(
                  8,
                  renderer.capabilities.getMaxAnisotropy(),
                );
              }
            });
          });

          modelObject.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(modelObject);
          const size = bounds.getSize(new THREE.Vector3());
          if (size.y > 0) {
            modelObject.scale.setScalar(definition.targetHeight / size.y);
          }

          modelObject.updateMatrixWorld(true);
          bounds.setFromObject(modelObject);
          const center = bounds.getCenter(new THREE.Vector3());
          modelObject.position.x -= center.x;
          modelObject.position.y -= bounds.min.y;
          modelObject.position.y += definition.groundOffset ?? 0;
          modelObject.position.z -= center.z;
          modelObject.visible = navigationStore.avatarModel === model;
          avatar.add(modelObject);

          let mixer: THREE.AnimationMixer | null = null;
          const sourceClip = gltf.animations[0];
          if (sourceClip) {
            const tracks = definition.removeQuaternionTracks
              ? sourceClip.tracks.filter(
                  (track) => !(track instanceof THREE.QuaternionKeyframeTrack),
                )
              : sourceClip.tracks;
            const clip = new THREE.AnimationClip(
              `${sourceClip.name}-${model}`,
              sourceClip.duration,
              tracks,
            );
            mixer = new THREE.AnimationMixer(modelObject);
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
          }

          loadedAvatars.set(model, {
            object: modelObject,
            mixer,
            baseY: modelObject.position.y,
            baseRotationX: modelObject.rotation.x,
            baseRotationZ: modelObject.rotation.z,
          });
        },
        undefined,
        (error) => {
          loadingAvatars.delete(model);
          failedAvatars.add(model);
          console.warn(
            `Unable to load the ${definition.label} navigation guide.`,
            error,
          );
        },
      );
    }

    ensureAvatarLoaded(navigationStore.avatarModel);

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
    let walkTime = 0;
    const previousAvatarPosition = avatar.position.clone();
    const defaultViewYaw = Math.atan2(6.5, 8.8);
    const defaultLookHeight = 1.05;
    const defaultCameraDistance = 11;
    let viewYaw = defaultViewYaw;
    let lookHeight = defaultLookHeight;
    let cameraDistance = defaultCameraDistance;
    const cameraHeight = 5.3;
    const lookTarget = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();

    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(value, max));

    const routeDelta = new THREE.Vector3();
    const routeOffset = new THREE.Vector3();
    const routeProjection = new THREE.Vector3();

    function getRouteProgress(position: THREE.Vector3) {
      let traveled = 0;
      let closestProgress = 0;
      let closestDistanceSq = Number.POSITIVE_INFINITY;

      for (let index = 0; index < indoorRoutePoints.length - 1; index += 1) {
        const start = indoorRoutePoints[index];
        const end = indoorRoutePoints[index + 1];
        routeDelta.copy(end).sub(start);
        const lengthSq = routeDelta.lengthSq();
        if (lengthSq === 0) continue;

        const length = Math.sqrt(lengthSq);
        routeOffset.copy(position).sub(start);
        const t = clamp(routeOffset.dot(routeDelta) / lengthSq, 0, 1);
        routeProjection.copy(start).addScaledVector(routeDelta, t);
        const distanceSq = routeProjection.distanceToSquared(position);

        if (distanceSq < closestDistanceSq) {
          closestDistanceSq = distanceSq;
          closestProgress = traveled + length * t;
        }

        traveled += length;
      }

      return closestProgress;
    }

    function updateRouteTraceFade(progress: number) {
      const fadeDistance = 2.75;
      const maxOpacity = 0.92;

      routeSegments.forEach((segment) => {
        const distancePastSegment = progress - segment.endDistance;
        const opacity =
          distancePastSegment <= 0
            ? maxOpacity
            : maxOpacity * clamp(1 - distancePastSegment / fadeDistance, 0, 1);

        segment.material.opacity = opacity;
        segment.material.visible = opacity > 0.025;
      });
    }

    const markCameraMovedByUser = () => {
      cameraMovedByUser = true;
    };

    recenterIndoorCamera = () => {
      viewYaw = defaultViewYaw;
      lookHeight = defaultLookHeight;
      cameraDistance = defaultCameraDistance;
      cameraMovedByUser = false;

      cameraOffset.set(
        Math.sin(viewYaw) * cameraDistance,
        cameraHeight,
        Math.cos(viewYaw) * cameraDistance,
      );
      desiredCamera.copy(avatar.position).add(cameraOffset);
      camera.position.copy(desiredCamera);
      lookTarget.copy(avatar.position);
      lookTarget.y += lookHeight;
      camera.lookAt(lookTarget);
    };

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
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        markCameraMovedByUser();
      }

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
      if (Math.abs(event.deltaY) > 1) markCameraMovedByUser();
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
      const movementDistance = avatar.position.distanceTo(
        previousAvatarPosition,
      );
      previousAvatarPosition.copy(avatar.position);
      const walkingAmount = clamp(movementDistance * 24, 0, 1);
      if (walkingAmount > 0.02) {
        walkTime += 0.11 + walkingAmount * 0.12;
      }
      const selectedModel = navigationStore.avatarModel;
      ensureAvatarLoaded(selectedModel);
      const selectedExternalAvatar = loadedAvatars.get(selectedModel);

      loadedAvatars.forEach((loadedAvatar, model) => {
        loadedAvatar.object.visible =
          model === selectedModel && selectedExternalAvatar !== undefined;
      });
      if (selectedExternalAvatar) {
        const gait = Math.sin(walkTime);
        const doubleStep = Math.sin(walkTime * 2);
        const modelObject = selectedExternalAvatar.object;
        modelObject.position.y =
          selectedExternalAvatar.baseY +
          Math.max(0, doubleStep) * 0.07 * walkingAmount;
        modelObject.rotation.x =
          selectedExternalAvatar.baseRotationX +
          doubleStep * 0.035 * walkingAmount;
        modelObject.rotation.z =
          selectedExternalAvatar.baseRotationZ + gait * 0.065 * walkingAmount;

        if (selectedExternalAvatar.mixer) {
          selectedExternalAvatar.mixer.timeScale =
            walkingAmount > 0.02 ? 1.15 : 0.25;
          selectedExternalAvatar.mixer.update(0.016);
        }
      }
      updateRouteTraceFade(getRouteProgress(avatar.position));

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
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      recenterIndoorCamera = null;
      cameraMovedByUser = false;
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => {
              Object.values(mat).forEach((value) => {
                if (value instanceof THREE.Texture) value.dispose();
              });
              mat.dispose();
            });
          } else {
            Object.values(object.material).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
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

  {#if cameraMovedByUser}
    <button
      type="button"
      class="recenter-button"
      onclick={backToCurrentLocation}
      aria-label="Back to your current location"
    >
      <LocateFixed size="18" />
      <span>Back to Your Current Location</span>
    </button>
  {/if}

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

  .recenter-button {
    position: fixed;
    top: 0.75rem;
    left: 50%;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    width: auto;
    min-width: 0;
    max-width: min(23rem, calc(100vw - 2rem));
    height: 2.55rem;
    padding: 0 0.9rem;
    color: #ffffff;
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
    background: hsl(5, 53%, 32%);
    border: 1px solid rgba(255, 255, 255, 0.34);
    border-radius: 999px;
    box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.2);
    transform: translateX(-50%);
  }

  .recenter-button:hover {
    background: hsl(5, 55%, 27%);
  }

  .recenter-button span {
    overflow: hidden;
    text-overflow: ellipsis;
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

  .indoor-toolbar__actions button {
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

  .indoor-toolbar__actions button:disabled {
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

    .recenter-button {
      top: 4.35rem;
      max-width: calc(100vw - 1rem);
      height: 2.4rem;
      padding: 0 0.75rem;
      font-size: 0.78rem;
    }

    .indoor-toolbar__actions button {
      width: 2rem;
      height: 2rem;
    }
  }
</style>
