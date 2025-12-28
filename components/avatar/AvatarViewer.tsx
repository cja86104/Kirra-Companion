'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  useGLTF,
  useAnimations,
  Html,
  PerspectiveCamera,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';

import { cn } from '@/lib/utils/cn';
import type { 
  CompanionVisualState, 
  EmotionalExpression,
  IdleAnimation,
  ActivityAnimation,
} from '@/lib/companion/avatar-system';

// ============================================================
// TYPES
// ============================================================

interface AvatarViewerProps {
  visualState: CompanionVisualState;
  className?: string;
  onAvatarClick?: () => void;
  interactive?: boolean;
}

interface AvatarModelProps {
  modelUrl: string;
  expression: EmotionalExpression;
  animation: IdleAnimation | ActivityAnimation;
  isLookingAtCamera: boolean;
  onLoaded?: () => void;
}

// ============================================================
// AVATAR MODEL COMPONENT
// ============================================================

function AvatarModel({ 
  modelUrl, 
  expression, 
  animation,
  isLookingAtCamera,
  onLoaded,
}: AvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, mixer } = useAnimations(animations, group);
  const { camera } = useThree();

  // Clone scene to avoid shared state issues
  const clonedScene = scene.clone();

  // Handle animation changes
  useEffect(() => {
    // Find matching animation or fall back to idle
    const animationName = animation || 'idle';
    const action = actions[animationName] || actions['idle'] || Object.values(actions)[0];
    
    if (action) {
      // Fade to new animation
      Object.values(actions).forEach((a) => a?.fadeOut(0.5));
      action.reset().fadeIn(0.5).play();
    }
  }, [animation, actions]);

  // Handle expressions via morph targets
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.morphTargetInfluences) {
        const morphDict = child.morphTargetDictionary;
        if (!morphDict) return;

        // Reset all expressions
        Object.keys(morphDict).forEach((key) => {
          const index = morphDict[key];
          if (child.morphTargetInfluences && index !== undefined) {
            child.morphTargetInfluences[index] = 0;
          }
        });

        // Set current expression
        const expressionMorphs: Record<EmotionalExpression, string[]> = {
          neutral: [],
          happy: ['mouthSmile', 'eyeSquintLeft', 'eyeSquintRight'],
          sad: ['mouthFrownLeft', 'mouthFrownRight', 'browInnerUp'],
          excited: ['mouthOpen', 'eyeWideLeft', 'eyeWideRight', 'mouthSmile'],
          tired: ['eyeBlinkLeft', 'eyeBlinkRight', 'mouthClose'],
          thinking: ['browInnerUp', 'mouthPucker'],
          laughing: ['mouthSmile', 'eyeSquintLeft', 'eyeSquintRight', 'jawOpen'],
          crying: ['mouthFrownLeft', 'mouthFrownRight', 'eyeSquintLeft', 'eyeSquintRight'],
          angry: ['browDownLeft', 'browDownRight', 'mouthFrownLeft', 'mouthFrownRight'],
          surprised: ['eyeWideLeft', 'eyeWideRight', 'jawOpen', 'browInnerUp'],
          loving: ['mouthSmile', 'eyeSquintLeft', 'eyeSquintRight'],
          shy: ['mouthSmile', 'eyeBlinkLeft'],
          playful: ['mouthSmile', 'tongueOut'],
          worried: ['browInnerUp', 'mouthFrownLeft', 'mouthFrownRight'],
          peaceful: ['eyeBlinkLeft', 'eyeBlinkRight', 'mouthSmile'],
        };

        const morphsToActivate = expressionMorphs[expression] || [];
        morphsToActivate.forEach((morphName) => {
          const index = morphDict[morphName];
          if (child.morphTargetInfluences && index !== undefined) {
            child.morphTargetInfluences[index] = 0.7;
          }
        });
      }
    });
  }, [expression, clonedScene]);

  // Look at camera effect
  useFrame(() => {
    if (group.current && isLookingAtCamera) {
      // Find head bone and rotate towards camera
      const head = group.current.getObjectByName('Head');
      if (head) {
        const targetRotation = new THREE.Euler(
          camera.position.y * 0.1,
          camera.position.x * 0.1,
          0
        );
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetRotation.x, 0.1);
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetRotation.y, 0.1);
      }
    }
  });

  // Notify when loaded
  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  return (
    <group ref={group} dispose={null}>
      <primitive 
        object={clonedScene} 
        scale={1} 
        position={[0, -1, 0]}
      />
    </group>
  );
}

// ============================================================
// FALLBACK AVATAR (When no 3D model)
// ============================================================

function FallbackAvatar({ expression }: { expression: EmotionalExpression }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  // Expression to color mapping
  const expressionColors: Record<EmotionalExpression, string> = {
    neutral: '#8B5CF6',
    happy: '#F59E0B',
    sad: '#3B82F6',
    excited: '#EC4899',
    tired: '#6B7280',
    thinking: '#8B5CF6',
    laughing: '#F59E0B',
    crying: '#3B82F6',
    angry: '#EF4444',
    surprised: '#EC4899',
    loving: '#F472B6',
    shy: '#F9A8D4',
    playful: '#A855F7',
    worried: '#6366F1',
    peaceful: '#10B981',
  };

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <capsuleGeometry args={[0.5, 1, 4, 16]} />
      <meshStandardMaterial 
        color={expressionColors[expression]} 
        emissive={expressionColors[expression]}
        emissiveIntensity={0.2}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

// ============================================================
// ROOM ENVIRONMENT
// ============================================================

function RoomEnvironment({ 
  roomType, 
  timeOfDay, 
  lighting 
}: { 
  roomType: string; 
  timeOfDay: string;
  lighting: string;
}) {
  // Background color based on time
  const bgColors: Record<string, string> = {
    morning: '#FEF3C7',
    afternoon: '#DBEAFE',
    evening: '#FED7AA',
    night: '#1E293B',
  };

  // Ambient light intensity based on lighting
  const lightIntensity: Record<string, number> = {
    bright: 1.2,
    normal: 0.8,
    dim: 0.4,
    dark: 0.1,
  };

  return (
    <>
      <color attach="background" args={[bgColors[timeOfDay] || bgColors.afternoon]} />
      <ambientLight intensity={lightIntensity[lighting] || 0.8} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={lightIntensity[lighting] || 0.8} 
        castShadow 
      />
      <ContactShadows 
        position={[0, -1, 0]} 
        opacity={0.4} 
        scale={10} 
        blur={2} 
      />
    </>
  );
}

// ============================================================
// LOADING INDICATOR
// ============================================================

function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading avatar...</p>
      </div>
    </Html>
  );
}

// ============================================================
// MAIN AVATAR VIEWER COMPONENT
// ============================================================

export function AvatarViewer({ 
  visualState, 
  className,
  onAvatarClick,
  interactive = true,
}: AvatarViewerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasModel = visualState.appearance.modelUrl !== null;
  const currentAnimation = visualState.animation.currentActivity || visualState.animation.currentIdle;

  return (
    <div 
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted/50 to-muted',
        className
      )}
      onClick={onAvatarClick}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0, 3], fov: 50 }}
        onError={() => setError('Failed to initialize 3D viewer')}
      >
        <Suspense fallback={<LoadingIndicator />}>
          <PerspectiveCamera makeDefault position={[0, 0, 3]} />
          
          <RoomEnvironment 
            roomType={visualState.room.currentRoom}
            timeOfDay={visualState.room.timeOfDay}
            lighting={visualState.room.lighting}
          />

          {hasModel ? (
            <AvatarModel
              modelUrl={visualState.appearance.modelUrl!}
              expression={visualState.animation.expression}
              animation={currentAnimation}
              isLookingAtCamera={visualState.isLookingAtCamera}
              onLoaded={() => setIsLoaded(true)}
            />
          ) : (
            <FallbackAvatar expression={visualState.animation.expression} />
          )}

          {interactive && (
            <OrbitControls 
              enablePan={false}
              enableZoom={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 2}
              minAzimuthAngle={-Math.PI / 4}
              maxAzimuthAngle={Math.PI / 4}
            />
          )}

          <Environment preset="apartment" />
        </Suspense>
      </Canvas>

      {/* Particle Effects Overlay */}
      {visualState.particleEffect !== 'none' && (
        <ParticleOverlay effect={visualState.particleEffect} />
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PARTICLE OVERLAY (Hearts, Sparkles, etc.)
// ============================================================

function ParticleOverlay({ effect }: { effect: string }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
  }));

  const effectEmoji: Record<string, string> = {
    hearts: '❤️',
    sparkles: '✨',
    flowers: '🌸',
    music_notes: '🎵',
  };

  const emoji = effectEmoji[effect] || '✨';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute animate-float text-2xl"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            bottom: '-40px',
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

// Preload common model
// useGLTF.preload('/models/default-avatar.glb');
