/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: bloom small enough to run live: bright areas are gathered at an eighth of the screen, blurred at two widths, and added back over the image.
import * as THREE from "three/webgpu";
import { dot, screenUV, texture, uniform, vec2, vec3 } from "three/tsl";
import { config } from "../config.js";

const gatherTaps = [-1, 0, 1].flatMap((y) =>
  [-1, 0, 1].map((x) => [x, y] as const)
);
const blurTaps = [
  [0, 0.227],
  [1.3846, 0.3162],
  [-1.3846, 0.3162],
  [3.2307, 0.0703],
  [-3.2307, 0.0703]
] as const;

const glowTarget = (): THREE.RenderTarget =>
  new THREE.RenderTarget(2, 2, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false
  });

const passOf = (node: unknown): THREE.QuadMesh => {
  const material = new THREE.MeshBasicNodeMaterial({
    toneMapped: false,
    depthTest: false,
    depthWrite: false
  });
  material.colorNode = node as never;
  return new THREE.QuadMesh(material);
};

export const createBloom = (renderer: THREE.WebGPURenderer) => {
  const strength = uniform(0);
  const threshold = uniform(1);
  const sourceTexel = uniform(new THREE.Vector2());
  const source = texture(new THREE.Texture(), screenUV);
  const wide = [glowTarget(), glowTarget()];
  const wider = [glowTarget(), glowTarget()];

  const gathered = gatherTaps
    .map(([x, y]) =>
      source.sample(
        screenUV.add(vec2(x, y).mul(sourceTexel).mul(config.glow.gatherReach))
      )
    )
    .reduce((sum, tap) => sum.add(tap) as typeof tap);
  const average = gathered.rgb
    .div(gatherTaps.length)
    .min(vec3(config.glow.limit));
  const brightness = dot(average, vec3(0.2126, 0.7152, 0.0722));
  const gather = passOf(
    average.mul(brightness.sub(threshold).max(0).div(brightness.max(0.001)))
  );

  const blurred = (map: THREE.RenderTarget, step: unknown): unknown =>
    blurTaps
      .map(([offset, weight]) =>
        texture(
          map.texture,
          screenUV.add((step as ReturnType<typeof vec2>).mul(offset))
        ).rgb.mul(weight)
      )
      .reduce((sum, tap) => sum.add(tap));

  const texelWide = uniform(new THREE.Vector2());
  const texelWider = uniform(new THREE.Vector2());
  const across = (texel: unknown): unknown =>
    vec2((texel as ReturnType<typeof vec2>).x, 0);
  const down = (texel: unknown): unknown =>
    vec2(0, (texel as ReturnType<typeof vec2>).y);
  const passes: { target: THREE.RenderTarget; quad: THREE.QuadMesh }[] = [
    { target: wide[1], quad: passOf(blurred(wide[0], across(texelWide))) },
    { target: wide[0], quad: passOf(blurred(wide[1], down(texelWide))) },
    { target: wider[1], quad: passOf(blurred(wide[0], across(texelWider))) },
    { target: wider[0], quad: passOf(blurred(wider[1], down(texelWider))) }
  ];

  const sizeTo = (width: number, height: number): void => {
    const w = Math.max(2, Math.round(width / config.glow.divide));
    const h = Math.max(2, Math.round(height / config.glow.divide));
    if (wide[0].width === w && wide[0].height === h) return;
    wide.forEach((target) => target.setSize(w, h));
    wider.forEach((target) =>
      target.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1))
    );
    (texelWide.value as THREE.Vector2).set(1 / w, 1 / h);
    (texelWider.value as THREE.Vector2).set(2 / w, 2 / h);
  };

  return {
    // What the final image adds to itself, in linear light.
    added: texture(wide[0].texture, screenUV)
      .rgb.add(texture(wider[0].texture, screenUV).rgb)
      .mul(strength),
    setLook: (bloom: number, cutoff: number): void => {
      strength.value = bloom;
      threshold.value = cutoff;
    },
    run: (from: THREE.Texture, width: number, height: number): void => {
      sizeTo(width, height);
      source.value = from;
      (sourceTexel.value as THREE.Vector2).set(1 / width, 1 / height);
      renderer.setRenderTarget(wide[0]);
      gather.render(renderer);
      passes.forEach(({ target, quad }) => {
        renderer.setRenderTarget(target);
        quad.render(renderer);
      });
      renderer.setRenderTarget(null);
    }
  };
};
