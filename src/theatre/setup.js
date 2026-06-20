import {
  initTheatre,
  bindObject3D,
  bindPerspectiveCamera,
  getTheatreProject,
} from '../theatre.js';

// Optional: import exported state after saving from Studio
// import projectState from './state.json';

await initTheatre({
  // state: projectState,
});

export function setupTheatreScene({ camera }) {
  bindPerspectiveCamera('Camera', camera);
  return getTheatreProject();
}

export function bindTheatreModel(model) {
  return bindObject3D('Model', model);
}
