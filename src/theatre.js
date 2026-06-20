import { getProject, types } from '@theatre/core';

let project;
let sheet;

// function getStudio(module) {
//   const mod = module.default ?? module;
//   return mod.default?.initialize ? mod.default : mod;
// }

export async function initTheatre({ projectName = 'Vixion', sheetName = 'Main', state } = {}) {
  // if (import.meta.env.DEV) {
  //   const studioModule = await import('@theatre/studio');
  //   getStudio(studioModule).initialize();
  // }

  project = getProject(projectName, state ? { state } : undefined);
  sheet = project.sheet(sheetName);

  return { project, sheet };
}

export function getTheatreSheet() {
  return sheet;
}

export function getTheatreProject() {
  return project;
}

export function bindObject3D(theatreKey, object3D, extraProps = {}) {
  const obj = sheet.object(theatreKey, {
    position: types.compound({
      x: types.number(object3D.position.x, { range: [-10, 10] }),
      y: types.number(object3D.position.y, { range: [-10, 10] }),
      z: types.number(object3D.position.z, { range: [-10, 10] }),
    }),
    rotation: types.compound({
      x: types.number(object3D.rotation.x, { range: [-Math.PI, Math.PI] }),
      y: types.number(object3D.rotation.y, { range: [-Math.PI, Math.PI] }),
      z: types.number(object3D.rotation.z, { range: [-Math.PI, Math.PI] }),
    }),
    scale: types.compound({
      x: types.number(object3D.scale.x, { range: [0, 5] }),
      y: types.number(object3D.scale.y, { range: [0, 5] }),
      z: types.number(object3D.scale.z, { range: [0, 5] }),
    }),
    ...extraProps,
  });

  obj.onValuesChange((values) => {
    object3D.position.set(values.position.x, values.position.y, values.position.z);
    object3D.rotation.set(values.rotation.x, values.rotation.y, values.rotation.z);
    object3D.scale.set(values.scale.x, values.scale.y, values.scale.z);
  });

  return obj;
}

export function bindPerspectiveCamera(theatreKey, camera) {
  const obj = sheet.object(theatreKey, {
    position: types.compound({
      x: types.number(camera.position.x, { range: [-20, 20] }),
      y: types.number(camera.position.y, { range: [-20, 20] }),
      z: types.number(camera.position.z, { range: [-20, 20] }),
    }),
    rotation: types.compound({
      x: types.number(camera.rotation.x, { range: [-Math.PI, Math.PI] }),
      y: types.number(camera.rotation.y, { range: [-Math.PI, Math.PI] }),
      z: types.number(camera.rotation.z, { range: [-Math.PI, Math.PI] }),
    }),
    fov: types.number(camera.fov, { range: [10, 75] }),
  });

  obj.onValuesChange((values) => {
    camera.position.set(values.position.x, values.position.y, values.position.z);
    camera.rotation.set(values.rotation.x, values.rotation.y, values.rotation.z);
    camera.fov = values.fov;
    camera.updateProjectionMatrix();
  });

  return obj;
}

export function playSequence(options = {}) {
  return project.ready.then(() => sheet.sequence.play(options));
}
