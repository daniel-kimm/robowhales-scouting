// Game manual sections
const gameManual = {
  overview: `
    REEFSCAPE is played by two alliances of three teams each. The objective is to score more points than the opposing alliance by collecting and scoring CORAL pieces, processing ALGAE, and CLIMBING at the end of the match.
  `,
  
  scoring: `
    Points are awarded as follows:
    - CORAL Level 1: 3 points in auto, 2 points in teleop
    - CORAL Level 2: 4 points in auto, 3 points in teleop
    - CORAL Level 3: 6 points in auto, 4 points in teleop
    - CORAL Level 4: 7 points in auto, 5 points in teleop
    - ALGAE in processor: 6 points
    - ALGAE in net: 4 points
    - ROBOT parked: 2 points
    - ROBOT in shallow cage: 6 points
    - ROBOT in deep cage: 12 points
  `,
  
  matchPlay: `
    Matches consist of:
    - 15-second autonomous period
    - 2-minute and 15-second teleop period
  `,
  
  fieldElements: `
    The field contains:
    - CORAL REEF: Four levels where CORAL pieces can be scored
    - ALGAE PROCESSORS: Stations where ALGAE can be processed for 6 points
    - ALGAE NETS: Areas where ALGAE can be deposited for 4 points
    - CLIMBING ZONES: Areas where robots can climb at the end of the match
  `,
  
  robotRequirements: `
    Robot specifications:
    - Maximum size: 120" perimeter, 45" height
    - Maximum weight: 125 lbs (excluding bumpers and battery)
    - Must have bumpers that follow FRC bumper rules
  `
};

// Function to get relevant manual sections based on query
function getRelevantManualSections(query) {
  const relevantSections = [];
  
  // Always include overview
  relevantSections.push(gameManual.overview);
  
  // Check for scoring-related queries
  if (/\b(?:scor(?:e|ing)|points|coral|algae|climb(?:ing)?)\b/i.test(query)) {
    relevantSections.push(gameManual.scoring);
  }
  
  // Check for match-related queries
  if (/\b(?:match|auto(?:nomous)?|teleop|time)\b/i.test(query)) {
    relevantSections.push(gameManual.matchPlay);
  }
  
  // Check for field-related queries
  if (/\b(?:field|reef|processor|net|zone|climb(?:ing)?)\b/i.test(query)) {
    relevantSections.push(gameManual.fieldElements);
  }
  
  // Check for robot-related queries
  if (/\b(?:robot|spec(?:ification)?s|size|weight|bumper)\b/i.test(query)) {
    relevantSections.push(gameManual.robotRequirements);
  }
  
  return relevantSections.join("\n\n");
}

module.exports = { getRelevantManualSections }; 