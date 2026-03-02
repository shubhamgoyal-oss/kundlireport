// English template strings extracted from agent files (Phase 2)
// Keys follow the pattern: agent.section.subsection
// Placeholders use {variableName} syntax and are substituted by tmpl()

export const EN_TEMPLATES: Record<string, string> = {
  // ── Sade Sati: Phase labels ──────────────────────────────────────────────
  "sadeSati.phaseLabel.rising": "Rising Phase (Udaya Charan)",
  "sadeSati.phaseLabel.peak": "Peak Phase (Shikhar Charan)",
  "sadeSati.phaseLabel.setting": "Setting Phase (Ast Charan)",
  "sadeSati.phaseLabel.notActive": "Not Active",

  // ── Sade Sati: Phase descriptions ────────────────────────────────────────
  "sadeSati.phaseDesc.rising": "Saturn is in the sign before your Moon sign. Responsibilities increase and restructuring starts gradually.",
  "sadeSati.phaseDesc.peak": "Saturn is transiting your Moon sign. Emotional pressure is highest and discipline must become non-negotiable.",
  "sadeSati.phaseDesc.setting": "Saturn has moved to the sign after your Moon sign. Results mature, pending lessons close, and stability returns.",
  "sadeSati.phaseDesc.notActive": "Saturn is not currently transiting the 12th, 1st, or 2nd sign from your natal Moon.",

  // ── Sade Sati: Phase window – Rising ─────────────────────────────────────
  "sadeSati.window.rising.name": "Rising Phase (12th from Moon)",
  "sadeSati.window.rising.desc": "Pressure builds through expenses, relocations, and mindset restructuring. This phase asks for discipline before visible gains.",
  "sadeSati.window.rising.challenge0": "Rising expenses and responsibility load",
  "sadeSati.window.rising.challenge1": "Emotional restlessness and sleep disruption",
  "sadeSati.window.rising.challenge2": "Need to reduce avoidable commitments",
  "sadeSati.window.rising.blessing0": "Early correction of weak routines",
  "sadeSati.window.rising.blessing1": "Long-term financial discipline",
  "sadeSati.window.rising.blessing2": "Clearer boundary-setting in relationships",
  "sadeSati.window.rising.advice": "Cut non-essential obligations, protect daily rhythm, and build reserves.",

  // ── Sade Sati: Phase window – Peak ───────────────────────────────────────
  "sadeSati.window.peak.name": "Peak Phase (Over Moon)",
  "sadeSati.window.peak.desc": "This is the most psychologically intense phase. Saturn tests emotional maturity, accountability, and resilience.",
  "sadeSati.window.peak.challenge0": "Higher emotional pressure and self-doubt spikes",
  "sadeSati.window.peak.challenge1": "Delays in expected outcomes",
  "sadeSati.window.peak.challenge2": "Relationship strain if communication is reactive",
  "sadeSati.window.peak.blessing0": "Deep emotional maturity",
  "sadeSati.window.peak.blessing1": "Enduring career foundations",
  "sadeSati.window.peak.blessing2": "Stronger judgment under pressure",
  "sadeSati.window.peak.advice": "Prioritize consistency over speed, avoid impulsive decisions, and maintain sober expectations.",

  // ── Sade Sati: Phase window – Setting ────────────────────────────────────
  "sadeSati.window.setting.name": "Setting Phase (2nd from Moon)",
  "sadeSati.window.setting.desc": "Closure and consolidation phase. Earlier effort starts converting into durable results and karmic lessons settle.",
  "sadeSati.window.setting.challenge0": "Family/finance restructuring decisions",
  "sadeSati.window.setting.challenge1": "Fatigue from prolonged pressure cycle",
  "sadeSati.window.setting.challenge2": "Need to close unresolved obligations",
  "sadeSati.window.setting.blessing0": "Financial stabilization",
  "sadeSati.window.setting.blessing1": "Improved practical judgment",
  "sadeSati.window.setting.blessing2": "Release from unproductive patterns",
  "sadeSati.window.setting.advice": "Consolidate assets, complete pending commitments, and protect long-term harmony.",

  // ── Sade Sati: Normalization fallbacks ───────────────────────────────────
  "sadeSati.transitWindowFallback": "Transit window based on current Saturn cycle",
  "sadeSati.nextPeriodFallback": "To be determined by future Saturn transits",
  "sadeSati.overview": "Sade Sati is assessed by Saturn's transit relative to your natal Moon sign ({moonSign}). With current transit Saturn taken as {saturnSign}, your present status is {activeStatus}. This period is not a punishment cycle; it is a long-form karmic restructuring phase that rewards discipline, realism, and consistent execution. Outcomes during this cycle usually come through patience, simplified priorities, and sustained effort rather than sudden luck.",
  "sadeSati.importanceExplanation": "Sade Sati is important because it directly tests emotional stability (Moon) under Saturn's pressure. In practical terms, it can alter decision quality, risk tolerance, family dynamics, and financial behavior. The right approach is structured habits, fact-based planning, and emotional regulation. The stronger your discipline, the more constructive Saturn's results become.",
  "sadeSati.moonSaturnRelationship": "Your natal Moon is in {moonSign}{moonHouseClause}, while transit Saturn is considered in {saturnSign}. This Moon-Saturn relationship determines the phase intensity and the life domains where pressure is felt first. Emotionally, this combination demands maturity and pacing. Practically, the focus should be on consistent effort, realistic timelines, and low-reactivity decision making.",
  "sadeSati.overallGuidance": "Treat this cycle as a long-term discipline chapter: simplify commitments, preserve financial buffers, and execute priorities in sequence. Saturn rewards structure, integrity, and consistency.",
  "sadeSati.spiritualSignificance": "Spiritually, Sade Sati reduces ego-reactivity and strengthens inner steadiness. It rewards humility, service, disciplined habits, and truth-based living. The deeper gift is not comfort; it is character.",
  "sadeSati.famousPeople": "Many high achievers report that their major discipline, leadership, and legacy-building years happened during Saturn pressure cycles because long-term structure was forced into place.",

  // ── Sade Sati: Remedies (active) ─────────────────────────────────────────
  "sadeSati.remedy.active.0": "Maintain strict Saturday discipline: complete pending tasks and avoid avoidable conflicts.",
  "sadeSati.remedy.active.1": "Offer sesame oil deepam or Shani prayer on Saturdays with consistency.",
  "sadeSati.remedy.active.2": "Support service-oriented charity (especially for laborers/elderly) to balance Saturn karma.",

  // ── Sade Sati: Remedies (inactive) ───────────────────────────────────────
  "sadeSati.remedy.inactive.0": "Since Sade Sati is not active, intensive Shani remedies are not mandatory.",
  "sadeSati.remedy.inactive.1": "Maintain financial discipline and routine stability to stay prepared for future Saturn cycles.",
  "sadeSati.remedy.inactive.2": "Keep weekly grounding practices (prayer/meditation/service) for long-term resilience.",

  // ── Sade Sati: Effects fallback ──────────────────────────────────────────
  "sadeSati.effect.0": "This period emphasizes responsibility, pacing, and emotional maturity.",
  "sadeSati.effect.1": "Progress requires consistency and structured planning.",
  "sadeSati.effect.2": "Long-term stability improves when impulsive decisions are avoided.",

  // ── Sade Sati: Current – whatToExpect ────────────────────────────────────
  "sadeSati.current.whatToExpect.0": "Progress through disciplined, staged execution rather than sudden jumps.",
  "sadeSati.current.whatToExpect.1": "Higher accountability in family, career, and financial choices.",
  "sadeSati.current.whatToExpect.2": "Need for emotional regulation in sensitive conversations.",

  // ── Sade Sati: Current – opportunities ───────────────────────────────────
  "sadeSati.current.opportunities.0": "Build durable systems and repeatable routines.",
  "sadeSati.current.opportunities.1": "Improve long-term money discipline and risk filtering.",
  "sadeSati.current.opportunities.2": "Mature leadership through patience and consistency.",

  // ── Sade Sati: Current – whatNotToDo ─────────────────────────────────────
  "sadeSati.current.whatNotToDo.0": "Do not force outcomes through impulsive decisions.",
  "sadeSati.current.whatNotToDo.1": "Avoid over-commitment without execution bandwidth.",
  "sadeSati.current.whatNotToDo.2": "Do not ignore sleep, recovery, and mental steadiness.",

  // ── Sade Sati: Past cycle ────────────────────────────────────────────────
  "sadeSati.past.keyLessons": "Previous Saturn cycles usually teach patience, accountability, and realistic planning. Repeating patterns from that period are often the key preparation for your next cycle.",
  "sadeSati.past.lifeEvents": "Revisit the years of your previous cycle to identify themes in responsibility, finances, family duties, and emotional resilience; those patterns are your practical Saturn handbook.",

  // ── Sade Sati: Next cycle ────────────────────────────────────────────────
  "sadeSati.next.approximateStartFallback": "To be determined",
  "sadeSati.next.preparationAdvice": "Prepare 1-2 years before the next cycle: tighten finances, reduce avoidable liabilities, and build a stable routine so Saturn pressure converts into measurable progress.",

  // ── Sade Sati: Mantras ───────────────────────────────────────────────────
  "sadeSati.mantra.shani.purpose": "Stabilize Saturn-related pressure and improve disciplined focus.",
  "sadeSati.mantra.shani.timing": "Saturdays, preferably during sunrise or sunset with steady repetition.",
  "sadeSati.mantra.neelanjana.purpose": "Traditional Shani stotra for patience, endurance, and karmic balance.",
  "sadeSati.mantra.neelanjana.timing": "Saturdays after bath, 11/21 repetitions with calm breath.",

  // ── Dasha: Antardasha templates ──────────────────────────────────────────
  "dasha.antardasha.interpretation": "{mdName}/{adName} combines {mdThemes} with {adThemes}. In this chart, {mdCtx} works in tandem with {adCtx}, so results come through intentional sequencing rather than sudden luck. This window is strongest for actions that align responsibility with timing: commit to high-value priorities, formalize key decisions, and keep execution measurable. If unmanaged, {mdCaution} can amplify {adCaution}, so avoid reactive decisions and keep your strategy grounded in facts.",
  "dasha.antardasha.focusAreas.0": "Primary theme integration: {mdThemes} with {adThemes}.",
  "dasha.antardasha.focusAreas.1": "Opportunity focus: {mdOpportunity}; supported by {adOpportunity}.",
  "dasha.antardasha.focusAreas.2": "Risk management: control {mdCaution} and {adCaution}.",
  "dasha.antardasha.advice": "Use this sub-period to pursue {mdOpportunity} while consciously channeling {adOpportunity}. Keep decisions paced, documented, and review-based so {mdCaution} and {adCaution} do not derail progress.",
  "dasha.planetContext": "{planet} in {sign} (House {house}){retro}",
  "dasha.planetContextRetro": ", retrograde",
  "dasha.planetContextUnavailable": "{pName} (placement unavailable)",

  // ── Glossary: System prompts ─────────────────────────────────────────────
  "glossary.systemPrompt": "You are an expert Vedic astrology educator creating a comprehensive glossary for a Kundli report.\n\nCreate clear, accessible definitions that help readers understand:\n1. Basic concepts (planets, signs, houses)\n2. Technical terms (aspects, dignities, yogas)\n3. Predictive terminology (dashas, transits)\n4. Jaimini concepts (karakas, argalas)\n5. Remedial terms (upayas, mantras, yantras)\n\nFor each term, provide:\n- The Sanskrit/Hindi name with transliteration\n- Pronunciation guide\n- Clear definition for beginners\n- Detailed explanation for deeper understanding\n- Practical example from astrology\n- Related terms for cross-reference\n\nOrganize terms by category for easy navigation.\nUse simple language while maintaining accuracy.\nInclude both Parashari and Jaimini terminology.",
  "glossary.langInstruction": "",
};
