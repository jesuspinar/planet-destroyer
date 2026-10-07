/**
 * Builds the Three.js objects for every entity type.
 *
 * Geometries and materials are created once and shared by all instances, so a
 * spawn only allocates `Group`/`Mesh` wrappers.
 */

import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry
} from 'three';

import { PLANET_COLORS, PLANET_SURFACES, SURFACE } from '../config.js';
import { ALIEN } from '../core/game-core.js';
import { planetFragmentShader, planetVertexShader } from './shaders.js';

const SATURN = 'Saturn';

const sphereGeometry = new SphereGeometry(1, 48, 32);

const ringGeometry = new RingGeometry(1.3, 1.9, 64);

const ringMaterial = new MeshBasicMaterial({
  color: 0xc4b49b,
  side: DoubleSide,
  transparent: true,
  opacity: 0.65
});

const alienHullMaterial = new MeshStandardMaterial({
  color: 0xa8d476,
  metalness: 0.7,
  roughness: 0.25
});

const alienGlassMaterial = new MeshStandardMaterial({
  color: 0xcaff93,
  emissive: 0x72a942,
  emissiveIntensity: 0.45,
  metalness: 0.3,
  roughness: 0.3
});

/** Saucer part sizes and offsets, as fractions of the entity radius. */
const SAUCER = {
  HULL: [1.3, 0.32, 0.65],
  DOME: [0.65, 0.55, 0.5],
  DOME_LIFT: 0.24,
  LAMP_COUNT: 5,
  LAMP_SIZE: 0.075,
  LAMP_SPACING: 0.4,
  LAMP_DROP: -0.08,
  LAMP_FRONT: 0.6
};

const PLANET_TILT = 0.18;
const RING_ROTATION = [1.18, 0.22, -0.36];

const planetMaterials = Object.fromEntries(
  Object.entries(PLANET_COLORS).map(([name, [shadow, highlight]]) => [
    name,
    new ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms: {
        colorA: { value: new Color(shadow) },
        colorB: { value: new Color(highlight) },
        kind: { value: PLANET_SURFACES[name] ?? SURFACE.ROCKY }
      }
    })
  ])
);

/** Highlight colour used for a type's explosion particles. */
export function highlightColor(type) {
  return PLANET_COLORS[type][1];
}

function createSaucer(radius) {
  const group = new Group();

  const hull = new Mesh(sphereGeometry, alienHullMaterial);
  hull.scale.set(...SAUCER.HULL.map(fraction => radius * fraction));
  group.add(hull);

  const dome = new Mesh(sphereGeometry, alienGlassMaterial);
  dome.scale.set(...SAUCER.DOME.map(fraction => radius * fraction));
  dome.position.y = radius * SAUCER.DOME_LIFT;
  group.add(dome);

  const middleLamp = (SAUCER.LAMP_COUNT - 1) / 2;

  for (let i = 0; i < SAUCER.LAMP_COUNT; i += 1) {
    const lamp = new Mesh(sphereGeometry, alienGlassMaterial);
    lamp.scale.setScalar(radius * SAUCER.LAMP_SIZE);
    lamp.position.set(
      (i - middleLamp) * radius * SAUCER.LAMP_SPACING,
      radius * SAUCER.LAMP_DROP,
      radius * SAUCER.LAMP_FRONT
    );
    group.add(lamp);
  }

  return group;
}

function createPlanet(type, radius) {
  const group = new Group();

  const body = new Mesh(sphereGeometry, planetMaterials[type]);
  body.scale.setScalar(radius);
  body.rotation.z = PLANET_TILT;
  group.add(body);

  if (type === SATURN) {
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.scale.setScalar(radius);
    ring.rotation.set(...RING_ROTATION);
    group.add(ring);
  }

  return group;
}

export function createEntityMesh(type, radius) {
  return type === ALIEN ? createSaucer(radius) : createPlanet(type, radius);
}
