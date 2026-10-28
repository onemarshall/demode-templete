/**
 * Visual Contract — deep evaluation copy, version 1.
 *
 * GENERATED FROM the canonical pair specifications:
 *   docs/methodology/specs/pair-*.md
 *   (DeMode repository: 03-Products/standalone/visual-contract)
 *
 * Do not hand-edit the strings in this file. The pair specs are the source of
 * truth; regenerate instead. A change here is a content-version change and must
 * bump VISUAL_CONTRACT_CONTENT_VERSION so stored contract versions keep
 * pointing at the copy they were rendered with.
 *
 * Naming: the framework axis is Spacious/Dense. The client-facing word is
 * `Full`, applied at extraction time.
 */

import type { EvaluationCopy } from '../types.js';

export const VISUAL_CONTRACT_CONTENT_VERSION = 1;

export const EVALUATION_COPY_V1 = {
	warm_cool: {
		warm: {
			word: "Warm",
			coreMeaning: "Warm means the work should feel human, welcoming, and personally close rather than formal, clinical, or distant.",
			evaluationQuestion: "Does this feel like someone is being welcomed in, or held at a distance?",
			meeting: [
				"This feels warm - I can feel the human element in it.",
				"This feels welcoming rather than clinical.",
				"The work feels human without losing credibility.",
				"This feels like it is inviting people in rather than holding them at a distance."
			],
			notEnough: [
				"This feels too distant for what we committed to.",
				"I want this to feel more human and less institutional.",
				"The work feels too procedural and emotionally removed right now.",
				"I don't yet feel the welcome or reassurance we said we wanted."
			],
			tooFar: [
				"This has become warmer than we need - it's starting to lose authority.",
				"I still want it to feel human, but not so soft that it loses authority.",
				"This is moving into overly familiar territory for our audience."
			],
			unsure: [
				"I committed to warm, but I'm not yet sure whether this lands as human and welcoming. Can you show me which choices are creating that feeling?",
				"Help me understand how this is meant to feel more relational and reassuring rather than distant."
			]
		},
		cool: {
			word: "Cool",
			coreMeaning: "Cool means the work should feel formal, measured, precise, and less personally close rather than friendly, intimate, or emotionally immediate.",
			evaluationQuestion: "Does this feel formal and composed, or has it become too friendly and personally close?",
			meeting: [
				"This feels cool in the right way - composed, refined, and confident.",
				"The restraint is working. It feels clear rather than cold.",
				"This feels disciplined, refined, and intentional.",
				"I can feel the composure in the work without it feeling shut off."
			],
			notEnough: [
				"This feels too familiar for what we committed to.",
				"I want this to feel more composed and less familiar.",
				"This is becoming too friendly and personally close for the direction we chose.",
				"I want more restraint and composure in how the brand is presented."
			],
			tooFar: [
				"This is becoming too cold and detached for our audience.",
				"I still want precision, but I don't want people to feel shut out.",
				"It feels composed, but it may now be lacking enough life or humanity."
			],
			unsure: [
				"I committed to cool, but I want help seeing whether this is landing as composed and refined rather than simply distant.",
				"Can you walk me through which choices are creating the sense of restraint and composure here?"
			]
		}
	},
	spacious_full: {
		spacious: {
			word: "Spacious",
			coreMeaning: "Spacious means the work should feel open, breathable, unforced, and deliberately uncongested rather than compressed, crowded, or visually overpacked.",
			evaluationQuestion: "Does this give the eye and mind enough room, or does it begin to feel compressed?",
			meeting: [
				"This feels spacious in the right way - open, calm, and easy to take in.",
				"I can feel the breathing room in the design.",
				"This gives the content space without feeling empty.",
				"The work feels clear because it is not trying to force everything at once."
			],
			notEnough: [
				"This feels too compressed for what we committed to.",
				"I want more breathing room around the important parts.",
				"Too many things are asking for attention at the same time.",
				"I don't yet feel the openness we said we wanted."
			],
			tooFar: [
				"This has become more spacious than we need - it is starting to feel too empty.",
				"I still want room, but not so much that the work loses energy or substance.",
				"This may now be too reduced for the amount of information we need to carry."
			],
			unsure: [
				"I committed to spacious, but I'm not yet sure whether this lands as open and breathable. Can you show me which choices are creating that sense of room?",
				"Help me understand how this is meant to feel more spacious rather than simply minimal."
			]
		},
		full: {
			word: "Full",
			coreMeaning: "Full means the work should feel substantial, rich, concentrated, and packed with meaningful content rather than open, airy, or widely spaced.",
			evaluationQuestion: "Does this feel usefully full and concentrated, or has it become crowded and hard to take in?",
			meeting: [
				"This feels full in the right way - rich, substantial, and intentional.",
				"There is a lot here, but it still feels controlled.",
				"The density is working. It gives the design substance.",
				"This feels substantial and information-rich without losing coherence."
			],
			notEnough: [
				"This feels too empty for what we committed to.",
				"I want this to feel fuller and more concentrated.",
				"The work feels a bit too reduced for the richness we want.",
				"I want more sense of substance in the presentation."
			],
			tooFar: [
				"This is becoming too crowded for our audience.",
				"I still want richness, but I don't want the eye to feel overwhelmed.",
				"It feels full, but it may now be too compressed to read clearly."
			],
			unsure: [
				"I committed to full, but I want help seeing whether this is landing as rich and substantial rather than crowded.",
				"Can you walk me through which choices are creating the sense of density here?"
			]
		}
	},
	calm_energetic: {
		calm: {
			word: "Calm",
			coreMeaning: "Calm means the work should feel steady, settled, and unhurried rather than busy, urgent, or restless.",
			evaluationQuestion: "Does this feel steady and reassuring, or busy and restless?",
			meeting: [
				"This feels calm in the right way - steady, clear, and grounded.",
				"The work feels settled rather than overstimulating.",
				"I can feel the restraint in the pacing.",
				"This creates confidence without needing to push for attention."
			],
			notEnough: [
				"This feels too busy and restless for what we committed to.",
				"I want this to feel more settled and less restless.",
				"Too many things are competing for attention at once.",
				"I don't yet feel the sense of steadiness we said we wanted."
			],
			tooFar: [
				"This has become calmer than we need - it is starting to lose energy.",
				"I still want steadiness, but not to the point of flatness.",
				"This may now be too subdued for the response we want from the audience."
			],
			unsure: [
				"I committed to calm, but I'm not yet sure whether this lands as steady and settled. Can you show me which choices are creating that feeling?",
				"Help me understand which choices are meant to make this feel grounded rather than busy."
			]
		},
		energetic: {
			word: "Energetic",
			coreMeaning: "Energetic means the work should feel active, vivid, dynamic, and charged rather than still, subdued, or highly restrained.",
			evaluationQuestion: "Does this feel vivid and alive, or has it become restless and tiring?",
			meeting: [
				"This feels energetic in the right way - vivid, active, and alive.",
				"The momentum is working. It feels engaging without becoming chaotic.",
				"This has the level of movement and pulse we were aiming for.",
				"The work feels lively without losing control."
			],
			notEnough: [
				"This feels too subdued for what we committed to.",
				"I want this to feel more alive and less held back.",
				"The work is too quiet for the level of activation we want.",
				"I want more momentum in how the brand is presented."
			],
			tooFar: [
				"This is becoming too restless for our audience.",
				"I still want energy, but I don't want it to feel noisy or overwhelming.",
				"It feels alive, but it may now be competing too hard for attention."
			],
			unsure: [
				"I committed to energetic, but I want help seeing whether this feels lively rather than noisy.",
				"Can you walk me through which choices are creating the sense of movement and momentum here?"
			]
		}
	},
	restrained_expressive: {
		restrained: {
			word: "Restrained",
			coreMeaning: "Restrained means the work should feel quietly confident, selective, and controlled rather than loud, showy, or eager to announce itself.",
			evaluationQuestion: "Does this feel quietly confident, or is it becoming too loud and showy?",
			meeting: [
				"This feels restrained in the right way - controlled, intentional, and confident.",
				"The work feels edited rather than overdone.",
				"It is making its point without over-announcing itself.",
				"I can feel the discipline in the way the brand is presenting itself."
			],
			notEnough: [
				"This feels more overstated than we committed to.",
				"This feels too showy for the quiet confidence we agreed.",
				"The work is pushing too hard for attention right now.",
				"I don't yet feel the discipline we said we wanted."
			],
			tooFar: [
				"This has become more restrained than we need - it is starting to lose presence.",
				"I still want control, but not to the point where the work feels muted.",
				"This may now be so held back that it is losing some necessary character."
			],
			unsure: [
				"I committed to restrained, but I'm not yet sure whether this lands as controlled and intentional. Can you show me which choices are creating that sense of discipline?",
				"Help me understand how this is meant to feel more held back rather than more muted."
			]
		},
		expressive: {
			word: "Expressive",
			coreMeaning: "Expressive means the work should show a noticeable personality and be willing to make a statement rather than staying neutral, quiet, or tightly controlled.",
			evaluationQuestion: "Does this show a strong personality, or has it become loud and showy?",
			meeting: [
				"This feels expressive in the right way - voiced, confident, and distinctive.",
				"The character is coming through without becoming chaotic.",
				"This feels willing to say something, not just sit there neutrally.",
				"I can feel the brand's point of view in the work."
			],
			notEnough: [
				"This feels too neutral for what we committed to.",
				"The personality is getting lost. I want the work to make a clearer statement.",
				"The work is still too contained for the amount of character we want.",
				"I want more visible personality in how the brand is presented."
			],
			tooFar: [
				"This is becoming too showy for our audience.",
				"I still want expression, but I don't want it to feel loud for its own sake.",
				"It feels distinctive, but it may now be trying too hard to be noticed."
			],
			unsure: [
				"I committed to expressive, but I want help seeing whether this is landing as voiced and distinctive rather than overdone.",
				"Can you walk me through which choices are creating the sense of character and outward expression here?"
			]
		}
	},
	clean_raw: {
		clean: {
			word: "Clean",
			coreMeaning: "Clean means the work should feel polished, resolved, refined, and well-composed rather than textured, exposed, immediate, or visibly unprocessed.",
			evaluationQuestion: "Does this feel carefully finished, or do some details still feel rough or inconsistent?",
			meeting: [
				"This feels clean in the right way - polished, resolved, and intentional.",
				"The work feels refined without becoming sterile.",
				"I can feel the finish and control in the details.",
				"This looks composed and properly brought together."
			],
			notEnough: [
				"This still feels more exposed than we committed to.",
				"I want this to feel more resolved and less exposed.",
				"The work is carrying too much visual difficulty right now.",
				"I don't yet feel the level of finish we said we wanted."
			],
			tooFar: [
				"This has become cleaner than we need - it is starting to lose texture or life.",
				"I still want polish, but not to the point where it feels over-sanitized.",
				"This may now be so resolved that it is losing some of its character."
			],
			unsure: [
				"I committed to clean, but I'm not yet sure whether this lands as polished and resolved. Can you show me which choices are creating that sense of finish?",
				"Help me understand how this is meant to feel more refined rather than merely more controlled."
			]
		},
		raw: {
			word: "Raw",
			coreMeaning: "Raw means the work should feel immediate, exposed, hand-resolved, and less processed rather than highly polished, refined, or machine-perfect.",
			evaluationQuestion: "Do the visible texture and signs of making feel intentional, or do parts simply feel unfinished?",
			meeting: [
				"This feels raw in the right way - direct, textured, and alive.",
				"The edge in the work is helping it feel more immediate.",
				"This keeps enough texture to feel present rather than overprocessed.",
				"I can feel the directness without it becoming careless."
			],
			notEnough: [
				"This feels too polished for what we committed to.",
				"I want this to feel less processed and more immediate.",
				"The work is too smoothed out for the amount of edge we want.",
				"I want more texture and directness in how the brand is presented."
			],
			tooFar: [
				"This is becoming too careless for our audience.",
				"I still want rawness, but I don't want it to feel careless or underdone.",
				"It feels immediate, but it may now be losing too much finish and control."
			],
			unsure: [
				"I committed to raw, but I want help seeing whether the texture feels intentional rather than unfinished.",
				"Can you walk me through which choices are creating the sense of directness and reduced polish here?"
			]
		}
	},
	focused_layered: {
		focused: {
			word: "Focused",
			coreMeaning: "Focused means one priority should clearly lead rather than several messages, elements, or ideas competing at once.",
			evaluationQuestion: "Is it clear what should lead, or are several things asking for attention at once?",
			meeting: [
				"This feels focused in the right way - clear, directed, and intentional.",
				"I can tell what matters without having to work for it.",
				"The work is concentrating attention where it needs to.",
				"This feels edited around a clear point rather than trying to do everything at once."
			],
			notEnough: [
				"This feels too diffuse for what we committed to.",
				"I want this to feel more directed and less split across multiple priorities.",
				"Too many things are asking to be the main thing at once.",
				"I don't yet feel the clarity of emphasis we said we wanted."
			],
			tooFar: [
				"This has become more focused than we need - it is starting to lose richness or context.",
				"I still want clarity, but not to the point where the work feels overly reduced.",
				"This may now be so singular that it is leaving out useful depth."
			],
			unsure: [
				"I committed to focused, but I'm not yet sure whether this lands as singular and directed. Can you show me which choices are creating that clarity of emphasis?",
				"Help me understand how this is meant to feel more concentrated around one clear point rather than spread across several."
			]
		},
		layered: {
			word: "Layered",
			coreMeaning: "Layered means several ideas, details, or levels should work together and reward further attention rather than one thing carrying the whole experience.",
			evaluationQuestion: "Does this feel richly built up, or has it become too busy and hard to hold together?",
			meeting: [
				"This feels layered in the right way - rich, built up, and coherent.",
				"There is a lot happening here, but it still feels intentional.",
				"The multiple elements are adding depth rather than distraction.",
				"This feels more dimensional and more rewarding to stay with."
			],
			notEnough: [
				"This feels too singular for what we committed to.",
				"I want this to feel more built up and less reduced.",
				"The work is still a bit too one-track for the richness we want.",
				"I want more sense of depth and multiple active parts in the presentation."
			],
			tooFar: [
				"This is becoming too busy for our audience.",
				"I still want richness, but I don't want it to feel overloaded.",
				"It feels layered, but it may now be harder to hold together clearly."
			],
			unsure: [
				"I committed to layered, but I want help seeing whether this is landing as rich and built up rather than busy.",
				"Can you walk me through which choices are creating the sense of depth and multiple active parts here?"
			]
		}
	}
} as const satisfies Record<string, Record<string, EvaluationCopy>>;
