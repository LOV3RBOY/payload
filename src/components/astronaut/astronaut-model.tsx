"use client";

import { RoundedBox } from "@react-three/drei";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { FrontSide, type Group } from "three";
import { shadeHex, toVisorGlass } from "@/lib/palette";
import type { AstronautColors } from "@/components/astronaut/types";

export type RigNodes = {
  root: Group | null;
  squash: Group | null;
  head: Group | null;
  armL: Group | null;
  armR: Group | null;
  legL: Group | null;
  legR: Group | null;
  thrust: Group | null;
};

function Suit({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.38}
      metalness={0.04}
      clearcoat={0.7}
      clearcoatRoughness={0.24}
      sheen={0.35}
      sheenRoughness={0.45}
      sheenColor="#ffffff"
    />
  );
}

function Accent({ color }: { color: string }) {
  return (
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
  );
}

export const AstronautModel = forwardRef<RigNodes, { colors: AstronautColors }>(function AstronautModel(
  { colors },
  forwarded,
) {
  const root = useRef<Group>(null);
  const squash = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const thrust = useRef<Group>(null);
  const boot = useMemo(() => shadeHex(colors.suit, -0.16), [colors.suit]);
  const panel = useMemo(() => shadeHex(colors.suit, -0.3), [colors.suit]);
  const pack = useMemo(() => shadeHex(colors.suit, -0.1), [colors.suit]);
  const glass = useMemo(() => toVisorGlass(colors.visor), [colors.visor]);

  useImperativeHandle(forwarded, () => ({
    get root() {
      return root.current;
    },
    get squash() {
      return squash.current;
    },
    get head() {
      return head.current;
    },
    get armL() {
      return armL.current;
    },
    get armR() {
      return armR.current;
    },
    get legL() {
      return legL.current;
    },
    get legR() {
      return legR.current;
    },
    get thrust() {
      return thrust.current;
    },
  }));

  return (
    <group ref={root}>
      <group ref={squash}>
        <group ref={legL} position={[-0.24, 0.62, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.22, 6, 16]} />
            <Suit color={colors.suit} />
          </mesh>
          <mesh position={[0.02, -0.16, 0.11]}>
            <boxGeometry args={[0.09, 0.022, 0.012]} />
            <Accent color={colors.accent} />
          </mesh>
          <RoundedBox args={[0.26, 0.16, 0.36]} radius={0.06} smoothness={4} position={[0, -0.5, 0.04]}>
            <Suit color={boot} />
          </RoundedBox>
        </group>

        <group ref={legR} position={[0.24, 0.62, 0]}>
          <mesh position={[0, -0.24, 0]}>
            <capsuleGeometry args={[0.12, 0.22, 6, 16]} />
            <Suit color={colors.suit} />
          </mesh>
          <RoundedBox args={[0.26, 0.16, 0.36]} radius={0.06} smoothness={4} position={[0, -0.5, 0.04]}>
            <Suit color={boot} />
          </RoundedBox>
        </group>

        <RoundedBox args={[0.92, 0.78, 0.58]} radius={0.22} smoothness={5} position={[0, 1.02, 0]}>
          <Suit color={colors.suit} />
        </RoundedBox>

        <RoundedBox args={[0.38, 0.3, 0.05]} radius={0.05} smoothness={3} position={[0, 1.06, 0.3]}>
          <meshStandardMaterial color={panel} roughness={0.55} metalness={0.08} />
        </RoundedBox>
        <mesh position={[-0.02, 1.12, 0.335]}>
          <boxGeometry args={[0.18, 0.038, 0.02]} />
          <Accent color={colors.accent} />
        </mesh>
        <mesh position={[0.02, 1.04, 0.335]}>
          <boxGeometry args={[0.11, 0.03, 0.02]} />
          <Accent color={colors.accent} />
        </mesh>

        <RoundedBox args={[0.56, 0.58, 0.32]} radius={0.1} smoothness={4} position={[0, 1.05, -0.48]}>
          <Suit color={pack} />
        </RoundedBox>
        <mesh position={[0, 1.18, -0.66]}>
          <sphereGeometry args={[0.07, 20, 20]} />
          <Accent color={colors.accent} />
        </mesh>
        <mesh position={[0, 0.92, -0.55]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.28, 0.03, 0.02]} />
          <meshStandardMaterial color={panel} roughness={0.4} />
        </mesh>

        <group ref={armL} position={[-0.52, 1.22, 0]}>
          <mesh position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.11, 0.28, 6, 14]} />
            <Suit color={colors.suit} />
          </mesh>
          <mesh position={[0, -0.52, 0.02]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <Suit color={boot} />
          </mesh>
        </group>

        <group ref={armR} position={[0.52, 1.22, 0]}>
          <mesh position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.11, 0.28, 6, 14]} />
            <Suit color={colors.suit} />
          </mesh>
          <mesh position={[0, -0.52, 0.02]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <Suit color={boot} />
          </mesh>
        </group>

        <mesh position={[0, 1.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.045, 12, 28]} />
          <Suit color={shadeHex(colors.suit, -0.08)} />
        </mesh>

        <group ref={head} position={[0, 1.78, 0]}>
          <mesh>
            <sphereGeometry args={[0.7, 64, 48]} />
            <Suit color={colors.suit} />
          </mesh>
          <group position={[0, 0.03, 0.52]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 0.62, 0.96]} renderOrder={2}>
              <sphereGeometry args={[0.46, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshPhysicalMaterial
                color={glass}
                metalness={1}
                roughness={0.08}
                clearcoat={1}
                clearcoatRoughness={0.05}
                reflectivity={1}
                envMapIntensity={1.6}
                side={FrontSide}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.96]}>
              <torusGeometry args={[0.45, 0.028, 12, 48]} />
              <Suit color={colors.suit} />
            </mesh>
            <mesh position={[0.12, 0.14, 0.18]}>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
            </mesh>
          </group>

          <group position={[-0.76, 0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <mesh>
              <cylinderGeometry args={[0.15, 0.15, 0.1, 24]} />
              <Suit color={colors.suit} />
            </mesh>
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.09, 20]} />
              <meshStandardMaterial color="#e7eef5" roughness={0.3} metalness={0.1} />
            </mesh>
          </group>
          <group position={[0.76, 0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.11, 24]} />
              <Suit color={colors.suit} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <torusGeometry args={[0.1, 0.018, 10, 28]} />
              <Accent color={colors.accent} />
            </mesh>
            <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.07, 20]} />
              <meshStandardMaterial color="#d5dee8" roughness={0.25} metalness={0.2} />
            </mesh>
          </group>
        </group>
      </group>

      <group ref={thrust} position={[0, 0.08, -0.15]} scale={0}>
        <mesh position={[-0.16, 0, -0.05]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0.16, 0, -0.05]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.12, -0.12]} scale={[0.5, 1.3, 0.5]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#fff6d8" transparent opacity={0.75} />
        </mesh>
      </group>
    </group>
  );
});
