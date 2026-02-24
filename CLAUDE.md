CarFinder – Engineering, State & Design Guardrails

This document defines how Claude must behave when modifying this codebase.

CarFinder is not a prototype.
It is being built as a long-term, stable product.

Claude must behave like a senior engineer maintaining a blue-chip platform.

⸻

Application Structure

The app consists of exactly four primary pages:
	1.	Home (Discovery)
	2.	Profile (VehicleDetailPage)
	3.	Comparison (ComparisonPage)
	4.	Garage (GaragePage)

No architectural changes unless explicitly requested.

No new routing systems.
No framework pivots.
No speculative overbuilding.

⸻

Page Responsibilities

1. Home (Discovery)

Purpose:
Discovery-first browsing and filtering.

Owns:
	•	Filters
	•	Search
	•	AI positioning summaries
	•	Add to Garage
	•	Navigate to Profile
	•	Navigate to Compare

Must NOT:
	•	Contain full spec tables
	•	Contain trim configuration logic
	•	Duplicate Profile layout
	•	Contain comparison UI

Discovery is a funnel, not a spec sheet.

⸻

2. Profile (VehicleDetailPage)

Purpose:
Deep dive into a single vehicle.

Owns:
	•	Hero imagery
	•	Future photo reel (exterior + interior)
	•	AI summary
	•	Best for
	•	Trade-offs
	•	Trim selection
	•	Pack configuration
	•	Full structured spec breakdown

Must NOT:
	•	Contain side-by-side comparison
	•	Duplicate comparison tables

Profile is immersive and persuasive, but still intelligent and structured.

⸻

3. Comparison (ComparisonPage)

Purpose:
Structured, rational evaluation.

Owns:
	•	Two-column desktop layout
	•	Compact sticky banner
	•	Trim & option pack toggling
	•	Vertical structured comparison table
	•	Highlighted differences
	•	Immediate price delta updates

Must NOT:
	•	Introduce large hero cards
	•	Duplicate Profile layout
	•	Collapse to one column on desktop
	•	Add unrelated discovery UI

Compare is analytical, not emotional.

⸻

4. Garage (GaragePage)

Purpose:
Saved shortlist.

Owns:
	•	List of saved vehicles
	•	Remove from Garage
	•	Navigate to Profile
	•	Navigate to Compare

Must NOT:
	•	Become a discovery page
	•	Contain deep spec configuration
	•	Contain comparison tables

Garage is quiet and functional.

⸻

Comparison Page State Contract

Comparison has exactly three states:

State A – No Car A
	•	Left: Car A selector enabled
	•	Right: Car B disabled

State B – Car A Selected
	•	Left: Compact locked panel
	•	Right: Car B selector enabled

State C – Car A + Car B
	•	Selectors hidden
	•	Sticky banner visible
	•	Trim & Options visible
	•	Comparison sections visible

UI state must be derived from:
	•	v1
	•	v2

Avoid parallel selector state machines unless absolutely necessary.

Always maintain two columns on desktop.

Never dynamically remove the second column container.

⸻

Single Source of Truth

Vehicle data must derive from:
	•	StructuredVehicle
	•	resolveSpecs
	•	selectedTrims
	•	selectedPackIds

Do not duplicate spec logic.

Do not create redundant derived state that can be computed.

Derived state > stored state.

⸻

Image Philosophy

Home:
	•	Small thumbnail only

Profile:
	•	Large hero
	•	Future photo reel

Compare:
	•	Compact thumbnail only
	•	No large hero cards
	•	No layout shift
	•	Always include onError fallback

Garage:
	•	Small thumbnail only

⸻

Editing Discipline

When modifying code, Claude must:
	1.	Briefly explain planned change.
	2.	Modify only the requested file.
	3.	Preserve working layout.
	4.	Avoid structural refactors.
	5.	Avoid deleting major UI blocks unless explicitly instructed.

Claude must NOT:
	•	Rename core files.
	•	Introduce routing libraries.
	•	Replace state management patterns.
	•	Add new global contexts.
	•	Perform architectural rewrites.
	•	Touch unrelated components.

Stability > cleverness.

⸻

Design Philosophy

CarFinder is a blue-chip product.

It must feel:
	•	Intelligent
	•	Structured
	•	Calm
	•	Deliberate
	•	Premium without flash
	•	Analytical, not emotional

Think:

Institutional capital meets automotive enthusiasm.

Not startup hype.
Not dealership advertising.
Not influencer automotive content.

⸻

Visual Identity Rules

Tone:
	•	Neutral
	•	Measured
	•	Precise
	•	No marketing fluff
	•	No emojis in UI
	•	No loud accent colours

Colour System:
	•	Slate / neutral base
	•	High contrast typography
	•	Subtle hover states
	•	Minimal brand colour usage
	•	No heavy gradients
	•	No flashy animations

Layout:
	•	Grid-aligned
	•	Balanced
	•	Symmetrical
	•	Controlled whitespace

Avoid:
	•	Card overload
	•	Shadow stacking
	•	Decorative UI
	•	Visual noise

Typography:
	•	Clear hierarchy
	•	Strong section headers
	•	Compact data presentation
	•	Numbers must feel deliberate and easy to compare

⸻

Page-Level Design Standards

Discovery:
Focused. Clean. Efficient.

Profile:
Aspirational but structured.

Comparison:
Feels like an investment committee memo.
Like a Bloomberg terminal for cars.
Structured, rational, decisive.

Garage:
Quiet. Efficient. Like a shortlist inside a private banking portal.

⸻

Forbidden Design Patterns
	•	Bright primary colour explosions
	•	Heavy gradients
	•	Large hero banners inside Compare
	•	Animated carousels on Compare
	•	Overly rounded UI
	•	Gamified UI
	•	Emoji iconography
	•	Hype-driven copy

⸻

Long-Term Direction (Do Not Implement Without Instruction)

Future evolution includes:
	•	AI decision scoring
	•	Dealer routing logic
	•	Personalised buyer profiling
	•	Visual comparison intelligence
	•	Advanced lead capture
	•	Photo-based differentiation

Do not implement future features unless explicitly requested.

⸻

When Unsure

Claude should:
	•	Ask for clarification.
	•	Avoid structural rewrites.
	•	Avoid large layout changes.
	•	Avoid speculative improvements.
	•	Default to minimal, stable edits.

If a change risks breaking:
	•	Two-column comparison layout
	•	Sticky banner behaviour
	•	Trim & pack resolution
	•	Selector flow

Stop and reassess.

⸻

CarFinder should feel like:

Goldman Sachs built a car intelligence platform.

Not like a startup built a car blog.
