import {
  initTheatre,
  bindObject3D,
  bindPerspectiveCamera,
  getTheatreProject,
} from '../theatre.js';

import projectState from '../Vixion.theatre-project-state-v2.json';

await initTheatre({
  state: projectState,
});

export function setupTheatreScene({ camera }) {
  bindPerspectiveCamera('Camera', camera);
  return getTheatreProject();
}

export function bindTheatreModel(model) {
  return bindObject3D('Model', model);
}
