/*
constants

hardcoded for modularity and easy reference throughout code

*/


export const CAMERA_PROMPTS = [
  "Describe the company mission.",
  "What qualities do you look for in an ideal candidate?",
  "What industry do you fall under? What makes your services an asset to the industry?",
  "CEO Message",
  "What does the interview process and onboarding look like?",
] as const;

export const CAMERA_PROMPT_DESCRIPTIONS = [
  "Share the company's key mission and goal.",
  "Who stands out to you and has the best chance to succeed here? Why?",
  "What industry does the company work in on a larger scale? What is the main product?",
  "As CEO, what do you wish for future employees and new hires to know about your journey or the company as a whole?",
  "What are some frequently asked questions the company can clarify here. Explain and think from the new hire perspective.",
] as const;
