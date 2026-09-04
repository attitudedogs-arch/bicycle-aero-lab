# Bicycle Aero Lab — Design Direction

## Three stylistic approaches

### Theme Name: Wind-Tunnel Instrument
Very Brief Intro: A precise, instrument-panel aesthetic inspired by laboratory equipment, technical drawings, and airflow test rigs. The interface feels trustworthy, measurable, and built for careful experimentation.
Probability: 0.047

### Theme Name: Field Notes / Carbon Paper
Very Brief Intro: A warm editorial workshop aesthetic blending engineering notebooks, graphite marks, and premium cycling culture. It makes technical analysis feel tactile and approachable rather than intimidating.
Probability: 0.083

### Theme Name: Midnight Vector Lab
Very Brief Intro: A dark, high-contrast technical environment with electric cyan airflow vectors and restrained orange status accents. It communicates advanced computation and real-time experimentation.
Probability: 0.019

## Selected approach: Wind-Tunnel Instrument

### Design Movement
Contemporary scientific instrumentation UI fused with Swiss modernist information design and the visual language of physical wind-tunnel test equipment.

### Core Principles
1. Every control should communicate a measurable physical variable, not decorative complexity.
2. Asymmetric layouts should mirror a real laboratory: an instrument rail, an observation bay, and a compact results ledger.
3. Airflow is the visual signature: fine vector lines, contour bands, and quiet motion rather than generic gradients.
4. Precision and confidence must be visible through units, status labels, validation states, and explicit baseline comparisons.

### Color Philosophy
Use a warm mineral-white canvas, charcoal ink, oxidized blue, and one ownable signal color: pressure-copper. The palette should feel like a physical lab instrument—calm enough for long analysis sessions, with copper reserved for active simulation, warnings, and key measured values. Avoid neon and purple gradients.

### Layout Paradigm
A persistent left experiment rail holds the run identity and simulation status. The main workspace is an offset observation bay with the 3D viewport taking visual priority. A narrow right ledger presents force outputs and parameter deltas. Mobile layouts collapse the ledger below the viewport rather than centering everything into cards.

### Signature Elements
1. A thin copper airflow trace motif that appears as a subtle rule, chart baseline, or active-state marker.
2. Technical labels with uppercase microtype, units, and small instrument-style readouts.
3. A circular run badge showing the current simulation state: READY, RUNNING, or REVIEW.

### Interaction Philosophy
Interactions should feel like operating an instrument. Sliders expose live numeric values, changes are explicit, and simulation actions use language such as “Run baseline” and “Compare case” rather than vague calls to action. Every unavailable feature explains what data or solver capability is needed.

### Animation
Use restrained motion: airflow traces drift slowly across the viewport, the run badge rotates only while a case is calculating, and result values count up once after completion. UI transitions use short ease-out movement under 250ms. Respect reduced-motion preferences by replacing animated airflow with static vector bands.

### Typography System
Display: Space Grotesk, 600–700, for the product name and major readouts. Body: IBM Plex Sans, 400–600, for controls and explanatory text. Mono: IBM Plex Mono, 400–500, for units, solver state, and parameter values. Use sentence case for headings and uppercase only for labels and status chips.

### Brand Essence
Bicycle Aero Lab is a measured 3D wind-tunnel workspace for cyclists, designers, and curious engineers who want to understand how a bicycle and rider move through air. Personality: exacting, curious, grounded.

### Brand Voice
Headlines are direct and observational. CTAs describe the experiment, not the software. Microcopy explains uncertainty without sounding apologetic.

Example lines:
- “See what the air is doing.”
- “Run the baseline before changing the shape.”

### Wordmark & Logo
The mark is a three-line copper airflow glyph wrapping around a small dark circular test object. It should work without text, with the three lines suggesting streamlines and the circle suggesting the rider/bicycle test body.

### Signature Brand Color
Pressure Copper: #C96B3B. Use it sparingly for active simulation, drag highlights, and the current parameter cursor.

## Product scope for this first interface
The first screen is an interactive scientific prototype dashboard, not a finished CFD solver. It should clearly show a simplified 3D bicycle-and-rider viewport, baseline controls for speed and wind angle, a live status panel, and measured-versus-estimated result labels. Solver integration remains a later implementation layer.

## Style Decisions
- Prefer warm instrument surfaces and dark ink over generic blue dashboards.
- Keep the 3D viewport visually dominant and the control rail compact.
- Make physical units and data provenance visible beside every important result.
- Use copper as a signal, not as a broad decorative fill.
- Panel language: every major surface should resemble a calibrated instrument face, using ledger dividers, measurement ticks, baseline rules, and mono readouts rather than generic rounded SaaS cards.
- Brand lockup: the copper three-line airflow glyph must appear at a confident identity scale in the experiment rail and should visibly relate to active copper trace elements elsewhere in the interface.
- Observation bay imagery: the viewport should always include at least one wind-tunnel reference cue—axes, contour bands, calibration markers, or sensor-like annotations—so the scene reads as a measured experiment, not a generic 3D preview.
