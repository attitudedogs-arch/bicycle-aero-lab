# Session continuation — Bicycle Aero Lab

- [x] Inspect the synchronized project and existing design decisions.
- [x] Add responsive instrument layouts for tablet and mobile screens.
- [x] Style the CFD-ready geometry specification panel.
- [x] Update the primary action label for modified-case comparisons.
- [x] Run TypeScript and production build checks.
- [x] Capture desktop and mobile visual verification screenshots.
- [ ] Save a checkpoint for this continuation.

## Notes

The shared project already contains the CFD-ready geometry milestone from the prior session. This session preserves those changes and layers responsive behavior and geometry-panel styling on top.

## Next milestone — geometry export preparation

- [x] Add an explicit export-preparation state for the geometry contract.
- [x] Surface a compact export manifest with dimensions, posture, and readiness checks.
- [x] Add clear success feedback without implying a real CAD or CFD file has been generated.
- [x] Verify the flow on desktop and mobile, then save a checkpoint.

## Next milestone — saved case history

- [x] Define a browser-local saved-case model for prepared geometry specifications.
- [x] Add a history drawer or panel with case metadata and restore actions.
- [x] Persist saved cases across refreshes without touching backend code.
- [x] Verify save, restore, delete, and empty states on desktop and mobile, then save a checkpoint.

## Next milestone — deeper simulation definition

- [x] Add explicit steady-flow assumptions and operating-condition details.
- [x] Add solver model, turbulence, convergence, and mesh-intent settings.
- [x] Show a time-evolving readiness summary as settings become defined.
- [x] Include the detailed settings in saved cases and manifests.
- [x] Verify the expanded workflow on desktop and mobile, then save a checkpoint.

## Next milestone — dimensionless validation

- [x] Add reference area and characteristic length inputs.
- [x] Calculate Reynolds number from density, speed, viscosity, and characteristic length.
- [x] Show the force-model basis and derived aerodynamic force readout.
- [x] Include validation quantities in saved cases and manifests.
- [x] Verify the validation layer on desktop and mobile, then save a checkpoint.

## Next milestone — solver-run timeline

- [x] Define queued, meshing, solving, review, and idle states for the frontend prototype.
- [x] Add a run control and visible progress timeline with explanatory status text.
- [x] Preserve the distinction between simulated UI progress and real CFD output.
- [x] Verify reset and completion behavior on desktop and mobile, then save a checkpoint.

## Next milestone — expanded case builder

- [x] Add staged 3D subject options for bicycle, rider, and custom-part configurations without overstating asset availability.
- [x] Add cycle, rider posture, mass, dimensions, and custom aerodynamic-part inputs.
- [x] Add location, weather, terrain, surface, slope, and directional airflow controls.
- [x] Connect the expanded case definition to readiness, saved cases, manifests, and preview labels.
- [x] Verify the richer builder on desktop and mobile, then save a checkpoint.

## Next milestone — local 3D asset workflow

- [x] Add local GLB/GLTF file inputs for bicycle, rider, and custom-part roles.
- [x] Load compatible local assets into the 3D preview with a procedural fallback when no asset is selected.
- [x] Show asset names, file types, size, and local-only status without uploading files.
- [x] Include asset metadata in saved cases and manifests where available.
- [x] Verify empty, selected, invalid, and reset states on desktop and mobile, then save a checkpoint.

## Next milestone — independent asset roles

- [x] Define separate bicycle, rider, and custom-part local asset state with procedural fallbacks.
- [x] Add role-specific file inputs, validation, metadata, and clear actions.
- [x] Compose the loaded role assets into the 3D preview with stable framing.
- [x] Include per-role asset metadata in saved cases and manifests.
- [x] Verify empty, mixed, and reset states on desktop and mobile, then save a checkpoint.

## Next milestone — per-role transforms

- [x] Define scale, yaw, pitch, roll, and origin-alignment state for bicycle, rider, and custom-part roles.
- [x] Add compact transform controls with live preview updates and reset actions.
- [x] Persist transform metadata in saved cases and manifests.
- [x] Verify transform behavior and responsive controls on desktop and mobile, then save a checkpoint.

## Next milestone — viewport calibration aids

- [x] Add origin gizmos and visible X/Y/Z axis labels to the 3D viewport.
- [x] Add precise numeric transform readouts and direct inputs for each asset role.
- [x] Add alignment cues and a reset-to-origin action without obscuring the flow field.
- [x] Persist calibration values in saved cases and manifests.
- [x] Verify the calibration layer on desktop and mobile, then save a checkpoint.

## Next milestone — draggable viewport gizmos

- [x] Define a selected asset role and direct manipulation mode without disrupting orbit controls.
- [x] Add drag-to-adjust behavior for rotation and vertical alignment in the 3D viewport.
- [x] Keep numeric transform inputs and saved metadata synchronized with drag changes.
- [x] Add clear selection and reset affordances, then verify desktop and mobile behavior before saving a checkpoint.
