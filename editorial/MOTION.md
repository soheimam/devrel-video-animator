# Motion principles for overlays

The twelve principles of animation, translated for motion graphics on a screen recording. Our subjects are cards, pills, arrows and text, not characters, so some principles apply directly, some become taste, and three don't apply. Where a principle is already built into `templates/motion.js`, the template does it; the author's job is to not fight it.

## Apply directly

**Ease in, ease out.** Nothing moves at constant speed. Entrances start fast and settle long (`outQuint`); arrows draw with `inOutQuart`; exits ease in. Linear motion reads as mechanical. *Built in: `EASE`, `EASE_DRAW`.*

**Follow through.** Things that arrive carry a little momentum past their resting point and settle back. Cards and nodes overshoot by a hair (`outBack(1.2)`), pills more (`outBack(1.5)`). Never so much that it bounces; one settle, not a wobble. *Built in: `EASE_SETTLE`, `pop()`.*

**Timing.** Duration is weight. A card is heavier than a pill, so it takes longer to land (550 ms vs 500 ms with a smaller mass to move). A hairline leader draws in 380 ms; a full slide header in 650 ms. If something feels slapped on, it's usually too fast. If it feels sleepy, the gaps between elements are too long, not the elements themselves. *Built in: `ENTER`, `EXIT`, `STEP`.*

**Staging.** One thing asks for attention at a time. Put the element next to what it explains, keep it off the webcam and out of the caption band, and clear the rest: a `code-focus` dim or a full-frame `slide` is staging by subtraction. Never two overlays at once; the validator enforces it.

**Anticipation.** A small cue before the main move prepares the eye. The callout's dot pulses once before the leader draws; a step-list's number lands before its text; the slide's field fades up before the header drops. Keep anticipation under 150 ms; it's a breath, not a wind-up.

**Overlapping action.** Parts of one element don't all move at once. A term card: card first, pill 200 ms later, gloss 220 ms after that. A flow: arrow draws, head snaps on, node lands. Stagger children by 150–250 ms. If everything inside a card arrives in the same frame, it reads as a screenshot. *Built in: every template staggers.*

**Appeal.** The overlay should look like it belongs to Base and to this video: same white, same blue, same radius, same type, equal boxes, few words. Appeal here is restraint and consistency, not charm. Match `editorial/references/`.

## Apply with judgement

**Exaggeration.** Push timing and overshoot slightly past realistic so the motion registers at video scale and on a phone, then stop. A 2% scale-up on entrance is exaggeration; 10% is a cartoon. Never exaggerate size, colour or text.

**Squash and stretch.** Only for the smallest marks: the callout dot may squash as it lands, a chip may compress on pop. Never on text or boxes; distorted type looks broken, not alive.

**Arcs.** Elements rise straight in by default. A leader or connector can curve (the references use gentle curves between cards); motion along an arc is for connectors only.

**Secondary action.** One small supporting movement can accompany the main one: the previous step dimming as the next lands, a ring fading as the dot settles. Secondary never competes with primary; if you notice it, it's too much.

## Don't apply

**Straight-ahead vs pose-to-pose.** We work pose-to-pose by nature: every template is a timeline of keyframes seeked deterministically. Nothing to decide.

**Solid drawing.** No volume, no perspective, no 3D. Flat is the style.

## The short version

Decelerate everything. Let it settle, once. Stagger the parts. One thing at a time, next to what it explains, in the Base look. If in doubt, slower and smaller.
