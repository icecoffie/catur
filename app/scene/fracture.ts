/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: cuts a piece's real mesh into closed chunks along Voronoi cells, so debris keeps the piece's carved surface and finish and shows raw broken faces where it split.
import * as THREE from "three/webgpu";
import { seeded } from "../lib/utils.js";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Corner = {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  u: number;
  v: number;
};
type Cell = { seed: THREE.Vector3; planes: (THREE.Plane | null)[] };
export type Chunk = {
  outer: THREE.BufferGeometry;
  inner: THREE.BufferGeometry;
  center: THREE.Vector3;
  size: THREE.Vector3;
};

// -----------------------------------------------------------------------------
// Clipping a polygon against one side of a plane
// -----------------------------------------------------------------------------
const between = (a: Corner, b: Corner, t: number): Corner => ({
  point: a.point.clone().lerp(b.point, t),
  normal: a.normal.clone().lerp(b.normal, t).normalize(),
  u: a.u + (b.u - a.u) * t,
  v: a.v + (b.v - a.v) * t
});

const clip = (
  polygon: Corner[],
  plane: THREE.Plane
): { kept: Corner[]; cut: Corner[] } => {
  const distances = polygon.map((corner) =>
    plane.distanceToPoint(corner.point)
  );
  const cut: Corner[] = [];
  const kept = polygon.flatMap((corner, index) => {
    const nextIndex = (index + 1) % polygon.length;
    const here = distances[index];
    const there = distances[nextIndex];
    const own = here <= 0 ? [corner] : [];
    if (here <= 0 === there <= 0) return own;
    const made = between(corner, polygon[nextIndex], here / (here - there));
    cut.push(made);
    return [...own, made];
  });
  return { kept, cut };
};

const fan = (polygon: Corner[]): Corner[] =>
  polygon
    .slice(1, -1)
    .flatMap((corner, index) => [polygon[0], corner, polygon[index + 2]]);

// -----------------------------------------------------------------------------
// Laying out the cells inside the piece
// -----------------------------------------------------------------------------
const cellsFor = (corners: Corner[], count: number): Cell[] => {
  const byHeight = [...corners].sort((a, b) => a.point.y - b.point.y);
  // Seeds follow the mesh, drawn toward its axis, so cells stay chunky at every height.
  const seeds = Array.from({ length: count }, (_, index) => {
    const along = (index + seeded(index + 3)) / count;
    const corner = byHeight[Math.floor(along * (byHeight.length - 1))];
    const pull = 0.3 + seeded(index + 53) * 0.45;
    return new THREE.Vector3(
      corner.point.x * pull,
      corner.point.y,
      corner.point.z * pull
    );
  });
  return seeds.map((seed, own) => ({
    seed,
    planes: seeds.map((other, index) =>
      index === own
        ? null
        : new THREE.Plane().setFromNormalAndCoplanarPoint(
            other.clone().sub(seed).normalize(),
            other.clone().add(seed).multiplyScalar(0.5)
          )
    )
  }));
};

const nearestCell = (cells: Cell[], point: THREE.Vector3): number =>
  cells.reduce(
    (best, cell, index) => {
      const distance = cell.seed.distanceToSquared(point);
      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Infinity }
  ).index;

// -----------------------------------------------------------------------------
// Closing each chunk: the piece's whole cross-section on a cut plane, trimmed to the cell
// -----------------------------------------------------------------------------
const capsFor = (
  cell: Cell,
  cutBy: Set<number>,
  triangles: Corner[][],
  grainScale: number
): Corner[] =>
  [...cutBy].flatMap((planeIndex) => {
    const plane = cell.planes[planeIndex] as THREE.Plane;
    const edges = triangles.flatMap((triangle) => {
      const { cut } = clip(triangle, plane);
      return cut.length === 2 ? [cut] : [];
    });
    const across = new THREE.Vector3(0.31, 0.87, 0.38)
      .cross(plane.normal)
      .normalize();
    const up = plane.normal.clone().cross(across);
    const corner = (point: THREE.Vector3): Corner => ({
      point,
      normal: plane.normal.clone(),
      u: point.dot(across) * grainScale,
      v: point.dot(up) * grainScale
    });
    const points = edges.flat().map((entry) => entry.point);
    const middle = points
      .reduce((sum, point) => sum.add(point), new THREE.Vector3())
      .multiplyScalar(1 / points.length);
    return edges.flatMap(([a, b]) => {
      const faces = a.point
        .clone()
        .sub(middle)
        .cross(b.point.clone().sub(middle))
        .dot(plane.normal);
      const triangle =
        faces >= 0
          ? [corner(middle), corner(a.point), corner(b.point)]
          : [corner(middle), corner(b.point), corner(a.point)];
      const trimmed = cell.planes.reduce<Corner[]>(
        (polygon, other, index) =>
          !other || index === planeIndex || polygon.length < 3
            ? polygon
            : clip(polygon, other).kept,
        triangle
      );
      return trimmed.length >= 3 ? fan(trimmed) : [];
    });
  });

const geometryFrom = (
  corners: Corner[],
  center: THREE.Vector3
): THREE.BufferGeometry => {
  // A chunk with no cut face still needs a shape, so both of its halves stay in step.
  const flat: Corner = {
    point: center,
    normal: new THREE.Vector3(0, 1, 0),
    u: 0,
    v: 0
  };
  const used = corners.length ? corners : [flat, flat, flat];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(
        used.flatMap(({ point }) => [
          point.x - center.x,
          point.y - center.y,
          point.z - center.z
        ])
      ),
      3
    )
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(
      new Float32Array(
        used.flatMap(({ normal }) => [normal.x, normal.y, normal.z])
      ),
      3
    )
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(
      new Float32Array(used.flatMap(({ u, v }) => [u, v])),
      2
    )
  );
  return geometry;
};

// -----------------------------------------------------------------------------
// Fracturing a whole piece
// -----------------------------------------------------------------------------
export const fractureMesh = (
  source: THREE.BufferGeometry,
  count: number
): Chunk[] => {
  const position = source.getAttribute("position");
  const normal = source.getAttribute("normal");
  const texcoord = source.getAttribute("uv");
  const cornerAt = (index: number): Corner => ({
    point: new THREE.Vector3().fromBufferAttribute(position, index),
    normal: new THREE.Vector3().fromBufferAttribute(normal, index),
    u: texcoord.getX(index),
    v: texcoord.getY(index)
  });
  const order = source.index
    ? Array.from(source.index.array as ArrayLike<number>)
    : Array.from({ length: position.count }, (_, index) => index);
  const corners = order.map(cornerAt);
  const cells = cellsFor(corners, count);
  const surfaces = cells.map(() => [] as Corner[]);
  const cutBy = cells.map(() => new Set<number>());

  const triangles = Array.from({ length: corners.length / 3 }, (_, index) =>
    corners.slice(index * 3, index * 3 + 3)
  );
  triangles.forEach((triangle) => {
    const owners = triangle.map(({ point }) => nearestCell(cells, point));
    if (owners[0] === owners[1] && owners[1] === owners[2]) {
      surfaces[owners[0]].push(...triangle);
      return;
    }
    const middle = triangle[0].point
      .clone()
      .add(triangle[1].point)
      .add(triangle[2].point)
      .multiplyScalar(1 / 3);
    new Set([...owners, nearestCell(cells, middle)]).forEach((cellIndex) => {
      const cell = cells[cellIndex];
      const kept = cell.planes.reduce<Corner[]>(
        (polygon, plane, planeIndex) => {
          if (!plane || polygon.length < 3) return polygon;
          const result = clip(polygon, plane);
          if (result.cut.length === 2) cutBy[cellIndex].add(planeIndex);
          return result.kept;
        },
        triangle
      );
      if (kept.length >= 3) surfaces[cellIndex].push(...fan(kept));
    });
  });

  return cells.flatMap((cell, index) => {
    const outer = surfaces[index];
    if (!outer.length) return [];
    const inner = capsFor(cell, cutBy[index], triangles, 1);
    const box = new THREE.Box3().setFromPoints(
      [...outer, ...inner].map(({ point }) => point)
    );
    const center = box.getCenter(new THREE.Vector3());
    return [
      {
        outer: geometryFrom(outer, center),
        inner: geometryFrom(inner, center),
        center,
        size: box.getSize(new THREE.Vector3())
      }
    ];
  });
};
