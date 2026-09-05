# Production 3D assets

The app treats `/assets/bicycle.glb` as the primary bicycle asset path and keeps the existing procedural bicycle as a failure fallback. The rider is a separate asset role and can be overridden with `VITE_AERO_RIDER_URL` or the in-app rider upload.

## Bicycle asset staging

Place the supplied `bicycle_simple_3d_model_glb.glb` at `client/public/assets/bicycle.glb` before deployment. The supplied model identifies itself as CC BY 4.0 by Chelebonchik Games / CGDS, so retain attribution when distributing the model.

The runtime normalizes the asset to the lab coordinate convention, fits it to the tunnel scale, grounds it, and preserves the existing airflow/simulation scene.
